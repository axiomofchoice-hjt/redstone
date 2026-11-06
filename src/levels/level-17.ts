import type { Cell, Level } from '../game/types'
import { cellsFrom, stateFrom } from './solution-helpers'

const cols = 10
const rows = 10
// 输入 J / K / C、输出 Y 都由玩家自己放
const cells: (Cell | null)[] = new Array(cols * rows).fill(null)

/**
 * 参考解：布局来自导出的地图。中继器把时钟晚几拍，在上升沿那一拍按 J、K
 * 和反馈回来的 Y 改锁存器。
 */
const solution = cellsFrom(cols * rows, {
  // 第 0 行
  1: { type: 'input', id: 'J' },
  2: { type: 'charger', dir: 1 },
  3: { type: 'not', dir: 1 },
  // 第 1 行
  10: { type: 'input', id: 'C' },
  13: { type: 'wire' },
  14: { type: 'charger', dir: 1 },
  15: { type: 'not', dir: 1 },
  16: { type: 'wire' },
  17: { type: 'wire' },
  18: { type: 'wire' },
  // 第 2 行
  20: { type: 'charger', dir: 2 },
  23: { type: 'charger', dir: 0 },
  25: { type: 'charger', dir: 0 },
  28: { type: 'charger', dir: 2 },
  // 第 3 行
  30: { type: 'not', dir: 2 },
  31: { type: 'wire' },
  32: { type: 'wire' },
  33: { type: 'wire' },
  35: { type: 'not', dir: 1 },
  36: { type: 'charger', dir: 3 },
  37: { type: 'wire' },
  38: { type: 'not', dir: 1 },
  // 第 4 行
  40: { type: 'repeater', dir: 2 },
  41: { type: 'wire' },
  43: { type: 'wire' },
  47: { type: 'charger', dir: 2 },
  48: { type: 'charger', dir: 0 },
  // 第 5 行
  50: { type: 'repeater', dir: 2 },
  51: { type: 'wire' },
  53: { type: 'wire' },
  55: { type: 'wire' },
  56: { type: 'charger', dir: 1 },
  57: { type: 'not', dir: 1 },
  58: { type: 'wire' },
  59: { type: 'output', id: 'Y' },
  // 第 6 行
  60: { type: 'not', dir: 0 },
  61: { type: 'wire' },
  63: { type: 'charger', dir: 2 },
  65: { type: 'wire' },
  68: { type: 'charger', dir: 2 },
  // 第 7 行
  73: { type: 'wire' },
  74: { type: 'charger', dir: 1 },
  75: { type: 'not', dir: 1 },
  76: { type: 'charger', dir: 3 },
  77: { type: 'wire' },
  78: { type: 'not', dir: 1 },
  // 第 8 行
  81: { type: 'input', id: 'K' },
  82: { type: 'charger', dir: 1 },
  83: { type: 'not', dir: 1 },
})

/** 导出时的一刻：J、K、C 都是 0，Y=0（tick 255） */
const solutionState = stateFrom(
  { tick: 255, inputs: { J: 0, C: 0, K: 0 }, outputs: { Y: 0 } },
  {
    3: 1,
    13: 3,
    14: 1,
    23: 1,
    30: 1,
    31: 3,
    32: 3,
    33: 3,
    36: 1,
    37: 3,
    38: 1,
    40: 1,
    41: 3,
    43: 3,
    47: 1,
    50: 1,
    51: 3,
    53: 3,
    61: 3,
    63: 1,
    73: 3,
    74: 1,
    76: 1,
    77: 3,
    78: 1,
    83: 1,
  },
)

/** 每组都先把 J、K、C 都设一遍，免得接上玩家当前开着的输入 */
const reset = (values: { J: 0 | 1; K: 0 | 1; C: 0 | 1 }) => ({ tick: 0, values })

/**
 * 第十七关：JK 触发器。只在时钟 C 的上升沿按当时（拉高那一刻）的 J、K 改 Y：
 * J=1、K=0 置 1，J=0、K=1 清 0，J=K=0 保持，J=K=1 翻转。
 * 下降沿不动；C 不动时 J、K 怎么变都不影响 Y，C 一直高着也只在上升沿动一次。
 *
 * 每组都从 C=0 起，第一次上升沿放在第 20 tick：从编辑器里任意状态点「运行测试」
 * 时，C 之前是高是低都不影响第一次边沿之前的结果，检查一律从边沿后第 10 tick 开始。
 */
export const level17: Level = {
  id: 'level-17',
  no: 17,
  name: 'JK 触发器',
  cols,
  rows,
  inputs: ['J', 'K', 'C'],
  outputs: ['Y'],
  cells,
  solution: { cells: solution, state: solutionState },
  tests: [
    {
      name: '上升沿置位、复位，之后保持',
      events: [
        reset({ J: 1, K: 0, C: 0 }),
        { tick: 20, values: { C: 1 } },
        { tick: 40, values: { J: 0, K: 1, C: 0 } },
        { tick: 60, values: { C: 1 } },
        { tick: 80, values: { J: 1, K: 0, C: 0 } },
        { tick: 100, values: { C: 1 } },
      ],
      checks: [
        { from: 30, to: 39, outputs: { Y: 1 } },
        { from: 50, to: 59, outputs: { Y: 1 } },
        { from: 70, to: 79, outputs: { Y: 0 } },
        { from: 90, to: 99, outputs: { Y: 0 } },
        { from: 110, to: 120, outputs: { Y: 1 } },
      ],
    },
    {
      name: 'C 高电平期间改 J、K 都不跟，下降沿也不动',
      events: [
        reset({ J: 1, K: 0, C: 0 }),
        { tick: 20, values: { C: 1 } },
        { tick: 40, values: { J: 0, K: 1 } },
        { tick: 60, values: { J: 1, K: 1 } },
        { tick: 80, values: { C: 0 } },
        { tick: 100, values: { J: 0, K: 1 } },
        { tick: 120, values: { C: 1 } },
      ],
      checks: [
        { from: 30, to: 39, outputs: { Y: 1 } },
        { from: 50, to: 59, outputs: { Y: 1 } },
        { from: 70, to: 79, outputs: { Y: 1 } },
        { from: 90, to: 99, outputs: { Y: 1 } },
        { from: 110, to: 119, outputs: { Y: 1 } },
        { from: 130, to: 140, outputs: { Y: 0 } },
      ],
    },
    {
      name: 'J=K=1 时每个上升沿翻一次，C 一直高着也只翻一次',
      events: [
        reset({ J: 0, K: 1, C: 0 }),
        { tick: 20, values: { C: 1 } },
        { tick: 40, values: { J: 1, K: 1, C: 0 } },
        { tick: 60, values: { C: 1 } },
        { tick: 80, values: { C: 0 } },
        { tick: 100, values: { C: 1 } },
        { tick: 120, values: { C: 0 } },
        { tick: 140, values: { C: 1 } },
      ],
      checks: [
        { from: 30, to: 39, outputs: { Y: 0 } },
        { from: 50, to: 59, outputs: { Y: 0 } },
        { from: 70, to: 79, outputs: { Y: 1 } },
        { from: 90, to: 99, outputs: { Y: 1 } },
        { from: 110, to: 119, outputs: { Y: 0 } },
        { from: 130, to: 139, outputs: { Y: 0 } },
        // C 从第 140 tick 起一直高着
        { from: 150, to: 200, outputs: { Y: 1 } },
      ],
    },
    {
      name: 'J、K 先改好，等下一个上升沿才生效',
      events: [
        reset({ J: 0, K: 1, C: 0 }),
        { tick: 20, values: { C: 1 } },
        { tick: 40, values: { J: 0, K: 0, C: 0 } },
        { tick: 60, values: { J: 1, K: 0 } },
        { tick: 80, values: { C: 1 } },
        { tick: 100, values: { J: 0, K: 1 } },
        { tick: 120, values: { C: 0 } },
        { tick: 140, values: { C: 1 } },
      ],
      checks: [
        { from: 30, to: 39, outputs: { Y: 0 } },
        { from: 50, to: 59, outputs: { Y: 0 } },
        { from: 70, to: 79, outputs: { Y: 0 } },
        { from: 90, to: 99, outputs: { Y: 1 } },
        { from: 110, to: 119, outputs: { Y: 1 } },
        { from: 130, to: 139, outputs: { Y: 1 } },
        { from: 150, to: 160, outputs: { Y: 0 } },
      ],
    },
  ],
}
