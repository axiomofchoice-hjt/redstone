import type { Cell, Level, PairCheck } from '../game/types'
import { cellsFrom, stateFrom } from './solution-helpers'

const cols = 10
const rows = 10
// 输入 T、输出 Y 都由玩家自己放
const cells: (Cell | null)[] = new Array(cols * rows).fill(null)

/**
 * 参考解：布局来自导出的地图。中继器把 T 晚几拍，上升沿那一拍按反馈回来的 Y 翻转。
 */
const solution = cellsFrom(cols * rows, {
  // 第 0 行
  0: { type: 'input', id: 'T' },
  2: { type: 'wire' },
  3: { type: 'charger', dir: 1 },
  4: { type: 'not', dir: 1 },
  5: { type: 'wire' },
  6: { type: 'wire' },
  7: { type: 'wire' },
  // 第 1 行
  10: { type: 'charger', dir: 2 },
  12: { type: 'wire' },
  14: { type: 'charger', dir: 0 },
  17: { type: 'charger', dir: 2 },
  // 第 2 行
  20: { type: 'not', dir: 2 },
  21: { type: 'wire' },
  22: { type: 'wire' },
  24: { type: 'not', dir: 0 },
  25: { type: 'charger', dir: 3 },
  26: { type: 'wire' },
  27: { type: 'not', dir: 0 },
  // 第 3 行
  30: { type: 'repeater', dir: 2 },
  32: { type: 'wire' },
  36: { type: 'charger', dir: 2 },
  37: { type: 'charger', dir: 0 },
  // 第 4 行
  40: { type: 'repeater', dir: 2 },
  42: { type: 'wire' },
  44: { type: 'wire' },
  45: { type: 'charger', dir: 1 },
  46: { type: 'not', dir: 0 },
  47: { type: 'wire' },
  48: { type: 'output', id: 'Y' },
  // 第 5 行
  50: { type: 'not', dir: 2 },
  51: { type: 'wire' },
  52: { type: 'wire' },
  54: { type: 'wire' },
  57: { type: 'charger', dir: 2 },
  // 第 6 行
  62: { type: 'wire' },
  63: { type: 'charger', dir: 1 },
  64: { type: 'not', dir: 2 },
  65: { type: 'charger', dir: 3 },
  66: { type: 'wire' },
  67: { type: 'not', dir: 0 },
})

/** 导出时的一刻：T=1，Y=0（tick 138） */
const solutionState = stateFrom(
  { tick: 138, inputs: { T: 1 }, outputs: { Y: 0 } },
  {
    0: 1,
    2: 3,
    3: 1,
    10: 1,
    12: 3,
    21: 3,
    22: 3,
    25: 1,
    26: 3,
    27: 1,
    32: 3,
    36: 1,
    42: 3,
    50: 1,
    51: 3,
    52: 3,
    62: 3,
    63: 1,
    65: 1,
    66: 3,
    67: 1,
  },
)

/** 每组都先把 T 设一遍，免得接上玩家当前开着的输入 */
const reset = (values: { T: 0 | 1 }) => ({ tick: 0, values })

/** 两个时刻必须相反：中间跨过一个上升沿，Y 应该翻一次 */
const flip = (before: number, after: number): PairCheck => ({
  output: 'Y',
  ticks: [before, after],
  allow: [
    [0, 1],
    [1, 0],
  ],
})

/** 两个时刻必须相同：没跨上升沿，Y 应该保持 */
const hold = (a: number, b: number): PairCheck => ({
  output: 'Y',
  ticks: [a, b],
  allow: [
    [0, 0],
    [1, 1],
  ],
})

/**
 * 第十八关：T 触发器。T 每来一个上升沿（0→1），Y 翻转一次；
 * 没有上升沿时就保持——T 一直高着不会连着翻，下降沿也不动。
 * 初始是 0 还是 1 不关心，所以整关都用成对检查，只看两个时刻是翻转还是保持。
 *
 * 每组都从 T=0 起、第一次上升沿放在第 20 tick，这样从编辑器里任意状态点
 * 「运行测试」，边沿前后该翻还是该保持都不受起点影响。
 */
export const level18: Level = {
  id: 'level-18',
  no: 18,
  name: 'T 触发器',
  cols,
  rows,
  inputs: ['T'],
  outputs: ['Y'],
  cells,
  solution: { cells: solution, state: solutionState },
  tests: [
    {
      name: '每个上升沿翻一次，T 一直高着也只翻一次',
      events: [
        reset({ T: 0 }),
        { tick: 20, values: { T: 1 } },
        { tick: 60, values: { T: 0 } },
        { tick: 80, values: { T: 1 } },
        { tick: 120, values: { T: 0 } },
        { tick: 140, values: { T: 1 } },
      ],
      pairs: [
        flip(10, 30),
        // T 从第 20 tick 起一直高着
        hold(30, 50),
        flip(70, 90),
        hold(90, 110),
        flip(130, 150),
        hold(150, 170),
      ],
    },
    {
      name: 'T 一直是 0 就一直保持',
      events: [reset({ T: 0 })],
      pairs: [hold(10, 30), hold(30, 50), hold(50, 70), hold(70, 90), hold(90, 110), hold(110, 130)],
    },
    {
      name: '窄脉冲也只翻一次，下降沿不动',
      events: [
        reset({ T: 0 }),
        { tick: 20, values: { T: 1 } },
        { tick: 30, values: { T: 0 } },
        { tick: 40, values: { T: 1 } },
        { tick: 50, values: { T: 0 } },
        { tick: 80, values: { T: 1 } },
      ],
      pairs: [
        // 第 20 tick 的窄脉冲：上升沿翻一次
        flip(10, 25),
        // 第 30 tick 的下降沿不动
        hold(25, 35),
        // 第 40 tick 的上升沿再翻一次
        flip(35, 45),
        // 第 50 tick 之后 T 一直是 0
        hold(45, 75),
        flip(75, 95),
        hold(95, 115),
      ],
    },
    {
      name: 'T 一直高着，隔多久也只翻一次',
      events: [reset({ T: 0 }), { tick: 20, values: { T: 1 } }, { tick: 140, values: { T: 0 } }],
      pairs: [
        flip(10, 30),
        hold(30, 100),
        hold(100, 130),
        // 第 140 tick 的下降沿不动
        hold(130, 150),
      ],
    },
  ],
}
