export type Dir = 0 | 1 | 2 | 3

export type CellType = 'wire' | 'cross' | 'charger' | 'repeater' | 'not' | 'input' | 'output'

export interface Cell {
  type: CellType
  /** 朝向（前面）。只对有方向的元件有意义：charger / repeater / not */
  dir?: Dir
  /** input / output 在测试里的标识 */
  id?: string
  /** 关卡预置元件，玩家不能删除 */
  locked?: boolean
}

export interface InputEvent {
  tick: number
  values: Record<string, 0 | 1>
}

/**
 * 输出检查：只要 [from, to] 区间里每个 tick 都符合期望即可，区间外不关心。
 * 不写 to 就只查 from 这一个 tick。
 *
 * 输入事件设置后会一直保持，所以检查区间里信号是持续的。
 */
export interface OutputCheck {
  from: number
  to?: number
  outputs: Record<string, 0 | 1>
}

/**
 * 成对检查（2-SAT 式）：同一条输出在两个时刻的取值，只允许是 allow 里列举的组合。
 * 周期性信号（时钟）用它，不必假定从哪一相位开始。
 */
export interface PairCheck {
  output: string
  /** 两个采样时刻，通常写成 [t, t + 间隔] */
  ticks: [number, number]
  /** 允许的取值组合，每项是 [前一个时刻的值, 后一个时刻的值] */
  allow: (0 | 1)[][]
}

export interface TestCase {
  name?: string
  events?: InputEvent[]
  checks?: OutputCheck[]
  pairs?: PairCheck[]
}

/** 某一刻的电路状态：和地图一起导出，也可以恢复到仿真里 */
export interface CircuitState {
  tick: number
  inputs: Record<string, 0 | 1>
  outputs: Record<string, 0 | 1>
  /**
   * 每格的通电状态：bit0 = 垂直通道，bit1 = 水平通道。
   * 和 `cells` 一样稀疏，只记录通电的格子，key 是行优先下标，空格子省略。
   */
  powers: Record<number, number>
}

/** 参考解：元件布局 + 保存时的电路状态 */
export interface Solution {
  cells: (Cell | null)[]
  state: CircuitState
}

export interface Level {
  id: string
  /** 第几关 */
  no?: number
  name: string
  /** 这一关的目标说明：手机端顶栏的 ⓘ 打开后只显示这段文字；空字符串表示还没写 */
  brief?: string
  cols: number
  rows: number
  /** 输入元件的字母，按顺序排 */
  inputs?: string[]
  /** 输出元件的字母，按顺序排 */
  outputs?: string[]
  /** 这关允许玩家放置的元件类型；不写表示全部可用 */
  tools?: CellType[]
  /** 参考解：菜单里「参考答案」盖到地图上的布局和电路状态；没有就不给盖 */
  solution?: Solution
  cells: (Cell | null)[]
  tests: TestCase[]
}
