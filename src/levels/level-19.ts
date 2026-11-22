import type { Cell, InputEvent, Level } from '../game/types'
import { cellsFrom, stateFrom } from './solution-helpers'

const cols = 20
const rows = 20
// 输入 P、输出 1～4 都由玩家自己放
const cells: (Cell | null)[] = new Array(cols * rows).fill(null)

/** 第 at tick 拉高、第 at + len tick 落回 0 的脉冲 */
const pulse = (at: number, len: number): InputEvent[] => [
  { tick: at, values: { P: 1 } },
  { tick: at + len, values: { P: 0 } },
]

/** 只有输出 on 是 1、另外三个是 0 */
const only = (on: '1' | '2' | '3' | '4'): Record<string, 0 | 1> => ({
  1: on === '1' ? 1 : 0,
  2: on === '2' ? 1 : 0,
  3: on === '3' ? 1 : 0,
  4: on === '4' ? 1 : 0,
})

/** 参考解：布局来自导出的地图（20×20，P 在左上角，四个输出在右侧） */
const solution = cellsFrom(cols * rows, {
  // 第 0 行
  0: { type: 'input', id: 'P' },
  1: { type: 'wire' },
  2: { type: 'charger', dir: 1 },
  3: { type: 'not', dir: 1 },
  4: { type: 'charger', dir: 1 },
  5: { type: 'not', dir: 1 },
  6: { type: 'wire' },
  // 第 1 行
  20: { type: 'repeater', dir: 2 },
  23: { type: 'wire' },
  24: { type: 'repeater', dir: 1 },
  25: { type: 'repeater', dir: 1 },
  26: { type: 'wire' },
  // 第 2 行
  40: { type: 'repeater', dir: 2 },
  46: { type: 'wire' },
  // 第 3 行
  60: { type: 'repeater', dir: 2 },
  66: { type: 'wire' },
  67: { type: 'wire' },
  // 第 4 行
  80: { type: 'repeater', dir: 2 },
  86: { type: 'wire' },
  87: { type: 'repeater', dir: 2 },
  // 第 5 行
  100: { type: 'wire' },
  101: { type: 'wire' },
  102: { type: 'wire' },
  103: { type: 'wire' },
  104: { type: 'wire' },
  105: { type: 'wire' },
  106: { type: 'cross' },
  107: { type: 'repeater', dir: 1 },
  108: { type: 'wire' },
  109: { type: 'repeater', dir: 1 },
  110: { type: 'repeater', dir: 1 },
  111: { type: 'repeater', dir: 1 },
  112: { type: 'wire' },
  113: { type: 'wire' },
  114: { type: 'wire' },
  115: { type: 'wire' },
  116: { type: 'output', id: '1' },
  // 第 6 行
  120: { type: 'wire' },
  126: { type: 'wire' },
  127: { type: 'wire' },
  129: { type: 'charger', dir: 0 },
  130: { type: 'charger', dir: 0 },
  131: { type: 'charger', dir: 0 },
  // 第 7 行
  140: { type: 'repeater', dir: 2 },
  146: { type: 'wire' },
  147: { type: 'repeater', dir: 2 },
  149: { type: 'wire' },
  150: { type: 'charger', dir: 0 },
  151: { type: 'charger', dir: 0 },
  // 第 8 行
  160: { type: 'wire' },
  161: { type: 'wire' },
  162: { type: 'wire' },
  163: { type: 'wire' },
  164: { type: 'wire' },
  165: { type: 'wire' },
  166: { type: 'cross' },
  167: { type: 'repeater', dir: 1 },
  168: { type: 'wire' },
  169: { type: 'wire' },
  170: { type: 'cross' },
  171: { type: 'cross' },
  172: { type: 'repeater', dir: 1 },
  173: { type: 'repeater', dir: 1 },
  174: { type: 'wire' },
  175: { type: 'wire' },
  176: { type: 'output', id: '2' },
  // 第 9 行
  180: { type: 'wire' },
  186: { type: 'wire' },
  187: { type: 'wire' },
  190: { type: 'charger', dir: 0 },
  191: { type: 'charger', dir: 0 },
  192: { type: 'charger', dir: 0 },
  193: { type: 'charger', dir: 0 },
  // 第 10 行
  200: { type: 'repeater', dir: 2 },
  206: { type: 'wire' },
  207: { type: 'repeater', dir: 2 },
  210: { type: 'charger', dir: 0 },
  211: { type: 'charger', dir: 0 },
  212: { type: 'charger', dir: 0 },
  213: { type: 'charger', dir: 0 },
  // 第 11 行
  220: { type: 'wire' },
  221: { type: 'wire' },
  222: { type: 'wire' },
  223: { type: 'wire' },
  224: { type: 'wire' },
  225: { type: 'wire' },
  226: { type: 'cross' },
  227: { type: 'repeater', dir: 1 },
  228: { type: 'wire' },
  229: { type: 'wire' },
  230: { type: 'wire' },
  231: { type: 'cross' },
  232: { type: 'wire' },
  233: { type: 'cross' },
  234: { type: 'repeater', dir: 1 },
  235: { type: 'wire' },
  236: { type: 'output', id: '3' },
  // 第 12 行
  240: { type: 'wire' },
  246: { type: 'wire' },
  247: { type: 'wire' },
  251: { type: 'charger', dir: 0 },
  253: { type: 'charger', dir: 0 },
  254: { type: 'charger', dir: 0 },
  // 第 13 行
  260: { type: 'repeater', dir: 2 },
  267: { type: 'repeater', dir: 2 },
  271: { type: 'charger', dir: 0 },
  273: { type: 'charger', dir: 0 },
  274: { type: 'charger', dir: 0 },
  // 第 14 行
  280: { type: 'wire' },
  281: { type: 'wire' },
  282: { type: 'wire' },
  283: { type: 'wire' },
  284: { type: 'wire' },
  285: { type: 'wire' },
  286: { type: 'wire' },
  287: { type: 'repeater', dir: 1 },
  288: { type: 'wire' },
  289: { type: 'wire' },
  290: { type: 'wire' },
  291: { type: 'wire' },
  292: { type: 'wire' },
  293: { type: 'wire' },
  294: { type: 'wire' },
  295: { type: 'wire' },
  296: { type: 'output', id: '4' },
})

/** 导出时的一刻：P=0，输出 2 保持为 1（tick 1317）；每行一条，key 是行优先下标 */
const solutionState = stateFrom(
  { tick: 1317, inputs: { P: 0 }, outputs: { 1: 0, 2: 1, 3: 0, 4: 0 } },
  {
    3: 1, 4: 1, 6: 3,
    23: 3, 24: 1, 25: 1, 26: 3,
    46: 3,
    66: 3, 67: 3,
    86: 3, 87: 1,
    106: 1, 107: 1, 108: 3,
    126: 3, 127: 3, 129: 1,
    146: 3, 147: 1, 149: 3,
    166: 1, 167: 1, 168: 3, 169: 3, 170: 2, 171: 2, 172: 1, 173: 1, 174: 3, 175: 3, 176: 1,
    186: 3, 187: 3,
    206: 3, 207: 1,
    226: 1,
    246: 3, 247: 3,
    267: 1,
  },
)

/**
 * 第十九关：脉冲长度感应器。P 每来一个高电平持续 L 个 tick 的脉冲（L ≤ 4），
 * 在下边沿把第 L 个输出置 1、另外三个清 0，一直保持到下一个脉冲结束；脉冲还高着的
 * 时候保持上一个结果。下边沿后第 10 tick 起才开始查，前面几拍是电路自己的过渡时间。
 *
 * 每组都先把 P 设成 0、第一个脉冲放在第 20 tick：从编辑器里任意状态点「运行测试」
 * 时，前面 20 tick 的 0 足够把上一次留下的状态冲掉。
 */
export const level19: Level = {
  id: 'level-19',
  no: 19,
  name: '脉冲长度感应器',
  brief:
    '在 P 的脉冲下边沿，检测 P 的脉冲长度 len tick 并把第 len 个输出置 1，其他输出置 0。\n保证 P 的脉冲长度不超过 4，电路延迟不能超过 10 tick。',
  cols,
  rows,
  inputs: ['P'],
  outputs: ['1', '2', '3', '4'],
  cells,
  solution: { cells: solution, state: solutionState },
  tests: [
    {
      name: 'P 高 1 tick → 只有输出 1',
      events: [{ tick: 0, values: { P: 0 } }, ...pulse(20, 1)],
      checks: [{ from: 31, to: 60, outputs: only('1') }],
    },
    {
      name: 'P 高 2 tick → 只有输出 2',
      events: [{ tick: 0, values: { P: 0 } }, ...pulse(20, 2)],
      checks: [{ from: 32, to: 60, outputs: only('2') }],
    },
    {
      name: 'P 高 3 tick → 只有输出 3',
      events: [{ tick: 0, values: { P: 0 } }, ...pulse(20, 3)],
      checks: [{ from: 33, to: 60, outputs: only('3') }],
    },
    {
      name: 'P 高 4 tick → 只有输出 4',
      events: [{ tick: 0, values: { P: 0 } }, ...pulse(20, 4)],
      checks: [{ from: 34, to: 60, outputs: only('4') }],
    },
    {
      name: '依次来 4、1、4、2 tick 的脉冲，高电平期间保持上一个结果',
      events: [
        { tick: 0, values: { P: 0 } },
        ...pulse(20, 4),
        ...pulse(83, 1),
        ...pulse(137, 4),
        ...pulse(205, 2),
      ],
      checks: [
        // 第 24 tick 落沿，第 83 tick 下一个脉冲才开始
        { from: 34, to: 83, outputs: only('4') },
        // 第 84 tick 落沿，第 94 tick 起查新结果；第 137 tick 起又高了
        { from: 94, to: 140, outputs: only('1') },
        // 第 141 tick 落沿，第 151 tick 起查新结果；第 205 tick 起又高了
        { from: 151, to: 206, outputs: only('4') },
        // 第 207 tick 落沿，第 217 tick 起查新结果
        { from: 217, to: 270, outputs: only('2') },
      ],
    },
  ],
}
