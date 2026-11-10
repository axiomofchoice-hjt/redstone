import { describe, expect, it } from 'vitest'
import { LEVELS } from '../levels'
import { CHAPTERS, chapterLevels, chapterOf, padNo } from './levels-meta'

describe('关卡分组', () => {
  it('所有关卡都落在且只落在一个分组里', () => {
    const grouped = CHAPTERS.flatMap((chapter) => chapterLevels(LEVELS, chapter))
    expect(grouped).toHaveLength(LEVELS.length)
    expect(new Set(grouped.map((level) => level.id)).size).toBe(LEVELS.length)
  })

  it('每关都能找到包含自己的分组', () => {
    for (const level of LEVELS) {
      const chapter = chapterOf(level)
      expect(chapterLevels(LEVELS, chapter).map((item) => item.id)).toContain(level.id)
    }
  })

  it('章节按逻辑电路、脉冲电路、记忆电路、进阶排列', () => {
    expect(CHAPTERS.map((chapter) => chapter.title)).toEqual([
      '逻辑电路',
      '脉冲电路',
      '记忆电路',
      '进阶',
    ])
    expect(CHAPTERS.map((chapter) => [chapter.from, chapter.to])).toEqual([
      [1, 7],
      [8, 13],
      [14, 17],
      [18, 19],
    ])
  })

  it('关卡按选关顺序连续编号', () => {
    expect(LEVELS.map((level) => level.no)).toEqual(
      Array.from({ length: LEVELS.length }, (_, index) => index + 1),
    )
  })

  it('脉冲电路、记忆电路和进阶里的关卡按新顺序排列', () => {
    expect(chapterLevels(LEVELS, CHAPTERS[1]).map((level) => level.name)).toEqual([
      '时钟',
      '脉冲延迟器',
      '脉冲延长器',
      '上升沿感应器',
      '脉冲过滤器',
      '双边沿感应器',
    ])
    expect(chapterLevels(LEVELS, CHAPTERS[2]).map((level) => level.name)).toEqual([
      'RS 锁存器',
      'D 锁存器',
      'T 触发器',
      'JK 触发器',
    ])
    expect(chapterLevels(LEVELS, CHAPTERS[3]).map((level) => level.name)).toEqual([
      '交叉',
      '脉冲长度感应器',
    ])
  })

  it('关卡号补成两位', () => {
    expect(padNo(1)).toBe('01')
    expect(padNo(19)).toBe('19')
  })
})
