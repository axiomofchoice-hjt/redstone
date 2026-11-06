import type { Cell, Level } from '../game/types'
import { stateFrom } from './solution-helpers'

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
 * 参考解：X = A XOR B 走中间，C = A XOR X = B、D = B XOR X = A，两条线谁都不用真的跨过谁。
 * 一行 20 格，`-` 导线、`>` 朝右的充能器、`!` 朝右的非门、`.` 空格，字母是四个角的端口。
 */
const SOLUTION_GRID = [
  'A..................C',
  '----------->!-->!..-',
  '-...........->!.----',
  '-->!-->!..->!-->!...',
  '...->!.----.........',
  '-->!-->!..->!-->!...',
  '-...........->!.----',
  '----------->!-->!..-',
  '-..................-',
  'B..................D',
]

const cellFromChar = (char: string): Cell | null => {
  switch (char) {
    case '-':
      return { type: 'wire' }
    case '>':
      return { type: 'charger', dir: 1 }
    case '!':
      return { type: 'not', dir: 1 }
    case 'A':
      return { type: 'input', id: 'A', locked: true }
    case 'B':
      return { type: 'input', id: 'B', locked: true }
    case 'C':
      return { type: 'output', id: 'C', locked: true }
    case 'D':
      return { type: 'output', id: 'D', locked: true }
    default:
      return null
  }
}

const parseGrid = (grid: string[]): (Cell | null)[] => {
  const out: (Cell | null)[] = new Array(cols * rows).fill(null)
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) out[at(x, y)] = cellFromChar(grid[y][x])
  }
  return out
}

const solution = parseGrid(SOLUTION_GRID)

/** 取 A=0、B=1 跑稳之后的状态，盖上去 C=1、D=0；每行一条，key 是行优先下标 */
const solutionState = stateFrom(
  cols * rows,
  { tick: 20, inputs: { A: 0, B: 1 }, outputs: { C: 1, D: 0 } },
  {
    19: 1,
    32: 1, 33: 3, 34: 3, 35: 1, 39: 3,
    52: 3, 53: 1, 56: 3, 57: 3, 58: 3, 59: 3,
    63: 1, 64: 3, 65: 3, 66: 1, 70: 3, 71: 1, 76: 1,
    83: 3, 84: 1, 87: 3, 88: 3, 89: 3, 90: 3,
    100: 3, 101: 3, 102: 1, 107: 1, 110: 3, 111: 1, 113: 3, 114: 3, 115: 1,
    120: 3, 134: 1,
    140: 3, 141: 3, 142: 3, 143: 3, 144: 3, 145: 3, 146: 3, 147: 3, 148: 3, 149: 3, 150: 3, 151: 1,
    153: 3, 154: 3, 155: 1,
    160: 3,
    180: 1,
  },
)

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
  solution: { cells: solution, state: solutionState },
  tests: [
    {
      name: '0 0 → 0 0',
      events: [{ tick: 0, values: { A: 0, B: 0 } }],
      checks: [{ from: 10, to: 20, outputs: { C: 0, D: 0 } }],
    },
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
