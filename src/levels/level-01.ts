import type { Level } from '../game/types'

const cols = 20
const rows = 14
const cells: (Level['cells'][number])[] = new Array(cols * rows).fill(null)

/**
 * 示例关（占位）。等真实关卡数据。
 */
export const level01: Level = {
  id: 'demo-01',
  name: '示例关',
  cols,
  rows,
  cells,
  tests: [],
}
