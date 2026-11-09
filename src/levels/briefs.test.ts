import { describe, expect, it } from 'vitest'
import { LEVELS } from './index'

describe('关卡目标说明', () => {
  it('每一关都写了 brief', () => {
    const missing = LEVELS.filter((level) => !level.brief?.trim()).map((level) => level.id)
    expect(missing).toEqual([])
  })

  it('brief 是排好行的纯文本，首尾没有多余空白', () => {
    const messy = LEVELS.filter((level) => {
      const brief = level.brief ?? ''
      return brief !== brief.trim() || /\n{2,}/.test(brief)
    }).map((level) => level.id)
    expect(messy).toEqual([])
  })
})
