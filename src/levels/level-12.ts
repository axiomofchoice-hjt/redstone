import type { Cell, Level } from '../game/types'
import { cellsFrom, stateFrom } from './solution-helpers'

const cols = 10
const rows = 10
// 输入 A、输出 Y 都由玩家自己放
const cells: (Cell | null)[] = new Array(cols * rows).fill(null)

/**
 * 参考解：A 一路经非门，另一路经两个中继器再经非门，两路相或后翻回来接 Y；
 * 宽度不足 3 tick 的脉冲在相或里被吞掉，够宽的脉冲原样通过（晚 5 tick、宽度不变）。
 */
const solution = cellsFrom(cols * rows, {
  // 第 0 行：A 这一路经非门、中继器、非门，右边导线接 Y
  0: { type: 'input', id: 'A' },
  1: { type: 'charger', dir: 1 },
  2: { type: 'not', dir: 1 },
  3: { type: 'wire' },
  4: { type: 'repeater', dir: 1 },
  5: { type: 'not', dir: 1 },
  6: { type: 'wire' },
  7: { type: 'wire' },
  8: { type: 'wire' },
  9: { type: 'output', id: 'Y' },
  // 第 1 行：A 晚 2 tick 的那一路，进下面的非门
  10: { type: 'wire' },
  11: { type: 'repeater', dir: 1 },
  12: { type: 'repeater', dir: 1 },
  13: { type: 'not', dir: 1 },
  15: { type: 'wire' },
  16: { type: 'repeater', dir: 1 },
  17: { type: 'charger', dir: 1 },
  18: { type: 'wire' },
  // 第 2 行：再晚 1 tick 的中继器
  25: { type: 'wire' },
  26: { type: 'repeater', dir: 1 },
  27: { type: 'repeater', dir: 1 },
  28: { type: 'wire' },
})

/** 导出时的一刻：A=0、Y=0（tick 187） */
const solutionState = stateFrom(
  { tick: 187, inputs: { A: 0 }, outputs: { Y: 0 } },
  {
    2: 1,
    3: 3,
    4: 1,
    13: 1,
  },
)

/**
 * 第十二关：脉冲过滤器。宽度 1～2 tick 的脉冲被吃掉，3 tick 及以上的原样通过，
 * 只是整体晚 5 tick（前沿晚 5，宽度不变）。
 */
export const level12: Level = {
  id: 'level-12',
  no: 12,
  name: '脉冲过滤器',
  brief: '只放行宽度 3 tick 及以上的脉冲：1、2 tick 的窄脉冲直接吞掉。\n通过的脉冲晚 5 tick 出现，宽度不变。\n输入 A 和输出 Y 的位置自己定。',
  cols,
  rows,
  inputs: ['A'],
  outputs: ['Y'],
  cells,
  solution: { cells: solution, state: solutionState },
  tests: [
    {
      name: '1 tick 脉冲不输出',
      // 前 10 tick 保持 A=0，把延迟链里可能残留的 1 先冲掉；玩家带着 A=1 点测试也能过
      events: [
        { tick: 0, values: { A: 0 } },
        { tick: 15, values: { A: 1 } },
        { tick: 16, values: { A: 0 } },
      ],
      checks: [{ from: 10, to: 30, outputs: { Y: 0 } }],
    },
    {
      name: '2 tick 脉冲不输出',
      events: [
        { tick: 0, values: { A: 0 } },
        { tick: 15, values: { A: 1 } },
        { tick: 17, values: { A: 0 } },
      ],
      checks: [{ from: 10, to: 30, outputs: { Y: 0 } }],
    },
    {
      name: '3 tick 脉冲通过',
      events: [
        { tick: 0, values: { A: 0 } },
        { tick: 15, values: { A: 1 } },
        { tick: 18, values: { A: 0 } },
      ],
      checks: [
        { from: 10, to: 19, outputs: { Y: 0 } },
        { from: 20, to: 22, outputs: { Y: 1 } },
        { from: 23, to: 33, outputs: { Y: 0 } },
      ],
    },
    {
      name: '5 tick 脉冲宽度不变',
      events: [
        { tick: 0, values: { A: 0 } },
        { tick: 15, values: { A: 1 } },
        { tick: 20, values: { A: 0 } },
      ],
      checks: [
        { from: 10, to: 19, outputs: { Y: 0 } },
        { from: 20, to: 24, outputs: { Y: 1 } },
        { from: 25, to: 35, outputs: { Y: 0 } },
      ],
    },
  ],
}
