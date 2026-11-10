import type { Level } from '../game/types'

/**
 * 自由模式：20×20 的空白沙盒，元件全开，没有输入 / 输出元件，也没有测试和目标。
 * 不在 `LEVELS` 里，选关页在最后一关下面单独给一张卡片。
 */
export const freeLevel: Level = {
  id: 'free',
  name: '自由模式',
  brief: '20×20 的空白沙盒：元件全开，随便搭电路。这里没有输入 / 输出元件，也没有测试和目标。',
  cols: 20,
  rows: 20,
  cells: new Array<null>(20 * 20).fill(null),
  tests: [],
}

/** 是不是自由模式（没有关卡号和测试，界面上要把相关按钮收起来） */
export const isFreeLevel = (level: Level): boolean => level.id === freeLevel.id
