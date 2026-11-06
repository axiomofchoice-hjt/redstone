import type { Cell, Level } from '../game/types'

const cols = 10
const rows = 10
// 输入 D / E、输出 Y 都由玩家自己放
const cells: (Cell | null)[] = new Array(cols * rows).fill(null)

/** 每组都先把 D、E 都设一遍，免得接上玩家当前开着的输入 */
const reset = (values: { D: 0 | 1; E: 0 | 1 }) => ({ tick: 0, values })

/**
 * 第十六关：D 锁存器。E 打开时 Y 跟着 D 走（D 变 1 变 0 都跟），
 * E 关掉后 Y 保持关掉那一刻的值，这时候 D 怎么变都不影响 Y。
 */
export const level16: Level = {
  id: 'level-16',
  no: 16,
  name: 'D 锁存器',
  cols,
  rows,
  inputs: ['D', 'E'],
  outputs: ['Y'],
  cells,
  tests: [
    {
      name: 'E 开着，Y 跟着 D 变',
      events: [
        reset({ D: 1, E: 1 }),
        { tick: 30, values: { D: 0 } },
        { tick: 60, values: { D: 1 } },
      ],
      checks: [
        { from: 12, to: 28, outputs: { Y: 1 } },
        { from: 42, to: 58, outputs: { Y: 0 } },
        { from: 72, to: 88, outputs: { Y: 1 } },
      ],
    },
    {
      name: 'E 关着，D 怎么变都保持 1',
      events: [
        reset({ D: 1, E: 1 }),
        { tick: 15, values: { E: 0 } },
        { tick: 30, values: { D: 0 } },
        { tick: 45, values: { D: 1 } },
        { tick: 60, values: { D: 0 } },
      ],
      checks: [{ from: 20, to: 70, outputs: { Y: 1 } }],
    },
    {
      name: 'E 关着，D 怎么变都保持 0',
      events: [
        reset({ D: 0, E: 1 }),
        { tick: 15, values: { E: 0 } },
        { tick: 30, values: { D: 1 } },
        { tick: 45, values: { D: 0 } },
        { tick: 60, values: { D: 1 } },
      ],
      checks: [{ from: 20, to: 70, outputs: { Y: 0 } }],
    },
    {
      name: '锁住以后再开 E，跟上当下的 D',
      events: [
        reset({ D: 0, E: 1 }),
        { tick: 15, values: { E: 0 } },
        { tick: 30, values: { D: 1 } },
        { tick: 45, values: { E: 1 } },
        { tick: 60, values: { E: 0 } },
        { tick: 75, values: { D: 0 } },
        { tick: 90, values: { E: 1 } },
      ],
      checks: [
        { from: 20, to: 35, outputs: { Y: 0 } },
        { from: 55, to: 60, outputs: { Y: 1 } },
        { from: 65, to: 75, outputs: { Y: 1 } },
        { from: 100, to: 112, outputs: { Y: 0 } },
      ],
    },
  ],
}
