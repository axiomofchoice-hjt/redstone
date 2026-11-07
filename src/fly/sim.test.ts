import { describe, expect, it } from 'vitest'
import { FlySim, PUSH_LIMIT } from './sim'
import type { FlyLevel, FlyPart } from './types'

const PARTS: Record<string, FlyPart> = {
  B: { type: 'block' },
  S: { type: 'slime' },
  R: { type: 'redstone' },
  '>': { type: 'piston', dir: 1 },
  '<': { type: 'piston', dir: 3 },
  v: { type: 'piston', dir: 2 },
  '^': { type: 'piston', dir: 0 },
  ')': { type: 'stickyPiston', dir: 1 },
  '(': { type: 'stickyPiston', dir: 3 },
  o: { type: 'observer', dir: 1 },
  O: { type: 'observer', dir: 3 },
  C: { type: 'clock' },
}

/** 用字符画造一个关卡：每行一个字符串，# 是墙，其余见 PARTS */
function build(rows: string[]): { level: FlyLevel; at: (x: number, y: number) => number } {
  const cols = rows[0].length
  const cells: (FlyPart | null)[] = []
  const walls: boolean[] = []
  rows.forEach((line) => {
    for (const ch of line) {
      walls.push(ch === '#')
      cells.push(PARTS[ch] ? { ...PARTS[ch] } : null)
    }
  })
  const level: FlyLevel = {
    id: 'test',
    no: 1,
    name: 'test',
    cols,
    rows: rows.length,
    walls,
    cells,
    goal: [],
  }
  return { level, at: (x: number, y: number) => y * cols + x }
}

describe('活塞推拉', () => {
  it('通电后伸出，把前面的方块推走一格', () => {
    const { level, at } = build(['.R....', '>B....'])
    const sim = new FlySim(level)
    expect(sim.step()).toBe(true)
    expect(sim.extended.has(at(0, 1))).toBe(true)
    expect(sim.cells[at(1, 1)]).toBeNull()
    expect(sim.cells[at(2, 1)]?.type).toBe('block')
  })

  it('粘液块把相邻的方块一起带走', () => {
    // 粘液只带走和它直接相邻的方块，后面那个方块不跟
    const { level, at } = build(['.R.....', '>SB....'])
    const sim = new FlySim(level)
    sim.step()
    expect(sim.cells[at(2, 1)]?.type).toBe('slime')
    expect(sim.cells[at(3, 1)]?.type).toBe('block')
  })

  it('粘性活塞缩回时把方块拉回来', () => {
    const { level, at } = build(['.R.....', ')SB....'])
    const sim = new FlySim(level)
    sim.step()
    // 伸出：方块被推到第 2、3 格
    expect(sim.cells[at(2, 1)]?.type).toBe('slime')
    expect(sim.cells[at(3, 1)]?.type).toBe('block')
    // 撤掉电源
    sim.cells[at(1, 0)] = null
    sim.step()
    expect(sim.extended.has(at(0, 1))).toBe(false)
    expect(sim.cells[at(1, 1)]?.type).toBe('slime')
    expect(sim.cells[at(2, 1)]?.type).toBe('block')
  })

  it('普通活塞缩回不拉方块', () => {
    const { level, at } = build(['.R.....', '>SB....'])
    const sim = new FlySim(level)
    sim.step()
    sim.cells[at(1, 0)] = null
    sim.step()
    expect(sim.cells[at(1, 1)]).toBeNull()
    expect(sim.cells[at(2, 1)]?.type).toBe('slime')
  })

  it(`超过 ${PUSH_LIMIT} 格的推力组推不动`, () => {
    const line = '>'.padEnd(1) + 'B'.repeat(PUSH_LIMIT + 1)
    const { level, at } = build(['.R' + '.'.repeat(PUSH_LIMIT + 1), line])
    const sim = new FlySim(level)
    sim.step()
    expect(sim.extended.has(at(0, 1))).toBe(false)
    expect(sim.cells[at(1, 1)]?.type).toBe('block')
  })

  it(`正好 ${PUSH_LIMIT} 格可以推`, () => {
    const line = '>' + 'B'.repeat(PUSH_LIMIT)
    const { level, at } = build(['.R' + '.'.repeat(PUSH_LIMIT), line])
    const sim = new FlySim(level)
    sim.step()
    expect(sim.cells[at(PUSH_LIMIT, 1)]?.type).toBe('block')
  })

  it('伸出的活塞当障碍：后面的活塞推不动它', () => {
    const { level, at } = build(['.R.......', '>B>B.....'])
    const sim = new FlySim(level)
    // 两个活塞都通电，互相冲突，结果两台都不动
    sim.step()
    expect(sim.cells[at(0, 1)]?.type).toBe('piston')
    expect(sim.cells[at(1, 1)]?.type).toBe('block')
  })

  it('前面的活塞挡路时，后面的活塞这一拍不动', () => {
    const { level, at } = build(['.R.....', '>B<....'])
    const sim = new FlySim(level)
    sim.step()
    // 右活塞推 block，但目标格被左向活塞占着
    expect(sim.extended.has(at(0, 1))).toBe(false)
  })

  it('粘液块不会把推力组粘到正在推的活塞自己身上', () => {
    // 前面有粘液、上面也有粘液，从上面绕回活塞身后
    const { level, at } = build(['.R.....', '>SB....', 'S.S....'])
    const sim = new FlySim(level)
    sim.step()
    expect(sim.cells[at(2, 1)]?.type).toBe('slime')
    expect(sim.cells[at(3, 1)]?.type).toBe('block')
  })
})

describe('通电', () => {
  it('红石块贴着活塞就能点亮', () => {
    const { level, at } = build(['R>....'])
    const sim = new FlySim(level)
    sim.step()
    expect(sim.extended.has(at(1, 0))).toBe(true)
  })

  it('电源隔着实体方块也能点亮活塞', () => {
    const { level, at } = build(['RB>...'])
    const sim = new FlySim(level)
    sim.step()
    // R 点亮 B，B 再把电送给右边的活塞
    expect(sim.extended.has(at(2, 0))).toBe(true)
  })

  it('没电时活塞保持不动', () => {
    const { level, at } = build(['>B....'])
    const sim = new FlySim(level)
    expect(sim.step()).toBe(false)
    expect(sim.cells[at(1, 0)]?.type).toBe('block')
  })
})

describe('观察者', () => {
  it('盯着的格子变了就出脉冲，点亮旁边的活塞', () => {
    // 左活塞通电伸出，头出现在第 1 格；观察者盯着第 1 格，下一拍出脉冲点亮右边的活塞
    const { level, at } = build(['>.O>...', 'R......'])
    const sim = new FlySim(level)
    sim.step()
    expect(sim.extended.has(at(0, 0))).toBe(true)
    expect(sim.extended.has(at(3, 0))).toBe(false)
    sim.step()
    expect(sim.extended.has(at(3, 0))).toBe(true)
  })

  it('格子没变就一直在等，不出脉冲', () => {
    const { level, at } = build(['O..>...'])
    const sim = new FlySim(level)
    for (let i = 0; i < 5; i++) sim.step()
    expect(sim.extended.has(at(3, 0))).toBe(false)
  })
})

describe('脉冲器', () => {
  it('自己按节奏开关，粘性活塞来回推拉', () => {
    const { level, at } = build(['C)B....'])
    const sim = new FlySim(level)
    sim.step()
    // 第一拍通电伸出，把石块推到第 3 格
    expect(sim.extended.has(at(1, 0))).toBe(true)
    expect(sim.cells[at(3, 0)]?.type).toBe('block')
    // 三拍后断电缩回，把石块拉回第 2 格
    sim.step()
    sim.step()
    expect(sim.extended.has(at(1, 0))).toBe(false)
    expect(sim.cells[at(2, 0)]?.type).toBe('block')
    // 再通电又推出去
    sim.step()
    sim.step()
    expect(sim.cells[at(3, 0)]?.type).toBe('block')
  })
})
