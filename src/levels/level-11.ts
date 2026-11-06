import type { Cell, Level } from '../game/types'

const cols = 10
const rows = 10
// 输入 A、输出 Y 都由玩家自己放
const cells: (Cell | null)[] = new Array(cols * rows).fill(null)

/**
 * 第十一关：脉冲延长器。每个脉冲宽度加 2 tick：前沿跟输入同拍，尾巴晚 2 tick。
 */
export const level11: Level = {
  id: 'level-11',
  no: 11,
  name: '脉冲延长器',
  cols,
  rows,
  inputs: ['A'],
  outputs: ['Y'],
  cells,
  tests: [
    {
      name: '1 tick 脉冲变 3 tick',
      events: [
        { tick: 5, values: { A: 1 } },
        { tick: 6, values: { A: 0 } },
      ],
      checks: [
        { from: 0, to: 4, outputs: { Y: 0 } },
        { from: 5, to: 7, outputs: { Y: 1 } },
        { from: 8, to: 15, outputs: { Y: 0 } },
      ],
    },
    {
      name: '3 tick 脉冲变 5 tick',
      events: [
        { tick: 5, values: { A: 1 } },
        { tick: 8, values: { A: 0 } },
      ],
      checks: [
        { from: 0, to: 4, outputs: { Y: 0 } },
        { from: 5, to: 9, outputs: { Y: 1 } },
        { from: 10, to: 20, outputs: { Y: 0 } },
      ],
    },
    {
      name: '两个脉冲不会粘成一个',
      events: [
        { tick: 5, values: { A: 1 } },
        { tick: 6, values: { A: 0 } },
        { tick: 9, values: { A: 1 } },
        { tick: 10, values: { A: 0 } },
      ],
      checks: [
        { from: 0, to: 4, outputs: { Y: 0 } },
        { from: 5, to: 7, outputs: { Y: 1 } },
        { from: 8, outputs: { Y: 0 } },
        { from: 9, to: 11, outputs: { Y: 1 } },
        { from: 12, to: 20, outputs: { Y: 0 } },
      ],
    },
  ],
}
