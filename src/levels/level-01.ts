import type { Level } from '../game/types'

const cols = 3
const rows = 3
const cells = new Array(cols * rows).fill(null)
const at = (x: number, y: number) => y * cols + x

cells[at(0, 1)] = { type: 'input', id: 'A', locked: true }
cells[at(2, 1)] = { type: 'output', id: 'L', locked: true }

/**
 * 示例关（占位）。等真实关卡数据。
 * 玩家需要在中间放一根导线，让 A 的信号传到底部的 L。
 */
export const level01: Level = {
  id: 'demo-01',
  name: '示例关',
  cols,
  rows,
  cells,
  tests: [
    {
      name: '通电',
      events: [{ tick: 0, values: { A: 1 } }],
      checks: [{ tick: 1, outputs: { L: 1 } }],
    },
    {
      name: '断电',
      events: [{ tick: 0, values: { A: 0 } }],
      checks: [{ tick: 1, outputs: { L: 0 } }],
    },
  ],
}
