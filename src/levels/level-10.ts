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
      // 先 A=0 空跑几拍，电路预热好再给上升沿
      events: [
        { tick: 0, values: { A: 0 } },
        { tick: 12, values: { A: 1 } },
      ],
      checks: [
        { from: 8, to: 16, outputs: { Y: 0 } },
        { from: 17, outputs: { Y: 1 } },
        { from: 18, to: 26, outputs: { Y: 0 } },
      ],
    },
    {
      name: '下降沿不出脉冲',
      events: [
        { tick: 0, values: { A: 0 } },
        { tick: 12, values: { A: 1 } },
        { tick: 18, values: { A: 0 } },
      ],
      checks: [
        { from: 8, to: 16, outputs: { Y: 0 } },
        { from: 17, outputs: { Y: 1 } },
        { from: 18, to: 30, outputs: { Y: 0 } },
      ],
    },
    {
      name: '两个上升沿各出一个脉冲',
      events: [
        { tick: 0, values: { A: 0 } },
        { tick: 12, values: { A: 1 } },
        { tick: 16, values: { A: 0 } },
        { tick: 20, values: { A: 1 } },
      ],
      checks: [
        { from: 8, to: 16, outputs: { Y: 0 } },
        { from: 17, outputs: { Y: 1 } },
        { from: 18, to: 24, outputs: { Y: 0 } },
        { from: 25, outputs: { Y: 1 } },
        { from: 26, to: 32, outputs: { Y: 0 } },
      ],
    },
  ],
}
