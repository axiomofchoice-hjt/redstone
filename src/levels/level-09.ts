import type { Cell, Level, PairCheck } from '../game/types'

const cols = 10
const rows = 10
// 一个输出 Y 由玩家自己放，没有输入
const cells: (Cell | null)[] = new Array(cols * rows).fill(null)

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

/** 第九关：时钟，2 tick 高、2 tick 低，循环 */
export const level09: Level = {
  id: 'level-09',
  no: 9,
  name: '时钟',
  cols,
  rows,
  outputs: ['Y'],
  cells,
  tests: [{ name: '2 tick 高、2 tick 低，循环', pairs }],
}
