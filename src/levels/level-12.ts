import type { Cell, Level } from '../game/types'

const cols = 10
const rows = 10
// 输入 A、输出 Y 都由玩家自己放
const cells: (Cell | null)[] = new Array(cols * rows).fill(null)

/**
 * 第十二关：脉冲延迟器。整个脉冲往后挪 5 tick，宽度不变。
 */
export const level12: Level = {
  id: 'level-12',
  no: 12,
  name: '脉冲延迟器',
  cols,
  rows,
  inputs: ['A'],
  outputs: ['Y'],
  cells,
  tests: [
    {
      name: '1 tick 脉冲晚 5 tick',
      events: [
        { tick: 5, values: { A: 1 } },
        { tick: 6, values: { A: 0 } },
      ],
      checks: [
        { from: 0, to: 9, outputs: { Y: 0 } },
        { from: 10, outputs: { Y: 1 } },
        { from: 11, to: 18, outputs: { Y: 0 } },
      ],
    },
    {
      name: '3 tick 脉冲宽度不变',
      events: [
        { tick: 5, values: { A: 1 } },
        { tick: 8, values: { A: 0 } },
      ],
      checks: [
        { from: 0, to: 9, outputs: { Y: 0 } },
        { from: 10, to: 12, outputs: { Y: 1 } },
        { from: 13, to: 20, outputs: { Y: 0 } },
      ],
    },
    {
      name: '两个脉冲各晚 5 tick',
      events: [
        { tick: 5, values: { A: 1 } },
        { tick: 6, values: { A: 0 } },
        { tick: 12, values: { A: 1 } },
        { tick: 13, values: { A: 0 } },
      ],
      checks: [
        { from: 0, to: 9, outputs: { Y: 0 } },
        { from: 10, outputs: { Y: 1 } },
        { from: 11, to: 16, outputs: { Y: 0 } },
        { from: 17, outputs: { Y: 1 } },
        { from: 18, to: 22, outputs: { Y: 0 } },
      ],
    },
  ],
}
