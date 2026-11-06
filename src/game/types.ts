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

export interface TestCase {
  name?: string
  events?: InputEvent[]
  checks: OutputCheck[]
}

export interface Level {
  id: string
  /** 第几关 */
  no?: number
  name: string
  cols: number
  rows: number
  /** 输入元件的字母，按顺序排 */
  inputs?: string[]
  /** 输出元件的字母，按顺序排 */
  outputs?: string[]
  cells: (Cell | null)[]
  tests: TestCase[]
}
