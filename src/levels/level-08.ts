import type { Cell, Level, PairCheck } from '../game/types'
import { cellsFrom, stateFrom } from './solution-helpers'

const cols = 10
const rows = 10
// 一个输出 Y 由玩家自己放，没有输入
const cells: (Cell | null)[] = new Array(cols * rows).fill(null)

/**
 * 参考解：中继器读左边的导线、往右把非门翻一下，非门再往右送 Y，
 * 同时从下面把结果灌回左边那条导线，绕一圈正好 2 tick，所以导线 2 tick 高、2 tick 低。
 */
const solution = cellsFrom(cols * rows, {
  // 第 0 行：左边导线 → 中继器 → 非门 → 右边导线接 Y
  0: { type: 'wire' },
  1: { type: 'repeater', dir: 1 },
  2: { type: 'not', dir: 1 },
  3: { type: 'wire' },
  4: { type: 'output', id: 'Y' },
  // 第 1 行：导线把非门的输出接回左边那条导线
  10: { type: 'wire' },
  11: { type: 'wire' },
  12: { type: 'wire' },
})

/** 导出时的一刻：时钟正在低电平，全灭（tick 39） */
const solutionState = stateFrom({ tick: 39, inputs: {}, outputs: { Y: 0 } })

/**
 * 时钟：同一条输出隔 2 tick 必须相反，隔 4 tick 必须相同。
 * 两种相位（先高或先低）都算对，所以不写死每个 tick 的电平。
 */
const opposite = (t: number): PairCheck => ({
  output: 'Y',
  ticks: [t, t + 2],
  allow: [
    [0, 1],
    [1, 0],
  ],
})

const same = (t: number): PairCheck => ({
  output: 'Y',
  ticks: [t, t + 4],
  allow: [
    [0, 0],
    [1, 1],
  ],
})

const range = (from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, i) => from + i)

/** 从第 10 tick 起振荡器已经进入稳态，之后逐个间隔写死要检查的时刻对 */
const pairs: PairCheck[] = [
  ...range(10, 18).map(opposite),
  ...range(10, 16).map(same),
]

/** 第八关：时钟，2 tick 高、2 tick 低，循环 */
export const level08: Level = {
  id: 'level-08',
  no: 8,
  name: '时钟',
  brief: '没有输入，让 Y 自己振荡：2 tick 高、2 tick 低，一直循环。\n输出 Y 的位置自己定，先高先低都可以。',
  cols,
  rows,
  outputs: ['Y'],
  cells,
  solution: { cells: solution, state: solutionState },
  tests: [{ name: '2 tick 高、2 tick 低，循环', pairs }],
}
