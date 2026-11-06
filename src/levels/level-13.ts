import type { Cell, Level } from '../game/types'

const cols = 10
const rows = 10
// 输入 A、输出 Y 都由玩家自己放
const cells: (Cell | null)[] = new Array(cols * rows).fill(null)

/**
 * 第十三关：脉冲过滤器。宽度 1～2 tick 的脉冲被吃掉，3 tick 及以上的原样通过，
 * 只是整体晚 4 tick（前沿晚 4，宽度不变）。
 */
export const level13: Level = {
  id: 'level-13',
  no: 13,
  name: '脉冲过滤器',
  cols,
  rows,
  inputs: ['A'],
  outputs: ['Y'],
  cells,
  tests: [
    {
      name: '1 tick 脉冲不输出',
      events: [
        { tick: 5, values: { A: 1 } },
        { tick: 6, values: { A: 0 } },
      ],
      checks: [{ from: 0, to: 20, outputs: { Y: 0 } }],
    },
    {
      name: '2 tick 脉冲不输出',
      events: [
        { tick: 5, values: { A: 1 } },
        { tick: 7, values: { A: 0 } },
      ],
      checks: [{ from: 0, to: 20, outputs: { Y: 0 } }],
    },
    {
      name: '3 tick 脉冲通过',
      events: [
        { tick: 5, values: { A: 1 } },
        { tick: 8, values: { A: 0 } },
      ],
      checks: [
        { from: 0, to: 8, outputs: { Y: 0 } },
        { from: 9, to: 11, outputs: { Y: 1 } },
        { from: 12, to: 22, outputs: { Y: 0 } },
      ],
    },
    {
      name: '5 tick 脉冲宽度不变',
      events: [
        { tick: 5, values: { A: 1 } },
        { tick: 10, values: { A: 0 } },
      ],
      checks: [
        { from: 0, to: 8, outputs: { Y: 0 } },
        { from: 9, to: 13, outputs: { Y: 1 } },
        { from: 14, to: 24, outputs: { Y: 0 } },
      ],
    },
  ],
}
