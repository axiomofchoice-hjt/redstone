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
      name: '下降沿也出脉冲',
      events: [
        { tick: 0, values: { A: 0 } },
        { tick: 12, values: { A: 1 } },
        { tick: 18, values: { A: 0 } },
      ],
      checks: [
        { from: 8, to: 16, outputs: { Y: 0 } },
        { from: 17, outputs: { Y: 1 } },
        { from: 18, to: 22, outputs: { Y: 0 } },
        { from: 23, outputs: { Y: 1 } },
        { from: 24, to: 30, outputs: { Y: 0 } },
      ],
    },
    {
      name: '连续翻转各出一次',
      events: [
        { tick: 0, values: { A: 0 } },
        { tick: 12, values: { A: 1 } },
        { tick: 18, values: { A: 0 } },
        { tick: 24, values: { A: 1 } },
      ],
      checks: [
        { from: 8, to: 16, outputs: { Y: 0 } },
        { from: 17, outputs: { Y: 1 } },
        { from: 18, to: 22, outputs: { Y: 0 } },
        { from: 23, outputs: { Y: 1 } },
        { from: 24, to: 28, outputs: { Y: 0 } },
        { from: 29, outputs: { Y: 1 } },
        { from: 30, to: 36, outputs: { Y: 0 } },
      ],
    },
    {
      name: '一直高电平只出一次',
      events: [
        { tick: 0, values: { A: 0 } },
        { tick: 12, values: { A: 1 } },
      ],
      checks: [
        { from: 8, to: 16, outputs: { Y: 0 } },
        { from: 17, outputs: { Y: 1 } },
        { from: 18, to: 32, outputs: { Y: 0 } },
      ],
    },
  ],
}
