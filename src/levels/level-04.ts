import type { Cell, Level } from '../game/types'

const cols = 15
const rows = 20
// 输入 A、B 和输出 C 由玩家自己放
const cells: (Cell | null)[] = new Array(cols * rows).fill(null)

/** 第四关：与门，C = A AND B */
export const level04: Level = {
  id: 'level-04',
  no: 4,
  name: '与门',
  cols,
  rows,
  inputs: ['A', 'B'],
  outputs: ['C'],
  cells,
  tests: [
    { name: 'A=0 B=0 → C=0', checks: [{ from: 10, to: 20, outputs: { C: 0 } }] },
    {
      name: 'A=1 B=0 → C=0',
      events: [{ tick: 0, values: { A: 1, B: 0 } }],
      checks: [{ from: 10, to: 20, outputs: { C: 0 } }],
    },
    {
      name: 'A=0 B=1 → C=0',
      events: [{ tick: 0, values: { A: 0, B: 1 } }],
      checks: [{ from: 10, to: 20, outputs: { C: 0 } }],
    },
    {
      name: 'A=1 B=1 → C=1',
      events: [{ tick: 0, values: { A: 1, B: 1 } }],
      checks: [{ from: 10, to: 20, outputs: { C: 1 } }],
    },
  ],
}
