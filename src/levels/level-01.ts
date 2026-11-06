import type { Cell, Level } from '../game/types'

const cols = 7
const rows = 7
const cells: (Cell | null)[] = new Array(cols * rows).fill(null)

// 输入 A 在第 3 行第 1 列，输出 B 在第 3 行第 5 列（都从 0 开始数），预置且锁定
const at = (x: number, y: number) => y * cols + x
cells[at(1, 3)] = { type: 'input', id: 'A', locked: true }
cells[at(5, 3)] = { type: 'output', id: 'B', locked: true }

/** 第一关：只有导线，把 A 接到 B，让 B 始终等于 A */
export const level01: Level = {
  id: 'level-01',
  no: 1,
  name: '导线',
  cols,
  rows,
  inputs: ['A'],
  outputs: ['B'],
  cells,
  tests: [
    {
      name: 'A=1 时 B=1',
      events: [{ tick: 0, values: { A: 1 } }],
      checks: [{ from: 0, to: 20, outputs: { B: 1 } }],
    },
    {
      name: 'A=0 时 B=0',
      checks: [{ from: 0, to: 20, outputs: { B: 0 } }],
    },
  ],
}
