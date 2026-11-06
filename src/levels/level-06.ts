import type { Cell, Level } from '../game/types'

const cols = 15
const rows = 20
// 输入 A、B 和输出 S、C 由玩家自己放
const cells: (Cell | null)[] = new Array(cols * rows).fill(null)

/** 第六关：半加器，S = A XOR B（和），C = A AND B（进位） */
export const level06: Level = {
  id: 'level-06',
  no: 6,
  name: '半加器',
  cols,
  rows,
  inputs: ['A', 'B'],
  outputs: ['S', 'C'],
  cells,
  tests: [
    {
      name: 'A=0 B=0 → S=0 C=0',
      checks: [{ from: 10, to: 20, outputs: { S: 0, C: 0 } }],
    },
    {
      name: 'A=1 B=0 → S=1 C=0',
      events: [{ tick: 0, values: { A: 1, B: 0 } }],
      checks: [{ from: 10, to: 20, outputs: { S: 1, C: 0 } }],
    },
    {
      name: 'A=0 B=1 → S=1 C=0',
      events: [{ tick: 0, values: { A: 0, B: 1 } }],
      checks: [{ from: 10, to: 20, outputs: { S: 1, C: 0 } }],
    },
    {
      name: 'A=1 B=1 → S=0 C=1',
      events: [{ tick: 0, values: { A: 1, B: 1 } }],
      checks: [{ from: 10, to: 20, outputs: { S: 0, C: 1 } }],
    },
  ],
}
