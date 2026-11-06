import type { Cell, Level } from '../game/types'

const cols = 10
const rows = 10
// 输入 A、输出 Y 都由玩家自己放
const cells: (Cell | null)[] = new Array(cols * rows).fill(null)

/**
 * 第十四关：双边沿感应器。A 不管是变高还是变低，之后第 5 tick 出 1 tick 脉冲，其余时候 Y = 0。
 */
export const level14: Level = {
  id: 'level-14',
  no: 14,
  name: '双边沿感应器',
  cols,
  rows,
  inputs: ['A'],
  outputs: ['Y'],
  cells,
  tests: [
    {
      name: '上升沿出脉冲',
      events: [{ tick: 5, values: { A: 1 } }],
      checks: [
        { from: 0, to: 9, outputs: { Y: 0 } },
        { from: 10, outputs: { Y: 1 } },
        { from: 11, to: 20, outputs: { Y: 0 } },
      ],
    },
    {
      name: '下降沿也出脉冲',
      events: [
        { tick: 0, values: { A: 1 } },
        { tick: 9, values: { A: 0 } },
      ],
      checks: [
        { from: 0, to: 4, outputs: { Y: 0 } },
        { from: 5, outputs: { Y: 1 } },
        { from: 6, to: 13, outputs: { Y: 0 } },
        { from: 14, outputs: { Y: 1 } },
        { from: 15, to: 22, outputs: { Y: 0 } },
      ],
    },
    {
      name: '连续翻转各出一次',
      events: [
        { tick: 4, values: { A: 1 } },
        { tick: 9, values: { A: 0 } },
        { tick: 14, values: { A: 1 } },
      ],
      checks: [
        { from: 0, to: 8, outputs: { Y: 0 } },
        { from: 9, outputs: { Y: 1 } },
        { from: 10, to: 13, outputs: { Y: 0 } },
        { from: 14, outputs: { Y: 1 } },
        { from: 15, to: 18, outputs: { Y: 0 } },
        { from: 19, outputs: { Y: 1 } },
        { from: 20, to: 25, outputs: { Y: 0 } },
      ],
    },
    {
      name: '一直高电平只出一次',
      events: [{ tick: 0, values: { A: 1 } }],
      checks: [
        { from: 0, to: 4, outputs: { Y: 0 } },
        { from: 5, outputs: { Y: 1 } },
        { from: 6, to: 20, outputs: { Y: 0 } },
      ],
    },
  ],
}
