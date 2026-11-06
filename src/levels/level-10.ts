import type { Cell, Level } from '../game/types'

const cols = 10
const rows = 10
// 输入 A、输出 Y 都由玩家自己放
const cells: (Cell | null)[] = new Array(cols * rows).fill(null)

/**
 * 第十关：上升沿感应器。A 从 0 变 1 的那一拍之后第 5 tick，Y 出 1 tick 脉冲，其余时候 Y = 0。
 */
export const level10: Level = {
  id: 'level-10',
  no: 10,
  name: '上升沿感应器',
  cols,
  rows,
  inputs: ['A'],
  outputs: ['Y'],
  cells,
  tests: [
    {
      name: '上升沿 → 1 tick 脉冲',
      events: [{ tick: 5, values: { A: 1 } }],
      checks: [
        { from: 0, to: 9, outputs: { Y: 0 } },
        { from: 10, outputs: { Y: 1 } },
        { from: 11, to: 20, outputs: { Y: 0 } },
      ],
    },
    {
      name: '下降沿不出脉冲',
      events: [
        { tick: 0, values: { A: 1 } },
        { tick: 10, values: { A: 0 } },
      ],
      checks: [
        { from: 0, to: 4, outputs: { Y: 0 } },
        { from: 5, outputs: { Y: 1 } },
        { from: 6, to: 20, outputs: { Y: 0 } },
      ],
    },
    {
      name: '两个上升沿各出一个脉冲',
      events: [
        { tick: 5, values: { A: 1 } },
        { tick: 9, values: { A: 0 } },
        { tick: 13, values: { A: 1 } },
      ],
      checks: [
        { from: 0, to: 9, outputs: { Y: 0 } },
        { from: 10, outputs: { Y: 1 } },
        { from: 11, to: 17, outputs: { Y: 0 } },
        { from: 18, outputs: { Y: 1 } },
        { from: 19, to: 25, outputs: { Y: 0 } },
      ],
    },
  ],
}
