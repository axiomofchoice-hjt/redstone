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

  it('关卡号补成两位', () => {
    expect(padNo(1)).toBe('01')
    expect(padNo(19)).toBe('19')
  })
})
