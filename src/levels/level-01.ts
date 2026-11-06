import type { Cell, Level } from '../game/types'
import { cellsFrom, stateFrom } from './solution-helpers'

const cols = 7
const rows = 7
const cells: (Cell | null)[] = new Array(cols * rows).fill(null)

// 输入 A 在第 3 行第 1 列，输出 B 在第 3 行第 5 列（都从 0 开始数），预置且锁定
const at = (x: number, y: number) => y * cols + x
cells[at(1, 3)] = { type: 'input', id: 'A', locked: true }
cells[at(5, 3)] = { type: 'output', id: 'B', locked: true }

// 参考解：A 用三根导线直连 B
const solution = cellsFrom(cols * rows, {
  22: { type: 'input', id: 'A', locked: true },
  23: { type: 'wire' },
  24: { type: 'wire' },
  25: { type: 'wire' },
  26: { type: 'output', id: 'B', locked: true },
})

const solutionState = stateFrom(cols * rows, {
  tick: 37,
  inputs: { A: 0 },
  outputs: { B: 0 },
})

/** 第一关：只有导线，把 A 接到 B，让 B 始终等于 A */
export const level01: Level = {
  id: 'level-01',
  no: 1,
  name: '导线',
  cols,
  rows,
  inputs: ['A'],
  outputs: ['B'],
  // 这一关只让用导线
  tools: ['wire'],
  cells,
  solution: { cells: solution, state: solutionState },
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
