import type { Cell, Level } from '../game/types'

const cols = 20
const rows = 14
const cells: (Cell | null)[] = new Array(cols * rows).fill(null)

/**
 * 示例关（占位）。等真实关卡数据。
 * 输入 A、B 和输出 C 由玩家自己放置。
 */
export const level01: Level = {
  id: 'demo-01',
  no: 1,
  name: '示例关',
  cols,
  rows,
  inputs: ['A', 'B'],
  outputs: ['C'],
  cells,
  tests: [],
}
