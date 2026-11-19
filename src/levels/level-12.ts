import type { Cell, InputEvent, Level } from '../game/types'
import { cellsFrom, stateFrom } from './solution-helpers'

const cols = 10
const rows = 10
// 输入 A、输出 Y 都由玩家自己放
const cells: (Cell | null)[] = new Array(cols * rows).fill(null)

/**
 * 参考解：先取 P = A(t-2) ∧ A(t-3) ∧ A(t-4)——连续 3 tick 都是 1 才算够宽，
 * 再把 P 和它晚 1、2 tick 的拷贝相或，把判定时截掉的前 2 tick 补回来。
 * 宽度不足 3 tick 的脉冲 P 一直是 0；够宽的脉冲原样通过（晚 5 tick、宽度不变）。
 * 只看首尾两拍（A(t-3) ∧ A(t-5)）不够：`1 0 1` 这种中间断开的窄脉冲也会被放过去。
 */
const solution = cellsFrom(cols * rows, {
  0: { type: 'input', id: 'A' },
  1: { type: 'wire' },
  2: { type: 'wire' },
  3: { type: 'wire' },
  4: { type: 'wire' },
  5: { type: 'wire' },
  6: { type: 'wire' },
  12: { type: 'repeater', dir: 2 },
  15: { type: 'charger', dir: 2 },
  22: { type: 'wire' },
  23: { type: 'charger', dir: 1 },
  24: { type: 'not', dir: 2 },
  25: { type: 'not', dir: 2 },
  26: { type: 'wire' },
  32: { type: 'repeater', dir: 2 },
  34: { type: 'wire' },
  35: { type: 'wire' },
  36: { type: 'wire' },
  42: { type: 'wire' },
  43: { type: 'charger', dir: 1 },
  44: { type: 'not', dir: 2 },
  45: { type: 'wire' },
  48: { type: 'output', id: 'Y' },
  54: { type: 'wire' },
  55: { type: 'wire' },
  58: { type: 'repeater', dir: 0 },
  65: { type: 'charger', dir: 2 },
  67: { type: 'wire' },
  68: { type: 'wire' },
  69: { type: 'wire' },
  75: { type: 'not', dir: 2 },
  77: { type: 'charger', dir: 0 },
  79: { type: 'wire' },
  83: { type: 'wire' },
  84: { type: 'charger', dir: 3 },
  85: { type: 'wire' },
  86: { type: 'repeater', dir: 1 },
  87: { type: 'wire' },
  88: { type: 'repeater', dir: 1 },
  89: { type: 'wire' },
  93: { type: 'wire' },
  94: { type: 'wire' },
  95: { type: 'cross' },
  96: { type: 'wire' },
  97: { type: 'cross' },
  98: { type: 'wire' },
  99: { type: 'wire' },
})

/** A=0 跑稳之后的一刻：Y=0（tick 60） */
const solutionState = stateFrom(
  { tick: 60, inputs: { A: 0 }, outputs: { Y: 0 } },
  {
    24: 1,
    25: 1,
    26: 3,
    34: 3,
    35: 3,
    36: 3,
    44: 1,
    45: 3,
    54: 3,
    55: 3,
    65: 1,
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
  brief: '只放行宽度 3 tick 及以上的脉冲：1、2 tick 的窄脉冲直接吞掉。\n通过的脉冲晚 5 tick 出现，宽度不变。\n输入 A 和输出 Y 的位置自己定。',
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
