import type { Cell, Level } from '../game/types'

const cols = 20
const rows = 10
const cells: (Cell | null)[] = new Array(cols * rows).fill(null)

const at = (x: number, y: number) => y * cols + x

// 四个角预置端口：左边上下是输入，右边上下是输出
cells[at(0, 0)] = { type: 'input', id: 'A', locked: true }
cells[at(0, rows - 1)] = { type: 'input', id: 'B', locked: true }
cells[at(cols - 1, 0)] = { type: 'output', id: 'C', locked: true }
cells[at(cols - 1, rows - 1)] = { type: 'output', id: 'D', locked: true }

/**
 * 第八关：交叉（20 列 × 10 行）。两条信号要交换到对角，只给四种元件，不给交叉。
 * 交叉的逻辑解法：X = A XOR B，C = A XOR X = B，D = B XOR X = A
 */
export const level08: Level = {
  id: 'level-08',
  no: 8,
  name: '交叉',
  cols,
  rows,
  inputs: ['A', 'B'],
  outputs: ['C', 'D'],
  tools: ['wire', 'charger', 'repeater', 'not'],
  cells,
  tests: [
    { name: '0 0 → 0 0', checks: [{ from: 10, to: 20, outputs: { C: 0, D: 0 } }] },
    {
      name: '1 0 → 0 1',
      events: [{ tick: 0, values: { A: 1, B: 0 } }],
      checks: [{ from: 10, to: 20, outputs: { C: 0, D: 1 } }],
    },
    {
      name: '0 1 → 1 0',
      events: [{ tick: 0, values: { A: 0, B: 1 } }],
      checks: [{ from: 10, to: 20, outputs: { C: 1, D: 0 } }],
    },
    {
      name: '1 1 → 1 1',
      events: [{ tick: 0, values: { A: 1, B: 1 } }],
      checks: [{ from: 10, to: 20, outputs: { C: 1, D: 1 } }],
    },
  ],
}
