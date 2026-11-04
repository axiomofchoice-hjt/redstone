export type Dir = 0 | 1 | 2 | 3

export type CellType = 'wire' | 'cross' | 'charger' | 'not' | 'input' | 'output'

export interface Cell {
  type: CellType
  /** 朝向（前面）。只对有方向的元件有意义：charger / not */
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

export interface OutputCheck {
  tick: number
  outputs: Record<string, 0 | 1>
}

export interface TestCase {
  name?: string
  events?: InputEvent[]
  checks: OutputCheck[]
}

export interface Level {
  id: string
  name: string
  cols: number
  rows: number
  cells: (Cell | null)[]
  tests: TestCase[]
}
