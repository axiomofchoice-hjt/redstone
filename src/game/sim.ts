import type { Cell, Dir, Level, TestCase } from './types'

export const DX = [0, 1, 0, -1] as const
export const DY = [-1, 0, 1, 0] as const

export const DIR_N: Dir = 0
export const DIR_E: Dir = 1
export const DIR_S: Dir = 2
export const DIR_W: Dir = 3

export const opposite = (d: Dir): Dir => ((d + 2) % 4) as Dir

export const dirOf = (cell: Cell): Dir => cell.dir ?? DIR_E

export const isConductor = (cell: Cell | null | undefined): boolean =>
  cell?.type === 'wire' || cell?.type === 'cross'

/** 每种元件在渲染/判定时需要方向 */
export const hasDirection = (type: Cell['type']): boolean =>
  type === 'charger' || type === 'not'

export interface Snapshot {
  /** 每格的通电状态：bit0 = 垂直通道，bit1 = 水平通道 */
  powers: number[]
  outputs: Record<string, boolean>
}

export interface Failure {
  tick: number
  output: string
  expected: boolean
  actual: boolean
}

export interface TestOutcome {
  name: string
  passed: boolean
  failures: Failure[]
}

export interface LevelRun {
  passed: boolean
  outcomes: TestOutcome[]
  snapshot: Snapshot
}

/**
 * 无延迟元件的求解：
 * - 导线 / 交叉导线在同一 tick 内瞬时形成等电位网络；
 * - 充能器把后方信号写到前方，也无延迟；
 * - 非门采样输入后把输出推迟 1 tick。
 */
export class Simulation {
  readonly level: Level
  tick = 0

  private inputs = new Map<string, boolean>()
  private notOn: boolean[]
  private portNode: Int32Array
  private parent: Int32Array
  private nodeCount = 0
  private outputValues: Record<string, boolean> = {}

  constructor(level: Level, previous?: Simulation) {
    this.level = level
    const n = level.cells.length
    this.notOn = new Array<boolean>(n).fill(true)

    // 电路改动后重建时，已有非门保持原状态，新放的默认通电
    if (previous && previous.level.cells.length === n) {
      for (let i = 0; i < n; i++) {
        if (level.cells[i]?.type === 'not' && previous.level.cells[i]?.type === 'not') {
          this.notOn[i] = previous.notOn[i]
        }
      }
    }

    const nodeOf = new Int32Array(n).fill(-1)
    let count = 0
    for (let i = 0; i < n; i++) {
      const c = level.cells[i]
      if (!c) continue
      if (c.type === 'wire') nodeOf[i] = count++
      else if (c.type === 'cross') {
        nodeOf[i] = count
        count += 2
      } else if (c.type === 'input' && c.id) {
        this.inputs.set(c.id, false)
      }
    }
    this.nodeCount = count

    this.parent = new Int32Array(count)
    for (let i = 0; i < count; i++) this.parent[i] = i

    this.portNode = new Int32Array(n * 4).fill(-1)
    for (let i = 0; i < n; i++) {
      const c = level.cells[i]
      if (!c || nodeOf[i] < 0) continue
      for (let d = 0; d < 4; d++) {
        // 交叉导线：南北是一组，东西是另一组
        this.portNode[i * 4 + d] = c.type === 'cross' ? nodeOf[i] + (d % 2 === 0 ? 0 : 1) : nodeOf[i]
      }
    }

    const { cols, rows, cells } = level
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const i = y * cols + x
        if (!isConductor(cells[i])) continue
        for (let d = 0; d < 4; d++) {
          const nx = x + DX[d]
          const ny = y + DY[d]
          if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue
          const j = ny * cols + nx
          if (!isConductor(cells[j])) continue
          this.union(this.portNode[i * 4 + d], this.portNode[j * 4 + opposite(d as Dir)])
        }
      }
    }
  }

  setInputs(values: Record<string, 0 | 1>): void {
    for (const key of Object.keys(values)) this.inputs.set(key, !!values[key])
  }

  output(id: string): boolean {
    return this.outputValues[id] ?? false
  }

  /** 推进 1 tick */
  step(): void {
    const { nodeValue, chargerOut } = this.solve()
    const nextNot = this.notOn.slice()
    const { cols, rows, cells } = this.level

    for (let i = 0; i < cells.length; i++) {
      const c = cells[i]
      if (!c || c.type !== 'not') continue
      const x = i % cols
      const y = (i - x) / cols
      let powered = false
      for (let d = 0; d < 4; d++) {
        const nx = x + DX[d]
        const ny = y + DY[d]
        if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue
        const j = ny * cols + nx
        const cj = cells[j]
        // 只有"前方指向自己"的充能器才算输入
        if (cj?.type === 'charger' && dirOf(cj) === opposite(d as Dir)) {
          powered = powered || chargerOut[j]
        }
      }
      nextNot[i] = !powered
    }

    this.outputValues = this.collectOutputs(nodeValue, chargerOut)
    this.notOn = nextNot
    this.tick++
  }

  snapshot(): Snapshot {
    const { nodeValue, chargerOut } = this.solve()
    const { cells } = this.level
    const powers = new Array<number>(cells.length).fill(0)

    for (let i = 0; i < cells.length; i++) {
      const c = cells[i]
      if (!c) continue
      switch (c.type) {
        case 'wire': {
          const on = nodeValue[this.find(this.portNode[i * 4])]
          powers[i] = on ? 3 : 0
          break
        }
        case 'cross': {
          const v = nodeValue[this.find(this.portNode[i * 4])] ? 1 : 0
          const h = nodeValue[this.find(this.portNode[i * 4 + 1])] ? 2 : 0
          powers[i] = v | h
          break
        }
        case 'charger':
          powers[i] = chargerOut[i] ? 1 : 0
          break
        case 'not':
          powers[i] = this.notOn[i] ? 1 : 0
          break
        case 'input':
          powers[i] = c.id && this.inputs.get(c.id) ? 1 : 0
          break
        case 'output': {
          const outs = this.collectOutputs(nodeValue, chargerOut)
          powers[i] = c.id && outs[c.id] ? 1 : 0
          break
        }
      }
    }

    return { powers, outputs: this.collectOutputs(nodeValue, chargerOut) }
  }

  private collectOutputs(nodeValue: boolean[], chargerOut: boolean[]): Record<string, boolean> {
    const result: Record<string, boolean> = {}
    const { cols, rows, cells } = this.level
    for (let i = 0; i < cells.length; i++) {
      const c = cells[i]
      if (!c || c.type !== 'output' || !c.id) continue
      const x = i % cols
      const y = (i - x) / cols
      let value = false
      for (let d = 0; d < 4 && !value; d++) {
        const nx = x + DX[d]
        const ny = y + DY[d]
        if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue
        value = this.signalAt(ny * cols + nx, opposite(d as Dir), chargerOut, nodeValue)
      }
      result[c.id] = value
    }
    return result
  }

  private solve(): { nodeValue: boolean[]; chargerOut: boolean[] } {
    const { cols, rows, cells } = this.level
    const nodeValue = new Array<boolean>(this.nodeCount).fill(false)
    const chargerOut = new Array<boolean>(cells.length).fill(false)

    // 充能器是无延迟的，但它读取的导线又可能由充能器驱动，所以迭代到稳定
    for (let guard = 0; guard < 128; guard++) {
      nodeValue.fill(false)

      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const i = y * cols + x
          if (!isConductor(cells[i])) continue
          for (let d = 0; d < 4; d++) {
            const nx = x + DX[d]
            const ny = y + DY[d]
            if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue
            const j = ny * cols + nx
            if (isConductor(cells[j])) continue
            if (this.signalAt(j, opposite(d as Dir), chargerOut, nodeValue)) {
              nodeValue[this.find(this.portNode[i * 4 + d])] = true
            }
          }
        }
      }

      let changed = false
      for (let i = 0; i < cells.length; i++) {
        const c = cells[i]
        if (!c || c.type !== 'charger') continue
        const x = i % cols
        const y = (i - x) / cols
        const d = dirOf(c)
        const bx = x - DX[d]
        const by = y - DY[d]
        let value = false
        if (bx >= 0 && by >= 0 && bx < cols && by < rows) {
          value = this.signalAt(by * cols + bx, d, chargerOut, nodeValue)
        }
        if (value !== chargerOut[i]) {
          chargerOut[i] = value
          changed = true
        }
      }
      if (!changed) break
    }

    return { nodeValue, chargerOut }
  }

  /** 格子 i 朝 dir 方向发出的信号 */
  private signalAt(i: number, dir: Dir, chargerOut: boolean[], nodeValue: boolean[]): boolean {
    const c = this.level.cells[i]
    if (!c) return false
    switch (c.type) {
      case 'wire':
      case 'cross':
        return nodeValue[this.find(this.portNode[i * 4 + dir])]
      case 'input':
        return c.id ? (this.inputs.get(c.id) ?? false) : false
      case 'not':
        return this.notOn[i]
      case 'charger':
        return dirOf(c) === dir ? chargerOut[i] : false
      case 'output':
        return false
    }
  }

  private find(a: number): number {
    let root = a
    while (this.parent[root] !== root) root = this.parent[root]
    while (this.parent[a] !== root) {
      const next = this.parent[a]
      this.parent[a] = root
      a = next
    }
    return root
  }

  private union(a: number, b: number): void {
    if (a < 0 || b < 0) return
    const ra = this.find(a)
    const rb = this.find(b)
    if (ra !== rb) this.parent[rb] = ra
  }
}

export function runTest(level: Level, test: TestCase): { outcome: TestOutcome; sim: Simulation } {
  const sim = new Simulation(level)
  const events = test.events ?? []
  const checks = test.checks

  let maxTick = 0
  for (const e of events) maxTick = Math.max(maxTick, e.tick)
  for (const c of checks) maxTick = Math.max(maxTick, c.tick)

  const failures: Failure[] = []
  for (let t = 0; t <= maxTick; t++) {
    for (const e of events) if (e.tick === t) sim.setInputs(e.values)
    sim.step()
    for (const c of checks) {
      if (c.tick !== t) continue
      for (const id of Object.keys(c.outputs)) {
        const expected = !!c.outputs[id]
        const actual = sim.output(id)
        if (actual !== expected) {
          failures.push({ tick: t, output: id, expected, actual })
        }
      }
    }
  }

  return {
    outcome: { name: test.name ?? '测试', passed: failures.length === 0, failures },
    sim,
  }
}

export function runLevel(level: Level): LevelRun {
  const outcomes: TestOutcome[] = []
  let last: Simulation | null = null
  for (const test of level.tests) {
    const result = runTest(level, test)
    outcomes.push(result.outcome)
    last = result.sim
  }
  const sim = last ?? new Simulation(level)
  return {
    passed: outcomes.every((o) => o.passed),
    outcomes,
    snapshot: sim.snapshot(),
  }
}
