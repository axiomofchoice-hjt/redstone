import type { Cell, CircuitState, Dir, Level, TestCase } from './types'

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

/** 充能器与中继器：有方向，从后面读信号，向前面输出 */
export const isSource = (cell: Cell | null | undefined): boolean =>
  cell?.type === 'charger' || cell?.type === 'repeater'

/** 每种元件在渲染/判定时需要方向 */
export const hasDirection = (type: Cell['type']): boolean =>
  type === 'charger' || type === 'repeater' || type === 'not'

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
  /** 成对检查失败时，两个时刻实际的取值和允许的组合（expected 只是按已知值推的提示） */
  pair?: {
    ticks: [number, number]
    values: [boolean, boolean]
    allow: (0 | 1)[][]
  }
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
 * 电路求解（增量）。
 *
 * 静态部分（编辑时重建一次）：导线网络的并查集、每个网络贴着的外部格子。
 * 动态部分（每 tick 只碰变化的格子）：
 * - 每个导线网络维护「驱动它的外部元件个数」，个数 0↔1 才翻转网络电平；
 * - 网络翻转时只通知贴在它边上的格子，不扫全图；
 * - 充能器变化时只沿它的前面传播，不再全图迭代。
 *
 * `snapshotFull()` 是同样的规则从头全量算一遍的实现，只用于测试对照。
 */
export class Simulation {
  readonly level: Level
  tick = 0

  private inputs = new Map<string, boolean>()
  private notOn: boolean[]
  private repeaterOut: boolean[]
  private portNode: Int32Array
  private parent: Int32Array
  private nodeCount = 0
  private outputValues: Record<string, boolean> = {}

  /** 每个导线网络当前电平 */
  private netValue: Uint8Array
  /** 每个导线网络被几个外部元件驱动（只统计 1） */
  private netCount: Int32Array
  /** 贴着每个导线网络的外部格子，网络翻转时只通知这些 */
  private netAdj: number[][]
  /** 每个输入字母对应哪些格子 */
  private inputCells = new Map<string, number[]>()
  /** 每格朝四个方向发出的信号，用来判断值有没有变 */
  private emit: Uint8Array
  private chargerOut: boolean[]
  /** 自上次取样以来画面是否需要重绘 */
  private dirty = false

  constructor(level: Level, previous?: Simulation) {
    this.level = level
    const n = level.cells.length
    this.notOn = new Array<boolean>(n).fill(true)
    this.repeaterOut = new Array<boolean>(n).fill(false)
    const fresh = new Array<boolean>(n).fill(true)

    // 电路改动后重建时，已有非门/中继器保持原状态，新放的从关开始
    if (previous && previous.level.cells.length === n) {
      for (let i = 0; i < n; i++) {
        const now = level.cells[i]?.type
        const was = previous.level.cells[i]?.type
        if (now === 'not' && was === 'not') {
          this.notOn[i] = previous.notOn[i]
          fresh[i] = false
        }
        if (now === 'repeater' && was === 'repeater') {
          this.repeaterOut[i] = previous.repeaterOut[i]
        }
      }
    }

    // 导线网络：导线一格一个节点；交叉导线南北、东西各一个节点
    const { cols, rows, cells } = level
    this.portNode = new Int32Array(n * 4).fill(-1)
    let count = 0
    for (let i = 0; i < n; i++) {
      const c = cells[i]
      if (!c) continue
      if (c.type === 'input' && c.id) {
        this.inputs.set(c.id, false)
        const list = this.inputCells.get(c.id)
        if (list) list.push(i)
        else this.inputCells.set(c.id, [i])
      }
      if (!isConductor(c)) continue
      const nodes = c.type === 'cross' ? 2 : 1
      for (let d = 0; d < 4; d++) {
        // 交叉导线：南北是一组，东西是另一组
        this.portNode[i * 4 + d] = count + (nodes === 2 && d % 2 === 1 ? 1 : 0)
      }
      count += nodes
    }
    this.nodeCount = count

    this.parent = new Int32Array(count)
    for (let i = 0; i < count; i++) this.parent[i] = i

    // 相邻的导线并入同一个网络
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const i = y * cols + x
        if (!isConductor(cells[i])) continue
        for (let d = 0; d < 4; d++) {
          const nx = x + DX[d]
          const ny = y + DY[d]
          if (!this.inside(nx, ny)) continue
          const j = ny * cols + nx
          if (!isConductor(cells[j])) continue
          this.union(this.portNode[i * 4 + d], this.portNode[j * 4 + opposite(d as Dir)])
        }
      }
    }

    this.chargerOut = new Array<boolean>(n).fill(false)
    this.netValue = new Uint8Array(count)
    this.netCount = new Int32Array(count)
    this.emit = new Uint8Array(n * 4)
    this.netAdj = this.buildAdjacency()
    this.initSignals()

    // 新放的非门不摆出一个通电的 tick：当下被充能就直接是关
    if (fresh.some(Boolean)) {
      const queue: number[] = []
      for (let i = 0; i < n; i++) {
        if (!fresh[i] || cells[i]?.type !== 'not') continue
        this.notOn[i] = !this.chargerPowered(i)
        this.refreshEmit(i, queue)
      }
      this.settle(queue)
    }
  }

  setInputs(values: Record<string, 0 | 1>): void {
    const queue: number[] = []
    for (const key of Object.keys(values)) {
      const value = !!values[key]
      const before = this.inputs.get(key)
      this.inputs.set(key, value)
      if (before === value) continue
      this.dirty = true
      for (const i of this.inputCells.get(key) ?? []) this.refreshEmit(i, queue)
    }
    this.settle(queue)
  }

  /** 完整复制一份当前状态，用来跑测试：测试怎么折腾都不会动到编辑器里这一份 */
  fork(): Simulation {
    const copy = new Simulation(cloneLevel(this.level))
    copy.tick = this.tick
    copy.inputs = new Map(this.inputs)
    copy.notOn = this.notOn.slice()
    copy.repeaterOut = this.repeaterOut.slice()
    copy.chargerOut = this.chargerOut.slice()
    copy.netValue = this.netValue.slice()
    copy.netCount = this.netCount.slice()
    copy.emit = this.emit.slice()
    copy.outputValues = { ...this.outputValues }
    copy.dirty = this.dirty
    return copy
  }

  output(id: string): boolean {
    return this.outputValues[id] ?? false
  }

  /** 当前所有输入元件的取值，按元件在地图里第一次出现的顺序 */
  inputValues(): Record<string, 0 | 1> {
    const result: Record<string, 0 | 1> = {}
    for (const [id, value] of this.inputs) result[id] = value ? 1 : 0
    return result
  }

  /** 推进 1 tick，返回画面是否发生了变化 */
  step(): boolean {
    const { cells } = this.level
    const nextNot = this.notOn.slice()
    const nextRepeater = this.repeaterOut.slice()
    const seeds: number[] = []

    for (let i = 0; i < cells.length; i++) {
      const type = cells[i]?.type
      if (type === 'not') {
        const value = !this.chargerPowered(i)
        nextNot[i] = value
        if (value !== this.notOn[i]) seeds.push(i)
      } else if (type === 'repeater') {
        // 中继器读取后方当下的信号，下一 tick 才输出
        const value = this.readBack(i)
        nextRepeater[i] = value
        if (value !== this.repeaterOut[i]) seeds.push(i)
      }
    }

    // 输出在这里采样，还没换上新状态，所以延迟元件前后各差 1 tick
    this.outputValues = this.collectOutputs()
    this.notOn = nextNot
    this.repeaterOut = nextRepeater

    this.dirty = false
    if (seeds.length > 0) {
      const queue: number[] = []
      for (const i of seeds) this.refreshEmit(i, queue)
      this.settle(queue)
    }
    this.tick++
    return this.dirty || seeds.length > 0
  }

  /** 单个格子的通电状态（画布只取看得见的格子，不用整张图算一遍） */
  powerAt(i: number): number {
    const c = this.level.cells[i]
    if (!c) return 0
    switch (c.type) {
      case 'wire':
        return this.netValue[this.find(this.portNode[i * 4])] ? 3 : 0
      case 'cross': {
        const v = this.netValue[this.find(this.portNode[i * 4])] ? 1 : 0
        const h = this.netValue[this.find(this.portNode[i * 4 + 1])] ? 2 : 0
        return v | h
      }
      case 'charger':
        return this.chargerOut[i] ? 1 : 0
      case 'repeater':
        return this.repeaterOut[i] ? 1 : 0
      case 'not':
        return this.notOn[i] ? 1 : 0
      case 'input':
        return this.inputs.get(c.id ?? '') ? 1 : 0
      case 'output':
        return c.id && this.outputValueAt(i) ? 1 : 0
    }
  }

  snapshot(): Snapshot {
    const { cells } = this.level
    const powers = new Array<number>(cells.length)
    for (let i = 0; i < cells.length; i++) powers[i] = this.powerAt(i)
    return { powers, outputs: this.collectOutputs() }
  }

  /** 当前电路状态，可直接导出或存进参考解 */
  circuitState(): CircuitState {
    const snapshot = this.snapshot()
    const outputs: Record<string, 0 | 1> = {}
    for (const [id, value] of Object.entries(snapshot.outputs)) outputs[id] = value ? 1 : 0
    return {
      tick: this.tick,
      inputs: this.inputValues(),
      outputs,
      powers: snapshot.powers,
    }
  }

  /**
   * 把电路恢复到 saved 状态：输入、延迟元件输出、导线电平和 tick 一起还原。
   * 状态通常来自 `circuitState()`，恢复后继续 step 的结果应与保存时一致。
   */
  restore(state: CircuitState): void {
    for (const id of this.inputs.keys()) this.inputs.set(id, false)
    for (const [id, value] of Object.entries(state.inputs)) {
      if (this.inputs.has(id)) this.inputs.set(id, !!value)
    }

    const { cells } = this.level
    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i]
      if (!cell) continue
      const power = state.powers[i] ?? 0
      if (cell.type === 'not') this.notOn[i] = (power & 1) === 1
      else if (cell.type === 'repeater') this.repeaterOut[i] = (power & 1) === 1
      else if (cell.type === 'charger') this.chargerOut[i] = (power & 1) === 1
    }

    // 导线电平完全由输入和延迟元件推导，清空后重新传播一遍
    this.netValue.fill(0)
    this.netCount.fill(0)
    this.emit.fill(0)
    this.initSignals()

    this.tick = state.tick
    this.outputValues = this.collectOutputs()
    this.dirty = true
  }

  /**
   * 只给测试用：原来的全量算法，同样的规则从头算一遍。
   * 增量版的结果必须和它逐格一致；`stable` 表示这次求解是否收敛，
   * 不收敛的电路（例如充能器自环）不参与对比。
   */
  snapshotFull(): Snapshot & { stable: boolean } {
    const { nodeValue, chargerOut, stable } = this.solveFull()
    const { cells } = this.level
    const outputs = this.collectOutputsFull(nodeValue, chargerOut)
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
        case 'repeater':
          powers[i] = this.repeaterOut[i] ? 1 : 0
          break
        case 'not':
          powers[i] = this.notOn[i] ? 1 : 0
          break
        case 'input':
          powers[i] = c.id && this.inputs.get(c.id) ? 1 : 0
          break
        case 'output':
          powers[i] = c.id && outputs[c.id] ? 1 : 0
          break
      }
    }
    return { powers, outputs, stable }
  }

  /** 贴着每个导线网络的外部格子 */
  private buildAdjacency(): number[][] {
    const { cols, rows, cells } = this.level
    const adj: number[][] = Array.from({ length: this.nodeCount }, () => [])
    const seen = new Set<number>()
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const i = y * cols + x
        if (!isConductor(cells[i])) continue
        for (let d = 0; d < 4; d++) {
          const nx = x + DX[d]
          const ny = y + DY[d]
          if (!this.inside(nx, ny)) continue
          const j = ny * cols + nx
          if (!cells[j] || isConductor(cells[j])) continue
          const node = this.find(this.portNode[i * 4 + d])
          const key = node * cells.length + j
          if (seen.has(key)) continue
          seen.add(key)
          adj[node].push(j)
        }
      }
    }
    return adj
  }

  private initSignals(): void {
    const { cells } = this.level
    const queue: number[] = []
    for (let i = 0; i < cells.length; i++) {
      const c = cells[i]
      if (!c || isConductor(c)) continue
      this.refreshEmit(i, queue)
    }
    // 充能器可能被别的充能器或导线驱动，先全部入队一次
    for (let i = 0; i < cells.length; i++) {
      if (cells[i]?.type === 'charger') queue.push(i)
    }
    this.settle(queue)
  }

  /**
   * 重新计算格子 i 朝四个方向发出的信号；有变化时只把受影响的格子入队。
   * 导线不参与（它的信号直接由网络电平得出）。
   */
  private refreshEmit(i: number, queue: number[]): void {
    const { cols, cells } = this.level
    const c = cells[i]
    if (!c || isConductor(c)) return
    const x = i % cols
    const y = (i - x) / cols

    for (let d = 0 as Dir; d < 4; d++) {
      const value = this.emitAt(i, d) ? 1 : 0
      const key = i * 4 + d
      if (this.emit[key] === value) continue
      this.emit[key] = value

      const nx = x + DX[d]
      const ny = y + DY[d]
      if (!this.inside(nx, ny)) continue
      const j = ny * cols + nx
      const cj = cells[j]
      if (!cj) continue

      if (isConductor(cj)) {
        const node = this.find(this.portNode[j * 4 + opposite(d)])
        const was = this.netCount[node] > 0
        this.netCount[node] += value === 1 ? 1 : -1
        const now = this.netCount[node] > 0
        if (was !== now) {
          this.netValue[node] = now ? 1 : 0
          this.dirty = true
          for (const neighbor of this.netAdj[node]) queue.push(neighbor)
        }
      } else if (cj.type === 'charger' && dirOf(cj) === d) {
        // 正好是从这个充能器的后面灌进去，它可能要重新输出
        queue.push(j)
      }
    }
  }

  /** 处理队列里待重算的格子，直到不再有变化 */
  private settle(queue: number[]): void {
    const limit = Math.max(256, this.level.cells.length * 8)
    let guard = 0
    while (queue.length > 0) {
      if (++guard > limit) break
      const i = queue.pop()
      if (i === undefined) break
      const c = this.level.cells[i]
      if (!c || isConductor(c)) continue
      if (c.type === 'charger') {
        const value = this.readBack(i)
        if (value !== this.chargerOut[i]) {
          this.chargerOut[i] = value
          this.dirty = true
          this.refreshEmit(i, queue)
        }
      } else {
        this.refreshEmit(i, queue)
      }
    }
  }

  /** 格子 i 朝 dir 方向发出的信号 */
  private emitAt(i: number, dir: Dir): boolean {
    const c = this.level.cells[i]
    if (!c) return false
    switch (c.type) {
      case 'wire':
      case 'cross':
        return this.netValue[this.find(this.portNode[i * 4 + dir])] === 1
      case 'input':
        return c.id ? (this.inputs.get(c.id) ?? false) : false
      case 'not':
        return this.notOn[i]
      case 'charger':
        return dirOf(c) === dir && this.chargerOut[i]
      case 'repeater':
        return dirOf(c) === dir && this.repeaterOut[i]
      case 'output':
        return false
    }
  }

  /** 非门是否正被相邻、且前方指向它的充能器/中继器充能 */
  private chargerPowered(i: number): boolean {
    const { cols, cells } = this.level
    const x = i % cols
    const y = (i - x) / cols
    for (let d = 0 as Dir; d < 4; d++) {
      const nx = x + DX[d]
      const ny = y + DY[d]
      if (!this.inside(nx, ny)) continue
      const j = ny * cols + nx
      if (!isSource(cells[j])) continue
      if (dirOf(cells[j] as Cell) !== opposite(d)) continue
      if (this.emitAt(j, opposite(d))) return true
    }
    return false
  }

  /** 有方向的元件从它后面读到的信号 */
  private readBack(i: number): boolean {
    const { cols, cells } = this.level
    const c = cells[i]
    if (!c) return false
    const x = i % cols
    const y = (i - x) / cols
    const d = dirOf(c)
    const bx = x - DX[d]
    const by = y - DY[d]
    if (!this.inside(bx, by)) return false
    return this.emitAt(by * cols + bx, d)
  }

  private inside(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.level.cols && y < this.level.rows
  }

  private collectOutputs(): Record<string, boolean> {
    const { cells } = this.level
    const result: Record<string, boolean> = {}
    for (let i = 0; i < cells.length; i++) {
      const c = cells[i]
      if (!c || c.type !== 'output' || !c.id) continue
      result[c.id] = this.outputValueAt(i)
    }
    return result
  }

  /** 输出元件取值：任意相邻元件朝它发出的信号 */
  private outputValueAt(i: number): boolean {
    const { cols } = this.level
    const x = i % cols
    const y = (i - x) / cols
    for (let d = 0 as Dir; d < 4; d++) {
      const nx = x + DX[d]
      const ny = y + DY[d]
      if (!this.inside(nx, ny)) continue
      if (this.emitAt(ny * cols + nx, opposite(d))) return true
    }
    return false
  }

  private collectOutputsFull(
    nodeValue: boolean[],
    chargerOut: boolean[],
  ): Record<string, boolean> {
    const { cols, cells } = this.level
    const result: Record<string, boolean> = {}
    for (let i = 0; i < cells.length; i++) {
      const c = cells[i]
      if (!c || c.type !== 'output' || !c.id) continue
      const x = i % cols
      const y = (i - x) / cols
      let value = false
      for (let d = 0 as Dir; d < 4 && !value; d++) {
        const nx = x + DX[d]
        const ny = y + DY[d]
        if (!this.inside(nx, ny)) continue
        value = this.signalAt(ny * cols + nx, opposite(d), chargerOut, nodeValue)
      }
      result[c.id] = value
    }
    return result
  }

  /** 全量求解（仅测试对照用）：和增量版同一套规则，从头算到稳定 */
  private solveFull(): {
    nodeValue: boolean[]
    chargerOut: boolean[]
    stable: boolean
  } {
    const { cols, rows, cells } = this.level
    const nodeValue = new Array<boolean>(this.nodeCount).fill(false)
    const chargerOut = new Array<boolean>(cells.length).fill(false)
    let stable = false

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
            if (!this.inside(nx, ny)) continue
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
        if (cells[i]?.type !== 'charger') continue
        const value = this.readBackFull(i, chargerOut, nodeValue)
        if (value !== chargerOut[i]) {
          chargerOut[i] = value
          changed = true
        }
      }
      if (!changed) {
        stable = true
        break
      }
    }

    return { nodeValue, chargerOut, stable }
  }

  private readBackFull(i: number, chargerOut: boolean[], nodeValue: boolean[]): boolean {
    const { cols, cells } = this.level
    const c = cells[i]
    if (!c) return false
    const x = i % cols
    const y = (i - x) / cols
    const d = dirOf(c)
    const bx = x - DX[d]
    const by = y - DY[d]
    if (!this.inside(bx, by)) return false
    return this.signalAt(by * cols + bx, d, chargerOut, nodeValue)
  }

  private signalAt(
    i: number,
    dir: Dir,
    chargerOut: boolean[],
    nodeValue: boolean[],
  ): boolean {
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
      case 'repeater':
        return dirOf(c) === dir ? this.repeaterOut[i] : false
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

/**
 * 复制一份关卡：格子对象也逐个复制，测试跑在副本上，不会动到玩家的地图。
 */
export function cloneLevel(level: Level): Level {
  return {
    ...level,
    cells: level.cells.map((cell) => (cell ? { ...cell } : null)),
  }
}

export function runTest(
  level: Level,
  test: TestCase,
  from?: Simulation,
): { outcome: TestOutcome; sim: Simulation } {
  // 每组测试都从同一份起始状态开跑，组与组之间互不影响
  const sim = from ? from.fork() : new Simulation(cloneLevel(level))
  const events = test.events ?? []
  const checks = test.checks ?? []
  const pairs = test.pairs ?? []

  let maxTick = 0
  for (const e of events) maxTick = Math.max(maxTick, e.tick)
  for (const c of checks) maxTick = Math.max(maxTick, c.to ?? c.from)
  for (const p of pairs) maxTick = Math.max(maxTick, p.ticks[0], p.ticks[1])

  // 成对检查要回看更早的 tick，按输出分别存下每个 tick 的取值
  const samples = new Map<string, boolean[]>()
  for (const p of pairs) {
    if (!samples.has(p.output)) samples.set(p.output, new Array<boolean>(maxTick + 1))
  }

  const failures: Failure[] = []
  for (let t = 0; t <= maxTick; t++) {
    // 输入设置后一直保持，检查区间里信号是持续的
    for (const e of events) if (e.tick === t) sim.setInputs(e.values)
    sim.step()
    for (const c of checks) {
      const to = c.to ?? c.from
      if (t < c.from || t > to) continue
      for (const id of Object.keys(c.outputs)) {
        const expected = !!c.outputs[id]
        const actual = sim.output(id)
        if (actual !== expected) {
          failures.push({ tick: t, output: id, expected, actual })
        }
      }
    }
    for (const [id, values] of samples) values[t] = sim.output(id)
    for (const p of pairs) {
      const [a, b] = p.ticks[0] <= p.ticks[1] ? p.ticks : [p.ticks[1], p.ticks[0]]
      if (b !== t || a === b) continue
      const values = samples.get(p.output)
      if (!values) continue
      const first = values[a]
      const second = values[b]
      if (p.allow.some(([x, y]) => !!x === first && !!y === second)) continue
      // 期望值：已知前一个时刻时，若允许的组合都指向同一个值，就用它
      const hints = p.allow.filter(([x]) => !!x === first).map(([, y]) => !!y)
      const expected = hints.length > 0 && hints.every((v) => v === hints[0]) ? hints[0] : second
      failures.push({
        tick: b,
        output: p.output,
        expected,
        actual: second,
        pair: { ticks: [a, b], values: [first, second], allow: p.allow },
      })
    }
  }

  return {
    outcome: { name: test.name ?? '测试', passed: failures.length === 0, failures },
    sim,
  }
}

/**
 * 跑整关的测试。`from` 是编辑器里正在跑的仿真：给了就从它当前的状态接着测
 * （电路已经稳定成什么样，就按什么样测），不给就从冷启动开始、不额外预热——
 * 需要预热的关卡自己把预热写进测试数据里。
 */
export function runLevel(level: Level, from?: Simulation): LevelRun {
  const outcomes: TestOutcome[] = []
  let last: Simulation | null = null
  for (const test of level.tests) {
    const result = runTest(level, test, from)
    outcomes.push(result.outcome)
    last = result.sim
  }
  const sim = last ?? new Simulation(cloneLevel(level))
  return {
    passed: outcomes.every((o) => o.passed),
    outcomes,
    snapshot: sim.snapshot(),
  }
}
