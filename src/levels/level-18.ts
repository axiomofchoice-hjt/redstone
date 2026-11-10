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
 * 第十八关的设计意图：**用逻辑门做出交叉的效果，而不是用地形跨过去**。
 *
 * 导线只要贴边就连在一起，两条线在同一个平面上没法直穿过去；交叉元件正是为这种
 * 情况准备的，所以这一关故意把它从 `tools` 里去掉。玩家要做的是「换位」而不是
 * 「跨越」：A、B 在左边上下对角，C、D 在右边上下对角，要求 C = B、D = A 的稳态。
 *
 * 参考解用一次异或搭出中间量：X = A XOR B 走中间，C = A XOR X = B、D = B XOR X = A，
 * 两条线谁都不用真的跨过谁。测试只看 4 种输入组合跑稳之后的输出（tick 10～20），
 * 不限定延迟，所以任何等价电路都算过。
 *
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

/** 取 A=0、B=0 跑稳之后的状态，盖上去 C=0、D=0（tick 60）；每行一条，key 是行优先下标 */
const solutionState = stateFrom(
  { tick: 60, inputs: { A: 0, B: 0 }, outputs: { C: 0, D: 0 } },
  {
    32: 1, 33: 3, 34: 3, 35: 1,
    52: 3, 53: 1,
    63: 1, 64: 3, 65: 3, 66: 1, 72: 1, 73: 3, 74: 3, 75: 1,
    83: 3, 84: 1,
    103: 1, 104: 3, 105: 3, 106: 1, 112: 1, 113: 3, 114: 3, 115: 1,
    132: 3, 133: 1,
    152: 1, 153: 3, 154: 3, 155: 1,
  },
)

/**
 * 第十八关：交叉（20 列 × 10 行）。两条信号要交换到对角，只给导线、充能器、中继器、非门，
 * 故意不给交叉元件——这一关考的是用逻辑门等价出「交叉」，不是让线真的穿过去。
 */
export const level18: Level = {
  id: 'level-18',
  no: 18,
  name: '交叉',
  brief: '把左上、左下的 A、B 交换到右边对角：C = B，D = A。\n信号跑稳后检查，不限延迟。这关没有交叉导线，要用逻辑门做出交叉的效果。',
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
