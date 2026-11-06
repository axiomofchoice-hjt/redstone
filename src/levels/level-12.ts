import type { Cell, Level } from '../game/types'
import { cellsFrom, stateFrom } from './solution-helpers'

const cols = 10
const rows = 10
// 输入 A、输出 Y 都由玩家自己放
const cells: (Cell | null)[] = new Array(cols * rows).fill(null)

/** 参考解：五个中继器串起来，每个晚 1 tick，整个脉冲晚 5 tick、宽度不变 */
const solution = cellsFrom(cols * rows, {
  0: { type: 'input', id: 'A' },
  1: { type: 'repeater', dir: 1 },
  2: { type: 'repeater', dir: 1 },
  3: { type: 'repeater', dir: 1 },
  4: { type: 'repeater', dir: 1 },
  5: { type: 'repeater', dir: 1 },
  6: { type: 'output', id: 'Y' },
})

/** 导出时的一刻：A=0，Y=0 */
const solutionState = stateFrom({ tick: 9, inputs: { A: 0 }, outputs: { Y: 0 } })

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
  solution: { cells: solution, state: solutionState },
  tests: [
    {
      name: '1 tick 脉冲晚 5 tick',
      // 前 10 tick 保持 A=0，把五级中继器里可能残留的 1 先冲掉；玩家带着 A=1 点测试也能过
      events: [
        { tick: 0, values: { A: 0 } },
        { tick: 15, values: { A: 1 } },
        { tick: 16, values: { A: 0 } },
      ],
      checks: [
        { from: 10, to: 19, outputs: { Y: 0 } },
        { from: 20, outputs: { Y: 1 } },
        { from: 21, to: 28, outputs: { Y: 0 } },
      ],
    },
    {
      name: '3 tick 脉冲宽度不变',
      events: [
        { tick: 0, values: { A: 0 } },
        { tick: 15, values: { A: 1 } },
        { tick: 18, values: { A: 0 } },
      ],
      checks: [
        { from: 10, to: 19, outputs: { Y: 0 } },
        { from: 20, to: 22, outputs: { Y: 1 } },
        { from: 23, to: 30, outputs: { Y: 0 } },
      ],
    },
    {
      name: '两个脉冲各晚 5 tick',
      events: [
        { tick: 0, values: { A: 0 } },
        { tick: 15, values: { A: 1 } },
        { tick: 16, values: { A: 0 } },
        { tick: 22, values: { A: 1 } },
        { tick: 23, values: { A: 0 } },
      ],
      checks: [
        { from: 10, to: 19, outputs: { Y: 0 } },
        { from: 20, outputs: { Y: 1 } },
        { from: 21, to: 26, outputs: { Y: 0 } },
        { from: 27, outputs: { Y: 1 } },
        { from: 28, to: 32, outputs: { Y: 0 } },
      ],
    },
  ],
}
