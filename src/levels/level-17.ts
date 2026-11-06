import type { Cell, Level } from '../game/types'

const cols = 10
const rows = 10
// 输入 J / K / C、输出 Y 都由玩家自己放
const cells: (Cell | null)[] = new Array(cols * rows).fill(null)

/** 每组都先把 J、K、C 都设一遍，免得接上玩家当前开着的输入 */
const reset = (values: { J: 0 | 1; K: 0 | 1; C: 0 | 1 }) => ({ tick: 0, values })

/**
 * 第十七关：JK 触发器。只在时钟 C 的上升沿按当时（拉高那一刻）的 J、K 改 Y：
 * J=1、K=0 置 1，J=0、K=1 清 0，J=K=0 保持，J=K=1 翻转。
 * 下降沿不动；C 不动时 J、K 怎么变都不影响 Y，C 一直高着也只在上升沿动一次。
 */
export const level17: Level = {
  id: 'level-17',
  no: 17,
  name: 'JK 触发器',
  cols,
  rows,
  inputs: ['J', 'K', 'C'],
  outputs: ['Y'],
  cells,
  tests: [
    {
      name: '上升沿置位、复位，之后保持',
      // 每次输入变化后都等 10 tick 再查
      events: [
        reset({ J: 1, K: 0, C: 1 }),
        { tick: 20, values: { J: 0, K: 1, C: 0 } },
        { tick: 40, values: { C: 1 } },
        { tick: 60, values: { J: 1, K: 0, C: 0 } },
        { tick: 80, values: { C: 1 } },
      ],
      checks: [
        { from: 10, to: 19, outputs: { Y: 1 } },
        { from: 30, to: 39, outputs: { Y: 1 } },
        { from: 50, to: 59, outputs: { Y: 0 } },
        { from: 70, to: 79, outputs: { Y: 0 } },
        { from: 90, to: 100, outputs: { Y: 1 } },
      ],
    },
    {
      name: 'C 高电平期间改 J、K 都不跟，下降沿也不动',
      events: [
        reset({ J: 1, K: 0, C: 1 }),
        { tick: 20, values: { J: 0, K: 1 } },
        { tick: 40, values: { J: 1, K: 1 } },
        { tick: 60, values: { C: 0 } },
        { tick: 80, values: { J: 0, K: 1 } },
        { tick: 100, values: { C: 1 } },
      ],
      checks: [
        { from: 10, to: 19, outputs: { Y: 1 } },
        { from: 30, to: 39, outputs: { Y: 1 } },
        { from: 50, to: 59, outputs: { Y: 1 } },
        { from: 70, to: 79, outputs: { Y: 1 } },
        { from: 90, to: 99, outputs: { Y: 1 } },
        { from: 110, to: 120, outputs: { Y: 0 } },
      ],
    },
    {
      name: 'J=K=1 时每个上升沿翻一次，C 一直高着也只翻一次',
      events: [
        reset({ J: 0, K: 1, C: 1 }),
        { tick: 20, values: { J: 1, K: 1, C: 0 } },
        { tick: 40, values: { C: 1 } },
        { tick: 60, values: { C: 0 } },
        { tick: 80, values: { C: 1 } },
        { tick: 100, values: { C: 0 } },
        { tick: 120, values: { C: 1 } },
      ],
      checks: [
        { from: 10, to: 19, outputs: { Y: 0 } },
        { from: 30, to: 39, outputs: { Y: 0 } },
        { from: 50, to: 59, outputs: { Y: 1 } },
        { from: 70, to: 79, outputs: { Y: 1 } },
        { from: 90, to: 99, outputs: { Y: 0 } },
        { from: 110, to: 119, outputs: { Y: 0 } },
        // C 从第 120 tick 起一直高着
        { from: 130, to: 160, outputs: { Y: 1 } },
      ],
    },
    {
      name: 'J、K 先改好，等下一个上升沿才生效',
      events: [
        reset({ J: 0, K: 1, C: 1 }),
        { tick: 20, values: { J: 0, K: 0, C: 0 } },
        { tick: 40, values: { J: 1, K: 0 } },
        { tick: 60, values: { C: 1 } },
        { tick: 80, values: { J: 0, K: 1 } },
        { tick: 100, values: { C: 0 } },
        { tick: 120, values: { C: 1 } },
      ],
      checks: [
        { from: 10, to: 19, outputs: { Y: 0 } },
        { from: 30, to: 39, outputs: { Y: 0 } },
        { from: 50, to: 59, outputs: { Y: 0 } },
        { from: 70, to: 79, outputs: { Y: 1 } },
        { from: 90, to: 99, outputs: { Y: 1 } },
        { from: 110, to: 119, outputs: { Y: 1 } },
        { from: 130, to: 140, outputs: { Y: 0 } },
      ],
    },
  ],
}
