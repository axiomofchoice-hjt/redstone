import type { Cell, Level } from '../game/types'

const cols = 15
const rows = 20
// 三个输入 A、B、C 和输出 Y 由玩家自己放
const cells: (Cell | null)[] = new Array(cols * rows).fill(null)

/** 第七关：三人投票器，至少两人投 1 时 Y = 1 */
export const level07: Level = {
  id: 'level-07',
  no: 7,
  name: '三人投票器',
  cols,
  rows,
  inputs: ['A', 'B', 'C'],
  outputs: ['Y'],
  cells,
  tests: [
    { name: '0 0 0 → 0', checks: [{ from: 10, to: 20, outputs: { Y: 0 } }] },
    {
      name: '0 0 1 → 0',
      events: [{ tick: 0, values: { A: 0, B: 0, C: 1 } }],
      checks: [{ from: 10, to: 20, outputs: { Y: 0 } }],
    },
    {
      name: '0 1 0 → 0',
      events: [{ tick: 0, values: { A: 0, B: 1, C: 0 } }],
      checks: [{ from: 10, to: 20, outputs: { Y: 0 } }],
    },
    {
      name: '0 1 1 → 1',
      events: [{ tick: 0, values: { A: 0, B: 1, C: 1 } }],
      checks: [{ from: 10, to: 20, outputs: { Y: 1 } }],
    },
    {
      name: '1 0 0 → 0',
      events: [{ tick: 0, values: { A: 1, B: 0, C: 0 } }],
      checks: [{ from: 10, to: 20, outputs: { Y: 0 } }],
    },
    {
      name: '1 0 1 → 1',
      events: [{ tick: 0, values: { A: 1, B: 0, C: 1 } }],
      checks: [{ from: 10, to: 20, outputs: { Y: 1 } }],
    },
    {
      name: '1 1 0 → 1',
      events: [{ tick: 0, values: { A: 1, B: 1, C: 0 } }],
      checks: [{ from: 10, to: 20, outputs: { Y: 1 } }],
    },
    {
      name: '1 1 1 → 1',
      events: [{ tick: 0, values: { A: 1, B: 1, C: 1 } }],
      checks: [{ from: 10, to: 20, outputs: { Y: 1 } }],
    },
  ],
}
