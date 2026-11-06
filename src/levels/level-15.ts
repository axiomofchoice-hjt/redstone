import type { Cell, Level } from '../game/types'

const cols = 10
const rows = 10
// 输入 S / R、输出 Y 都由玩家自己放
const cells: (Cell | null)[] = new Array(cols * rows).fill(null)

/** 每组都先把 S、R 都设一遍，免得接上玩家当前开着的输入 */
const reset = (values: { S: 0 | 1; R: 0 | 1 }) => ({ tick: 0, values })

/**
 * 第十五关：RS 锁存器。S 拉一下 Y 变成 1，R 拉一下 Y 变成 0，
 * 两个都不拉时保持上一次的状态。S、R 同时为 1 不测。
 */
export const level15: Level = {
  id: 'level-15',
  no: 15,
  name: 'RS 锁存器',
  cols,
  rows,
  inputs: ['S', 'R'],
  outputs: ['Y'],
  cells,
  tests: [
    {
      name: 'R 复位后保持 0',
      events: [
        reset({ S: 0, R: 1 }),
        { tick: 8, values: { R: 0 } },
      ],
      checks: [
        { from: 10, to: 18, outputs: { Y: 0 } },
        { from: 24, to: 34, outputs: { Y: 0 } },
      ],
    },
    {
      name: 'S 置位后保持 1',
      events: [
        reset({ S: 0, R: 1 }),
        { tick: 8, values: { R: 0 } },
        { tick: 16, values: { S: 1 } },
        { tick: 24, values: { S: 0 } },
      ],
      checks: [
        { from: 10, to: 16, outputs: { Y: 0 } },
        { from: 30, to: 42, outputs: { Y: 1 } },
      ],
    },
    {
      name: 'R 再清 0 后保持',
      events: [
        reset({ S: 1, R: 0 }),
        { tick: 8, values: { S: 0 } },
        { tick: 16, values: { R: 1 } },
        { tick: 24, values: { R: 0 } },
      ],
      checks: [
        { from: 10, to: 16, outputs: { Y: 1 } },
        { from: 30, to: 42, outputs: { Y: 0 } },
      ],
    },
    {
      name: '来回翻，各认一次',
      events: [
        reset({ S: 0, R: 1 }),
        { tick: 6, values: { R: 0 } },
        { tick: 10, values: { S: 1 } },
        { tick: 14, values: { S: 0 } },
        { tick: 20, values: { R: 1 } },
        { tick: 24, values: { R: 0 } },
        { tick: 30, values: { S: 1 } },
        { tick: 34, values: { S: 0 } },
      ],
      checks: [
        { from: 8, to: 10, outputs: { Y: 0 } },
        { from: 18, to: 20, outputs: { Y: 1 } },
        { from: 28, to: 30, outputs: { Y: 0 } },
        { from: 38, to: 46, outputs: { Y: 1 } },
      ],
    },
  ],
}
