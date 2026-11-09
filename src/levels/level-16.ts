import type { Cell, Level } from '../game/types'
import { cellsFrom, stateFrom } from './solution-helpers'

const cols = 10
const rows = 10
// 输入 D / E、输出 Y 都由玩家自己放
const cells: (Cell | null)[] = new Array(cols * rows).fill(null)

/**
 * 参考解：使能 E 控制的两个非门交叉反馈（D 锁存器）。
 * E 开着时 Y 跟着 D 走，E 关掉后把当时的电平锁住。
 */
const solution = cellsFrom(cols * rows, {
  // 第 0 行：D 进来，两路非门
  0: { type: 'input', id: 'D' },
  1: { type: 'charger', dir: 1 },
  2: { type: 'not', dir: 1 },
  3: { type: 'wire' },
  4: { type: 'wire' },
  5: { type: 'charger', dir: 1 },
  6: { type: 'not', dir: 3 },
  7: { type: 'charger', dir: 3 },
  8: { type: 'wire' },
  // 第 1 行：反馈回路
  12: { type: 'charger', dir: 0 },
  14: { type: 'charger', dir: 2 },
  16: { type: 'wire' },
  18: { type: 'wire' },
  // 第 2 行：E 这一路，和锁存的两个非门
  20: { type: 'input', id: 'E' },
  21: { type: 'charger', dir: 1 },
  22: { type: 'not', dir: 1 },
  23: { type: 'charger', dir: 1 },
  24: { type: 'not', dir: 1 },
  25: { type: 'wire' },
  26: { type: 'wire' },
  27: { type: 'charger', dir: 1 },
  28: { type: 'not', dir: 0 },
  // 第 3 行
  36: { type: 'output', id: 'Y' },
})

/** 导出时的一刻：D=0、E=0，锁着 0（tick 104） */
const solutionState = stateFrom(
  { tick: 104, inputs: { D: 0, E: 0 }, outputs: { Y: 0 } },
  {
    7: 1,
    8: 3,
    12: 1,
    18: 3,
    22: 1,
    23: 1,
    28: 1,
  },
)

/** 每组都先把 D、E 都设一遍，免得接上玩家当前开着的输入 */
const reset = (values: { D: 0 | 1; E: 0 | 1 }) => ({ tick: 0, values })

/**
 * 第十六关：D 锁存器。E 打开时 Y 跟着 D 走（D 变 1 变 0 都跟），
 * E 关掉后 Y 保持关掉那一刻的值，这时候 D 怎么变都不影响 Y。
 */
export const level16: Level = {
  id: 'level-16',
  no: 16,
  name: 'D 锁存器',
  brief: '',
  cols,
  rows,
  inputs: ['D', 'E'],
  outputs: ['Y'],
  cells,
  solution: { cells: solution, state: solutionState },
  tests: [
    {
      name: 'E 开着，Y 跟着 D 变',
      // 每次输入变化后都等 10 tick 再查
      events: [
        reset({ D: 1, E: 1 }),
        { tick: 20, values: { D: 0 } },
        { tick: 40, values: { D: 1 } },
      ],
      checks: [
        { from: 10, to: 19, outputs: { Y: 1 } },
        { from: 30, to: 39, outputs: { Y: 0 } },
        { from: 50, to: 70, outputs: { Y: 1 } },
      ],
    },
    {
      name: 'E 关着，D 怎么变都保持 1',
      events: [
        reset({ D: 1, E: 1 }),
        { tick: 20, values: { E: 0 } },
        { tick: 40, values: { D: 0 } },
        { tick: 60, values: { D: 1 } },
        { tick: 80, values: { D: 0 } },
      ],
      checks: [
        { from: 10, to: 19, outputs: { Y: 1 } },
        { from: 30, to: 39, outputs: { Y: 1 } },
        { from: 50, to: 59, outputs: { Y: 1 } },
        { from: 70, to: 79, outputs: { Y: 1 } },
        { from: 90, to: 100, outputs: { Y: 1 } },
      ],
    },
    {
      name: 'E 关着，D 怎么变都保持 0',
      events: [
        reset({ D: 0, E: 1 }),
        { tick: 20, values: { E: 0 } },
        { tick: 40, values: { D: 1 } },
        { tick: 60, values: { D: 0 } },
        { tick: 80, values: { D: 1 } },
      ],
      checks: [
        { from: 10, to: 19, outputs: { Y: 0 } },
        { from: 30, to: 39, outputs: { Y: 0 } },
        { from: 50, to: 59, outputs: { Y: 0 } },
        { from: 70, to: 79, outputs: { Y: 0 } },
        { from: 90, to: 100, outputs: { Y: 0 } },
      ],
    },
    {
      name: '锁住以后再开 E，跟上当下的 D',
      events: [
        reset({ D: 0, E: 1 }),
        { tick: 20, values: { E: 0 } },
        { tick: 40, values: { D: 1 } },
        { tick: 60, values: { E: 1 } },
        { tick: 80, values: { E: 0 } },
        { tick: 100, values: { D: 0 } },
        { tick: 120, values: { E: 1 } },
      ],
      checks: [
        { from: 10, to: 19, outputs: { Y: 0 } },
        { from: 30, to: 39, outputs: { Y: 0 } },
        { from: 50, to: 59, outputs: { Y: 0 } },
        { from: 70, to: 79, outputs: { Y: 1 } },
        { from: 90, to: 99, outputs: { Y: 1 } },
        { from: 110, to: 119, outputs: { Y: 1 } },
        { from: 130, to: 140, outputs: { Y: 0 } },
      ],
    },
  ],
}
