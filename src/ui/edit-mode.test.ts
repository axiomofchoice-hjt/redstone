import { describe, expect, it } from 'vitest'
import type { Cell } from '../game/types'
import { editAction } from './edit-mode'

const wire: Cell = { type: 'wire' }
const input: Cell = { type: 'input', id: 'A' }

describe('电脑端编辑模式', () => {
  it('放置模式点输入元件拨 0 / 1', () => {
    expect(editAction('place', input)).toEqual({ type: 'toggle', id: 'A' })
  })

  it('放置模式放元件不覆盖已有元件', () => {
    expect(editAction('place', wire)).toEqual({ type: 'blocked' })
    expect(editAction('place', { type: 'output', id: 'Y', locked: true })).toEqual({
      type: 'blocked',
    })
  })

  it('放置模式空格子照常放', () => {
    expect(editAction('place', null)).toEqual({ type: 'place' })
  })

  it('覆盖模式盖掉已有元件，也不把输入当开关', () => {
    expect(editAction('overwrite', wire)).toEqual({ type: 'place' })
    expect(editAction('overwrite', input)).toEqual({ type: 'place' })
    expect(editAction('overwrite', null)).toEqual({ type: 'place' })
  })
})
