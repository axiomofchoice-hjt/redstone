import { describe, expect, it } from 'vitest'
import type { Cell, Level } from '../game/types'
import { portsFor } from './ports'
import { toolEnabled } from './tools'

function makeLevel(cells: (Cell | null)[]): Level {
  return { id: 't', name: 't', cols: cells.length, rows: 1, cells, inputs: ['A', 'B'], outputs: ['C'], tests: [] }
}

describe('元件栏的输入输出按钮', () => {
  it('地图上没有预置时，输入输出都出现在元件栏', () => {
    expect(portsFor(makeLevel([null, null])).map((p) => p.id)).toEqual(['A', 'B', 'C'])
  })

  it('预置且锁定的输入输出不再出现在元件栏', () => {
    const ports = portsFor(
      makeLevel([{ type: 'input', id: 'A', locked: true }, { type: 'output', id: 'C', locked: true }]),
    )
    expect(ports.map((p) => p.id)).toEqual(['B'])
  })

  it('没锁的预置元件不隐藏按钮', () => {
    const ports = portsFor(makeLevel([{ type: 'input', id: 'A' }]))
    expect(ports.map((p) => p.id)).toEqual(['A', 'B', 'C'])
  })
})

describe('这关能用的元件', () => {
  it('关卡没写 tools 时全都可用', () => {
    expect(toolEnabled(makeLevel([null]), 'not')).toBe(true)
  })

  it('写了 tools 就只放开列出的元件', () => {
    const level = { ...makeLevel([null]), tools: ['wire' as const] }
    expect(toolEnabled(level, 'wire')).toBe(true)
    expect(toolEnabled(level, 'not')).toBe(false)
    expect(toolEnabled(level, 'cross')).toBe(false)
  })
})
