import { describe, expect, it } from 'vitest'
import type { CellType, Level } from '../game/types'
import { dirForKey, rotateDir, toolForKey } from './keyboard'
import type { Port } from './ports'

const level: Level = {
  id: 't',
  name: 't',
  cols: 1,
  rows: 1,
  cells: [null],
  inputs: ['A'],
  outputs: ['Y'],
  tests: [],
}

const ports: Port[] = [
  { type: 'input', id: 'A' },
  { type: 'output', id: 'Y' },
]

describe('WASD 选方向', () => {
  it('W / A / S / D 分别对应上 / 左 / 下 / 右', () => {
    expect(dirForKey('w')).toBe(0)
    expect(dirForKey('a')).toBe(3)
    expect(dirForKey('s')).toBe(2)
    expect(dirForKey('d')).toBe(1)
  })

  it('大小写都认，其他键不处理', () => {
    expect(dirForKey('W')).toBe(0)
    expect(dirForKey('ArrowUp')).toBeNull()
    expect(dirForKey('q')).toBeNull()
  })
})

describe('滚轮换朝向', () => {
  it('顺时针一格：上 → 右 → 下 → 左', () => {
    expect(rotateDir(0, 1)).toBe(1)
    expect(rotateDir(1, 1)).toBe(2)
    expect(rotateDir(2, 1)).toBe(3)
    expect(rotateDir(3, 1)).toBe(0)
  })

  it('逆时针一格反着走，来回转能回到原方向', () => {
    expect(rotateDir(0, -1)).toBe(3)
    expect(rotateDir(3, -1)).toBe(2)
    // 转过去再转回来，方向不变
    expect(rotateDir(rotateDir(0, -1), 1)).toBe(0)
  })
})

describe('数字键选元件', () => {
  it('1～5 是基础元件', () => {
    expect(toolForKey('1', level, ports)).toEqual({ type: 'wire' })
    expect(toolForKey('2', level, ports)).toEqual({ type: 'cross' })
    expect(toolForKey('3', level, ports)).toEqual({ type: 'charger' })
    expect(toolForKey('4', level, ports)).toEqual({ type: 'repeater' })
    expect(toolForKey('5', level, ports)).toEqual({ type: 'not' })
  })

  it('6 起依次选输入 / 输出', () => {
    expect(toolForKey('6', level, ports)).toEqual({ type: 'input', id: 'A' })
    expect(toolForKey('7', level, ports)).toEqual({ type: 'output', id: 'Y' })
    expect(toolForKey('8', level, ports)).toBeNull()
  })

  it('这关禁用的元件、无效数字都不选', () => {
    const limited = { ...level, tools: ['wire'] as CellType[] }
    expect(toolForKey('1', limited, ports)).toEqual({ type: 'wire' })
    expect(toolForKey('2', limited, ports)).toBeNull()
    expect(toolForKey('0', level, ports)).toBeNull()
    expect(toolForKey('a', level, ports)).toBeNull()
  })
})
