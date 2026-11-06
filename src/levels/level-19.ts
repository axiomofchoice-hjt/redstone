import type { Cell, InputEvent, Level } from '../game/types'

const cols = 12
const rows = 12
// 输入 P、输出 1～4 都由玩家自己放
const cells: (Cell | null)[] = new Array(cols * rows).fill(null)

/** 第 at tick 拉高、第 at + len tick 落回 0 的脉冲 */
const pulse = (at: number, len: number): InputEvent[] => [
  { tick: at, values: { P: 1 } },
  { tick: at + len, values: { P: 0 } },
]

/** 只有输出 on 是 1、另外三个是 0 */
const only = (on: '1' | '2' | '3' | '4'): Record<string, 0 | 1> => ({
  1: on === '1' ? 1 : 0,
  2: on === '2' ? 1 : 0,
  3: on === '3' ? 1 : 0,
  4: on === '4' ? 1 : 0,
})

/**
 * 第十九关：脉冲长度感应器。P 每来一个高电平持续 L 个 tick 的脉冲（L = 1～4），
 * 落回 0 之后把输出 L 置 1、另外三个清 0，一直保持到下一个脉冲结束；脉冲还高着的
 * 时候保持上一个结果。落沿后第 10 tick 起才开始查，前面几拍是电路自己的过渡时间。
 *
 * 每组都先把 P 设成 0、第一个脉冲放在第 20 tick：从编辑器里任意状态点「运行测试」
 * 时，前面 20 tick 的 0 足够把上一次留下的状态冲掉。
 */
export const level19: Level = {
  id: 'level-19',
  no: 19,
  name: '脉冲长度感应器',
  cols,
  rows,
  inputs: ['P'],
  outputs: ['1', '2', '3', '4'],
  cells,
  tests: [
    {
      name: 'P 高 1 tick → 只有输出 1',
      events: [{ tick: 0, values: { P: 0 } }, ...pulse(20, 1)],
      checks: [{ from: 31, to: 60, outputs: only('1') }],
    },
    {
      name: 'P 高 2 tick → 只有输出 2',
      events: [{ tick: 0, values: { P: 0 } }, ...pulse(20, 2)],
      checks: [{ from: 32, to: 60, outputs: only('2') }],
    },
    {
      name: 'P 高 3 tick → 只有输出 3',
      events: [{ tick: 0, values: { P: 0 } }, ...pulse(20, 3)],
      checks: [{ from: 33, to: 60, outputs: only('3') }],
    },
    {
      name: 'P 高 4 tick → 只有输出 4',
      events: [{ tick: 0, values: { P: 0 } }, ...pulse(20, 4)],
      checks: [{ from: 34, to: 60, outputs: only('4') }],
    },
    {
      name: '依次来 4、1、4、2 tick 的脉冲，高电平期间保持上一个结果',
      events: [
        { tick: 0, values: { P: 0 } },
        ...pulse(20, 4),
        ...pulse(83, 1),
        ...pulse(137, 4),
        ...pulse(205, 2),
      ],
      checks: [
        // 第 24 tick 落沿，第 83 tick 下一个脉冲才开始
        { from: 34, to: 83, outputs: only('4') },
        // 第 84 tick 落沿，第 94 tick 起查新结果；第 137 tick 起又高了
        { from: 94, to: 140, outputs: only('1') },
        // 第 141 tick 落沿，第 151 tick 起查新结果；第 205 tick 起又高了
        { from: 151, to: 206, outputs: only('4') },
        // 第 207 tick 落沿，第 217 tick 起查新结果
        { from: 217, to: 270, outputs: only('2') },
      ],
    },
  ],
}
