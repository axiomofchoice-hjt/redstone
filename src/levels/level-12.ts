import type { Cell, InputEvent, Level } from '../game/types'
import { cellsFrom, stateFrom } from './solution-helpers'

const cols = 10
const rows = 10
// 输入 A、输出 Y 都由玩家自己放
const cells: (Cell | null)[] = new Array(cols * rows).fill(null)

/**
 * 参考解：用三路不同延迟的支路判断 A 有没有连续 3 tick 为 1，判定出宽脉冲后
 * 再展宽 2 tick 把截掉的前沿补回来；宽度不足 3 tick 的脉冲被吞掉，够宽的
 * 脉冲原样通过（晚 5 tick、宽度不变）。只占 10×10 的上 4 行。
 * 只看首尾两拍（A(t-3) ∧ A(t-5)）不够：`1 0 1` 这种中间断开的窄脉冲也会被放过去。
 */
const solution = cellsFrom(cols * rows, {
  0: { type: 'input', id: 'A' },
  1: { type: 'charger', dir: 1 },
  2: { type: 'charger', dir: 1 },
  3: { type: 'not', dir: 1 },
  4: { type: 'wire' },
  5: { type: 'repeater', dir: 1 },
  6: { type: 'not', dir: 1 },
  7: { type: 'wire' },
  8: { type: 'wire' },
  9: { type: 'wire' },
  10: { type: 'wire' },
  11: { type: 'repeater', dir: 1 },
  12: { type: 'charger', dir: 1 },
  13: { type: 'not', dir: 1 },
  14: { type: 'wire' },
  16: { type: 'wire' },
  17: { type: 'repeater', dir: 1 },
  18: { type: 'charger', dir: 1 },
  19: { type: 'wire' },
  20: { type: 'wire' },
  21: { type: 'repeater', dir: 1 },
  22: { type: 'repeater', dir: 1 },
  23: { type: 'not', dir: 1 },
  24: { type: 'wire' },
  26: { type: 'wire' },
  27: { type: 'repeater', dir: 1 },
  28: { type: 'repeater', dir: 1 },
  29: { type: 'wire' },
  39: { type: 'output', id: 'Y' },
})

/** A=0 跑稳之后的一刻：Y=0（tick 375） */
const solutionState = stateFrom(
  { tick: 375, inputs: { A: 0 }, outputs: { Y: 0 } },
  {
    3: 1,
    4: 3,
    5: 1,
    13: 1,
    14: 3,
    23: 1,
    24: 3,
  },
)

/** 从第 15 tick 起按位给出 A 的波形，前面保持 A=0 */
const pulses = (bits: string): InputEvent[] => [
  { tick: 0, values: { A: 0 } },
  ...[...bits].map((bit, i): InputEvent => ({ tick: 15 + i, values: { A: bit === '1' ? 1 : 0 } })),
]

/**
 * 第十二关：脉冲过滤器。宽度 1～2 tick 的脉冲被吃掉，3 tick 及以上的原样通过，
 * 只是整体晚 5 tick（前沿晚 5，宽度不变）。
 */
export const level12: Level = {
  id: 'level-12',
  no: 12,
  name: '脉冲过滤器',
  brief: '放行宽度 3 tick 及以上的脉冲，并延迟 5 tick 输出到 Y；1、2 tick 的窄脉冲直接吞掉。',
  cols,
  rows,
  inputs: ['A'],
  outputs: ['Y'],
  cells,
  solution: { cells: solution, state: solutionState },
  tests: [
    {
      name: '1 tick 脉冲不输出',
      // 前 10 tick 保持 A=0，把延迟链里可能残留的 1 先冲掉；玩家带着 A=1 点测试也能过
      events: [
        { tick: 0, values: { A: 0 } },
        { tick: 15, values: { A: 1 } },
        { tick: 16, values: { A: 0 } },
      ],
      checks: [{ from: 10, to: 30, outputs: { Y: 0 } }],
    },
    {
      name: '2 tick 脉冲不输出',
      events: [
        { tick: 0, values: { A: 0 } },
        { tick: 15, values: { A: 1 } },
        { tick: 17, values: { A: 0 } },
      ],
      checks: [{ from: 10, to: 30, outputs: { Y: 0 } }],
    },
    {
      name: '3 tick 脉冲通过',
      events: [
        { tick: 0, values: { A: 0 } },
        { tick: 15, values: { A: 1 } },
        { tick: 18, values: { A: 0 } },
      ],
      checks: [
        { from: 10, to: 19, outputs: { Y: 0 } },
        { from: 20, to: 22, outputs: { Y: 1 } },
        { from: 23, to: 33, outputs: { Y: 0 } },
      ],
    },
    {
      name: '5 tick 脉冲宽度不变',
      events: [
        { tick: 0, values: { A: 0 } },
        { tick: 15, values: { A: 1 } },
        { tick: 20, values: { A: 0 } },
      ],
      checks: [
        { from: 10, to: 19, outputs: { Y: 0 } },
        { from: 20, to: 24, outputs: { Y: 1 } },
        { from: 25, to: 35, outputs: { Y: 0 } },
      ],
    },
    {
      // 只看首尾两拍的电路会把 1 0 1 当成 3 tick 宽的脉冲放过去
      name: '两个 1 tick 脉冲隔 1 tick 不输出',
      events: pulses('1010'),
      checks: [{ from: 10, to: 30, outputs: { Y: 0 } }],
    },
    {
      name: '两个 2 tick 脉冲隔 1 tick 不输出',
      events: pulses('110110'),
      checks: [{ from: 10, to: 32, outputs: { Y: 0 } }],
    },
    {
      name: '宽脉冲后紧跟窄脉冲，只放行宽的',
      events: pulses('111010'),
      checks: [
        { from: 10, to: 19, outputs: { Y: 0 } },
        { from: 20, to: 22, outputs: { Y: 1 } },
        { from: 23, to: 35, outputs: { Y: 0 } },
      ],
    },
  ],
}
