import { DELTA, DIRS, type FlyDir, type FlyLevel, type FlyPart, type FlyPartType } from './types'

/** 推力上限，和 MC 一样是 12 个方块 */
export const PUSH_LIMIT = 12

const CODES: Record<FlyPartType, number> = {
  block: 1,
  slime: 2,
  piston: 3,
  stickyPiston: 4,
  redstone: 5,
  observer: 6,
  clock: 7,
}

/** 脉冲器节奏：开 CLOCK_HOLD 拍、关 CLOCK_HOLD 拍 */
export const CLOCK_HOLD = 2

/** 签名里的头标记 */
const HEAD_BIT = 128

interface Plan {
  piston: number
  /** 要挪的源格 */
  sources: number[]
  /** 与 sources 一一对应的目标格 */
  dests: number[]
  /** 伸出时头占的格子 */
  claimHead: number
  /** 缩回：粘性活塞要拉回前面那一格 */
  pull: boolean
}

/**
 * 飞行器仿真。规则见 docs/fly-design.md：
 * 活塞推一条线上的粘液连通组，粘性活塞缩回时拉回粘液组；
 * 电源（红石块 / 观察者脉冲）通过相邻的实体方块传导到活塞；
 * 推力组里含自己、含伸出的活塞、超过 12 格、目标被占，这一推就无效。
 */
export class FlySim {
  readonly level: FlyLevel
  cells: (FlyPart | null)[]
  /** 已伸出的活塞机身下标 */
  extended: Set<number>
  tick: number
  /** 上一 tick 开始时的格子签名，给观察者用 */
  private prevSig: Int32Array

  constructor(level: FlyLevel, cells?: (FlyPart | null)[]) {
    this.level = level
    this.cells = (cells ?? level.cells).map((c) => (c ? { ...c } : null))
    this.extended = new Set()
    this.tick = 0
    this.prevSig = this.bootSignature()
  }

  get size() {
    return this.level.cols * this.level.rows
  }

  /** 开局给观察者的"上一拍"：前面本来就有方块的先出一次脉冲，相当于点火 */
  private bootSignature(): Int32Array {
    const sig = new Int32Array(this.size)
    for (let i = 0; i < this.size; i++) if (this.cells[i]) sig[i] = -1
    return sig
  }

  private idx(i: number, d: FlyDir, steps = 1): number {
    const { cols, rows } = this.level
    const x = (i % cols) + DELTA[d][0] * steps
    const y = Math.floor(i / cols) + DELTA[d][1] * steps
    if (x < 0 || y < 0 || x >= cols || y >= rows) return -1
    return y * cols + x
  }

  private isWall(i: number) {
    return i < 0 || this.level.walls[i] === true
  }

  /** 每个格子的内容签名，头也算进去 */
  signature(): Int32Array {
    const sig = new Int32Array(this.size)
    for (let i = 0; i < this.size; i++) {
      const p = this.cells[i]
      if (p) sig[i] = CODES[p.type] + (p.dir ?? 0) * 16
    }
    for (const body of this.extended) {
      const d = this.cells[body]?.dir
      if (d === undefined) continue
      const head = this.idx(body, d)
      if (head >= 0) sig[head] |= HEAD_BIT
    }
    return sig
  }

  /** 现在这些格子被伸出的活塞头占着 */
  headCells(): Set<number> {
    const heads = new Set<number>()
    for (const body of this.extended) {
      const d = this.cells[body]?.dir
      if (d === undefined) continue
      const head = this.idx(body, d)
      if (head >= 0) heads.add(head)
    }
    return heads
  }

  /** 脉冲器这一拍是不是开着。各格相位错开，免得一整排同时开 */
  private clockOn(i: number): boolean {
    return Math.floor((this.tick + i) / CLOCK_HOLD) % 2 === 0
  }

  /** 给界面用的活塞头信息：格子下标 -> 朝向和是不是粘性 */
  headInfo(): Map<number, { dir: FlyDir; sticky: boolean }> {
    const out = new Map<number, { dir: FlyDir; sticky: boolean }>()
    for (const body of this.extended) {
      const part = this.cells[body]
      if (!part || part.dir === undefined) continue
      const head = this.idx(body, part.dir)
      if (head < 0) continue
      out.set(head, { dir: part.dir, sticky: part.type === 'stickyPiston' })
    }
    return out
  }

  /** 通电的活塞：贴着电源，或者贴着被电源点亮、且导电的方块 */
  private powered(firing: Set<number>): Set<number> {
    const sources = new Set<number>(firing)
    for (let i = 0; i < this.size; i++) {
      const p = this.cells[i]
      if (p?.type === 'redstone') sources.add(i)
      else if (p?.type === 'clock' && this.clockOn(i)) sources.add(i)
    }
    const lit = new Set<number>()
    for (const s of sources) {
      for (const d of DIRS) {
        const n = this.idx(s, d)
        if (n < 0) continue
        const p = this.cells[n]
        // 实体方块负责把电送到旁边的活塞
        if (p && (p.type === 'block' || p.type === 'slime' || p.type === 'redstone' || p.type === 'clock'))
          lit.add(n)
      }
    }
    const result = new Set<number>()
    for (let i = 0; i < this.size; i++) {
      const p = this.cells[i]
      if (p?.type !== 'piston' && p?.type !== 'stickyPiston') continue
      if (sources.has(i)) {
        result.add(i)
        continue
      }
      for (const d of DIRS) {
        const n = this.idx(i, d)
        if (n < 0) continue
        if (sources.has(n) || lit.has(n)) {
          result.add(i)
          break
        }
      }
    }
    return result
  }

  /**
   * 从 start 开始收集粘液连通组。start 没有零件就是空组（只是伸个头）。
   * 组里出现伸出的活塞、超过上限就返回 null。
   */
  private collect(start: number, self: number, blocked: Set<number>): number[] | null {
    if (blocked.has(start)) return null
    if (!this.cells[start]) return []
    const out: number[] = []
    const seen = new Set<number>([start])
    const queue = [start]
    while (queue.length) {
      const c = queue.pop()!
      const p = this.cells[c]
      if (!p) continue
      if (this.extended.has(c)) return null
      out.push(c)
      if (out.length > PUSH_LIMIT) return null
      if (p.type !== 'slime') continue
      for (const d of DIRS) {
        const n = this.idx(c, d)
        if (n < 0 || this.isWall(n)) continue
        if (n === self || seen.has(n)) continue
        if (blocked.has(n)) return null
        if (!this.cells[n]) continue
        seen.add(n)
        queue.push(n)
      }
    }
    return out
  }

  private planMove(piston: number, blocked: Set<number>, pull: boolean): Plan | null {
    const part = this.cells[piston]
    const d = part?.dir
    if (d === undefined) return null
    const sign = pull ? -1 : 1
    if (pull && part?.type !== 'stickyPiston') {
      // 普通活塞缩回就只收头，不拉方块
      return { piston, sources: [], dests: [], claimHead: -1, pull: false }
    }
    // 推：从前面一格开始；拉：从前面两格开始（头让出来以后再拉回一格）
    const start = this.idx(piston, d, pull ? 2 : 1)
    const claimHead = this.idx(piston, d)
    if (claimHead < 0 || this.isWall(claimHead)) return null
    if (blocked.has(claimHead)) return null
    if (start < 0 || this.isWall(start)) {
      return pull ? { piston, sources: [], dests: [], claimHead: -1, pull } : { piston, sources: [], dests: [], claimHead, pull }
    }
    const sources = this.collect(start, piston, blocked)
    if (sources === null) return null
    const dests: number[] = []
    const moving = new Set(sources)
    for (const c of sources) {
      const t = this.idx(c, d, sign)
      if (t < 0 || this.isWall(t)) return null
      if (blocked.has(t) && !moving.has(t)) return null
      const occ = this.cells[t]
      if (occ && !moving.has(t)) return null
      dests.push(t)
    }
    return { piston, sources, dests, claimHead: pull ? -1 : claimHead, pull }
  }

  private apply(plan: Plan) {
    const part = this.cells[plan.piston]
    if (!part) return
    const d = part.dir
    if (d === undefined) return
    const moved = new Map<number, number>()
    for (let k = 0; k < plan.sources.length; k++) moved.set(plan.sources[k], plan.dests[k])
    const parts = plan.sources.map((c) => this.cells[c])
    for (const c of plan.sources) this.cells[c] = null
    for (let k = 0; k < plan.sources.length; k++) this.cells[plan.dests[k]] = parts[k]
    const next = new Set<number>()
    for (const body of this.extended) next.add(moved.get(body) ?? body)
    if (plan.claimHead >= 0) next.add(plan.piston)
    else next.delete(plan.piston)
    this.extended = next
  }

  /** 推进一个 tick，返回画面是否有变化 */
  step(): boolean {
    if (this.tick === Number.MAX_SAFE_INTEGER) return false
    const sig = this.signature()
    const firing = new Set<number>()
    for (let i = 0; i < this.size; i++) {
      const p = this.cells[i]
      if (p?.type !== 'observer' || p.dir === undefined) continue
      const watched = this.idx(i, p.dir)
      if (watched >= 0 && sig[watched] !== this.prevSig[watched]) firing.add(i)
    }
    this.prevSig = sig

    const powered = this.powered(firing)
    const heads = this.headCells()
    const releasing = new Set<number>()
    for (const body of this.extended) {
      if (powered.has(body)) continue
      const d = this.cells[body]?.dir
      if (d === undefined) continue
      const head = this.idx(body, d)
      if (head >= 0) releasing.add(head)
    }
    const blocked = new Set<number>()
    for (const h of heads) if (!releasing.has(h)) blocked.add(h)

    let plans: Plan[] = []
    for (let i = 0; i < this.size; i++) {
      const p = this.cells[i]
      if (p?.type !== 'piston' && p?.type !== 'stickyPiston') continue
      const on = powered.has(i)
      const out = this.extended.has(i)
      if (on === out) continue
      const plan = this.planMove(i, blocked, !on)
      if (plan) plans.push(plan)
    }

    const cancelled = new Set<Plan>()
    for (let a = 0; a < plans.length; a++) {
      for (let b = a + 1; b < plans.length; b++) {
        if (this.conflict(plans[a], plans[b])) {
          cancelled.add(plans[a])
          cancelled.add(plans[b])
        }
      }
    }
    plans = plans.filter((p) => !cancelled.has(p))

    if (plans.length === 0) {
      this.tick++
      return releasing.size > 0
    }
    // 先收头再伸头，缩回的先做，腾出的格子这一拍就能用
    for (const plan of plans) if (plan.claimHead < 0) this.apply(plan)
    for (const plan of plans) if (plan.claimHead >= 0) this.apply(plan)
    this.tick++
    return true
  }

  private conflict(a: Plan, b: Plan): boolean {
    if (a.piston === b.piston) return true
    if (a.claimHead >= 0 && a.claimHead === b.claimHead) return true
    if (a.claimHead >= 0 && (b.sources.includes(a.claimHead) || b.dests.includes(a.claimHead))) return true
    if (b.claimHead >= 0 && (a.sources.includes(b.claimHead) || a.dests.includes(b.claimHead))) return true
    for (const s of a.sources) if (b.sources.includes(s)) return true
    for (const s of a.sources) if (b.dests.includes(s)) return true
    for (const s of b.sources) if (a.dests.includes(s)) return true
    for (const t of a.dests) if (b.dests.includes(t)) return true
    return false
  }

  /** 每格是不是算在终点里；没有零件就不算 */
  private onGoal(i: number) {
    return this.level.goal.includes(i)
  }

  reached(): boolean {
    for (let i = 0; i < this.size; i++) {
      if (this.cells[i] && !this.onGoal(i)) return false
    }
    return true
  }

  /** 机器中心的格子下标，界面拿它跟镜头 */
  center(): number {
    let sum = 0
    let count = 0
    for (let i = 0; i < this.size; i++) {
      if (!this.cells[i]) continue
      sum += i
      count++
    }
    return count ? Math.round(sum / count) : 0
  }

  reset(cells?: (FlyPart | null)[]) {
    this.cells = (cells ?? this.level.cells).map((c) => (c ? { ...c } : null))
    this.extended = new Set()
    this.tick = 0
    this.prevSig = this.bootSignature()
  }

  fork(): FlySim {
    const sim = new FlySim(this.level, this.cells)
    sim.extended = new Set(this.extended)
    sim.tick = this.tick
    sim.prevSig = this.prevSig.slice()
    return sim
  }
}

/** 跑 n tick，用来做关卡测试 */
export function runFly(level: FlyLevel, ticks: number, cells?: (FlyPart | null)[]) {
  const sim = new FlySim(level, cells)
  let movedAt = 0
  for (let i = 0; i < ticks; i++) {
    const moved = sim.step()
    if (moved) movedAt = sim.tick
  }
  return { sim, movedAt, reached: sim.reached() }
}
