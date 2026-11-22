import { describe, expect, it } from 'vitest'
import type { Cell } from '../game/types'
import {
  captureSelection,
  eraseSelection,
  hasClipboardContent,
  pasteCircuitState,
  pasteClipboard,
  selectionActionForKey,
  selectionBetween,
} from './selection'

const cols = 4
const rows = 3
const at = (x: number, y: number) => y * cols + x
const wire: Cell = { type: 'wire' }
const activeRepeater: Cell = { type: 'repeater', dir: 1 }

/** 4×3 测试地图：第 1 行有一排导线和一个中继器，第 2 行有锁定的输入 / 输出 */
function map(): (Cell | null)[] {
  const cells: (Cell | null)[] = new Array(cols * rows).fill(null)
  cells[at(0, 1)] = { ...wire }
  cells[at(1, 1)] = { ...activeRepeater }
  cells[at(2, 1)] = { ...wire }
  cells[at(1, 0)] = { type: 'input', id: 'A', locked: true }
  cells[at(2, 0)] = { type: 'output', id: 'B', locked: true }
  cells[at(0, 2)] = { type: 'input', id: 'C' }
  return cells
}

describe('矩形选区', () => {
  it('从任意两个角得到左上角加宽高', () => {
    expect(selectionBetween(cols, rows, { col: 2, row: 2 }, { col: 0, row: 1 })).toEqual({
      col: 0,
      row: 1,
      cols: 3,
      rows: 2,
    })
    expect(selectionBetween(cols, rows, { col: 1, row: 0 }, { col: 1, row: 0 })).toEqual({
      col: 1,
      row: 0,
      cols: 1,
      rows: 1,
    })
  })

  it('拖出地图时夹在边上', () => {
    expect(selectionBetween(cols, rows, { col: -3, row: -2 }, { col: 99, row: 99 })).toEqual({
      col: 0,
      row: 0,
      cols,
      rows,
    })
  })
})

describe('复制选区', () => {
  it('记录元件、相对位置和激活状态', () => {
    const cells = map()
    const power = new Map([
      [at(0, 1), 3],
      [at(1, 1), 1],
      [at(2, 1), 3],
      [at(0, 2), 1],
    ])
    const clipboard = captureSelection(cells, cols, rows, { col: 0, row: 0, cols: 3, rows: 3 }, (i) => power.get(i) ?? 0)

    expect(clipboard.cols).toBe(3)
    expect(clipboard.rows).toBe(3)
    expect(clipboard.cells).toHaveLength(9)
    // 锁定输入 / 输出按空格处理
    expect(clipboard.cells[0]).toBeNull()
    expect(clipboard.cells[1]).toBeNull()
    expect(clipboard.cells[2]).toBeNull()
    expect(clipboard.cells[3]).toEqual(wire)
    expect(clipboard.cells[4]).toEqual(activeRepeater)
    expect(clipboard.cells[6]).toEqual({ type: 'input', id: 'C' })
    expect(clipboard.powers[3]).toBe(3)
    expect(clipboard.powers[4]).toBe(1)
  })

  it('复制的元件对象和地图不共享', () => {
    const cells = map()
    const clipboard = captureSelection(cells, cols, rows, { col: 0, row: 1, cols: 2, rows: 1 }, () => 0)
    expect(clipboard.cells[0]).not.toBe(cells[at(0, 1)])
    expect(clipboard.cells[0]).toEqual(cells[at(0, 1)])
  })

  it('只有锁定元件时剪贴板算空的', () => {
    const cells = map()
    const clipboard = captureSelection(cells, cols, rows, { col: 1, row: 0, cols: 2, rows: 1 }, () => 0)
    expect(hasClipboardContent(clipboard)).toBe(false)
  })
})

describe('删除选区', () => {
  it('删掉可删除的元件，锁定元件留下', () => {
    const cells = map()
    const result = eraseSelection(cells, cols, { col: 0, row: 0, cols: 4, rows: 3 })

    expect(result.changed).toBe(true)
    expect(result.cells[at(0, 1)]).toBeNull()
    expect(result.cells[at(1, 1)]).toBeNull()
    expect(result.cells[at(2, 1)]).toBeNull()
    expect(result.cells[at(0, 2)]).toBeNull()
    expect(result.cells[at(1, 0)]).toEqual({ type: 'input', id: 'A', locked: true })
    expect(result.cells[at(2, 0)]).toEqual({ type: 'output', id: 'B', locked: true })
    // 原数组不动
    expect(cells[at(0, 1)]).toEqual(wire)
  })

  it('没东西可删时原样返回', () => {
    const cells = map()
    const result = eraseSelection(cells, cols, { col: 1, row: 0, cols: 2, rows: 1 })
    expect(result.changed).toBe(false)
    expect(result.cells).toBe(cells)
  })
})

describe('粘贴选区', () => {
  it('以选区左上角为起点写入，空格也清掉目标', () => {
    const cells = map()
    const clipboard = captureSelection(cells, cols, rows, { col: 0, row: 1, cols: 2, rows: 1 }, () => 0)
    // 目标改成别的元件，粘贴后应被导线 / 中继器覆盖
    cells[at(0, 2)] = { type: 'not' }
    cells[at(1, 2)] = { type: 'charger', dir: 1 }

    const result = pasteClipboard(cells, cols, rows, { col: 0, row: 2, cols: 1, rows: 1 }, clipboard)
    expect(result.changed).toBe(true)
    expect(result.cells[at(0, 2)]).toEqual(wire)
    expect(result.cells[at(1, 2)]).toEqual(activeRepeater)
    expect(result.placed.map((p) => p.index)).toEqual([at(0, 2), at(1, 2)])
  })

  it('剪贴板里的空方块会把目标元件清掉', () => {
    const cells = map()
    // 复制第 0 行最左边两格：一格空、一格是锁定的输入，剪贴板里两格都是空
    const clipboard = captureSelection(cells, cols, rows, { col: 0, row: 0, cols: 2, rows: 1 }, () => 0)
    expect(clipboard.cells).toEqual([null, null])
    cells[at(3, 2)] = { type: 'input', id: 'C' }

    const result = pasteClipboard(cells, cols, rows, { col: 2, row: 2, cols: 1, rows: 1 }, clipboard)
    expect(result.changed).toBe(true)
    // 第 1 格是空，目标原来的输入 C 被清掉
    expect(result.cells[at(3, 2)]).toBeNull()
    // 第 0 格是空，目标原来也没有东西
    expect(result.cells[at(2, 2)]).toBeNull()
  })

  it('超出地图的元件丢弃，锁定的目标格不覆盖', () => {
    const cells = map()
    const clipboard = captureSelection(cells, cols, rows, { col: 0, row: 1, cols: 3, rows: 1 }, () => 0)
    // 放到右下角：只写得下第 0 列
    const result = pasteClipboard(cells, cols, rows, { col: 3, row: 2, cols: 1, rows: 1 }, clipboard)
    expect(result.changed).toBe(true)
    expect(result.cells[at(3, 2)]).toEqual(wire)

    // 放到第 0 行，前两格撞上锁定的输入 / 输出，只剩第 3 格能写
    const blocked = pasteClipboard(map(), cols, rows, { col: 1, row: 0, cols: 1, rows: 1 }, clipboard)
    expect(blocked.cells[at(1, 0)]).toEqual({ type: 'input', id: 'A', locked: true })
    expect(blocked.cells[at(2, 0)]).toEqual({ type: 'output', id: 'B', locked: true })
    expect(blocked.cells[at(3, 0)]).toEqual(wire)
    expect(blocked.placed.map((p) => p.index)).toEqual([at(3, 0)])
  })

  it('空方块也不会清掉锁定的目标格', () => {
    const cells = map()
    const clipboard = captureSelection(cells, cols, rows, { col: 0, row: 0, cols: 1, rows: 1 }, () => 0)
    const result = pasteClipboard(cells, cols, rows, { col: 1, row: 0, cols: 1, rows: 1 }, clipboard)
    expect(result.changed).toBe(false)
    expect(result.cells[at(1, 0)]).toEqual({ type: 'input', id: 'A', locked: true })
  })

  it('全是空格的剪贴板只清目标，没有可恢复状态的元件', () => {
    const cells: (Cell | null)[] = new Array(cols * rows).fill(null)
    cells[at(1, 1)] = { ...wire }
    const clipboard = captureSelection(cells, cols, rows, { col: 0, row: 0, cols: 1, rows: 1 }, () => 0)

    const result = pasteClipboard(cells, cols, rows, { col: 1, row: 1, cols: 1, rows: 1 }, clipboard)
    expect(result.changed).toBe(true)
    expect(result.cells[at(1, 1)]).toBeNull()
    expect(result.placed).toHaveLength(0)
  })

  it('没有变化时不复制数组', () => {
    const cells = map()
    const clipboard = captureSelection(cells, cols, rows, { col: 0, row: 0, cols: 1, rows: 1 }, () => 0)
    const result = pasteClipboard(cells, cols, rows, { col: 0, row: 0, cols: 1, rows: 1 }, clipboard)
    expect(result.changed).toBe(false)
    expect(result.cells).toBe(cells)
  })
})

describe('粘贴后的电路状态', () => {
  it('保留现场状态，再把复制时的激活状态盖到贴上去的格子', () => {
    const state = {
      tick: 12,
      inputs: { A: 1 as const },
      outputs: {},
      powers: { 0: 1, 5: 3 },
    }
    const placed = [
      { index: 1, cell: { type: 'not' as const }, power: 0 },
      { index: 2, cell: { type: 'input' as const, id: 'B' }, power: 1 },
      { index: 3, cell: { type: 'repeater' as const, dir: 1 as const }, power: 1 },
    ]
    const result = pasteCircuitState(state, { A: 1 }, placed)

    expect(result.powers).toEqual({ 0: 1, 5: 3, 1: 0, 2: 1, 3: 1 })
    expect(result.inputs).toEqual({ A: 1, B: 1 })
    // 原状态不动
    expect(state.powers).toEqual({ 0: 1, 5: 3 })
  })

  it('粘贴的输入是 0 时把对应输入拨回 0', () => {
    const state = { tick: 3, inputs: { A: 1 as const }, outputs: {}, powers: {} }
    const result = pasteCircuitState(state, { A: 1 }, [
      { index: 4, cell: { type: 'input' as const, id: 'A' }, power: 0 },
    ])
    expect(result.inputs.A).toBe(0)
  })
})

describe('选区快捷键', () => {
  it('X / C / V / Delete 对应四个操作', () => {
    expect(selectionActionForKey('x')).toBe('cut')
    expect(selectionActionForKey('X')).toBe('cut')
    expect(selectionActionForKey('c')).toBe('copy')
    expect(selectionActionForKey('C')).toBe('copy')
    expect(selectionActionForKey('v')).toBe('paste')
    expect(selectionActionForKey('Delete')).toBe('delete')
    expect(selectionActionForKey('Backspace')).toBe('delete')
  })

  it('其它键不认', () => {
    expect(selectionActionForKey('a')).toBeNull()
    expect(selectionActionForKey('Escape')).toBeNull()
  })
})
