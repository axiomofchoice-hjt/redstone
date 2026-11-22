import type { Cell, CircuitState } from '../game/types'

/** 地图上的矩形选区：以格子为单位，左上角加宽高 */
export interface Selection {
  col: number
  row: number
  cols: number
  rows: number
}

/** 选区里的一个格子位置 */
export interface CellPoint {
  col: number
  row: number
}

/**
 * 游戏内剪贴板：一块矩形范围的内容，行优先。
 * `cells` 里的 null 表示空格，或者源格里是玩家删不掉的锁定元件（例如第一关的输入 / 输出）——
 * 按需求这两种都视为「没有元件」，粘贴时会把目标位置的元件覆盖掉。
 * `powers` 和 `cells` 一一对应，记的是复制那一刻每格的激活状态。
 */
export interface Clipboard {
  cols: number
  rows: number
  cells: (Cell | null)[]
  powers: number[]
}

/** 粘贴时真正写进去的非空元件，用来恢复通电状态 */
export interface PlacedCell {
  index: number
  cell: Cell
  power: number
}

export interface CellsChange {
  cells: (Cell | null)[]
  changed: boolean
}

export interface PasteResult extends CellsChange {
  placed: PlacedCell[]
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

/** 从拖动的起点、终点两格得到规范化矩形；出了地图就夹在最近的边上 */
export function selectionBetween(
  cols: number,
  rows: number,
  a: CellPoint,
  b: CellPoint,
): Selection {
  const col = clamp(Math.min(a.col, b.col), 0, cols - 1)
  const row = clamp(Math.min(a.row, b.row), 0, rows - 1)
  const right = clamp(Math.max(a.col, b.col), 0, cols - 1)
  const bottom = clamp(Math.max(a.row, b.row), 0, rows - 1)
  return { col, row, cols: right - col + 1, rows: bottom - row + 1 }
}

/**
 * 把选区里的元件和当前状态复制进剪贴板。
 * 锁定元件不复制（`cells` 里留 null），空格子也占位，粘贴时会拿它覆盖目标。
 */
export function captureSelection(
  cells: (Cell | null)[],
  levelCols: number,
  levelRows: number,
  selection: Selection,
  powerAt: (index: number) => number,
): Clipboard {
  const clipCols = Math.max(0, Math.min(selection.cols, levelCols - selection.col))
  const clipRows = Math.max(0, Math.min(selection.rows, levelRows - selection.row))
  const picked: (Cell | null)[] = new Array(clipCols * clipRows).fill(null)
  const powers: number[] = new Array(clipCols * clipRows).fill(0)

  for (let y = 0; y < clipRows; y++) {
    for (let x = 0; x < clipCols; x++) {
      const source = (selection.row + y) * levelCols + selection.col + x
      const cell = cells[source]
      if (!cell || cell.locked) continue
      const at = y * clipCols + x
      picked[at] = { ...cell }
      powers[at] = powerAt(source)
    }
  }

  return { cols: clipCols, rows: clipRows, cells: picked, powers }
}

/** 剪贴板里有没有真的复制到东西；空选区或只有锁定元件时为 false */
export const hasClipboardContent = (clipboard: Clipboard | null): boolean =>
  clipboard !== null && clipboard.cells.some((cell) => cell !== null)

/** 删除选区里的元件；锁定元件留在原地 */
export function eraseSelection(
  cells: (Cell | null)[],
  levelCols: number,
  selection: Selection,
): CellsChange {
  let next: (Cell | null)[] | null = null
  for (let y = 0; y < selection.rows; y++) {
    for (let x = 0; x < selection.cols; x++) {
      const index = (selection.row + y) * levelCols + selection.col + x
      const cell = cells[index]
      if (!cell || cell.locked) continue
      if (!next) next = cells.slice()
      next[index] = null
    }
  }
  return { cells: next ?? cells, changed: next !== null }
}

/**
 * 以当前选区左上角为起点粘贴：剪贴板里的空格也会把目标格的元件清掉，
 * 超出地图的部分丢弃，目标格锁定时不覆盖。`placed` 只记非空元件。
 */
export function pasteClipboard(
  cells: (Cell | null)[],
  levelCols: number,
  levelRows: number,
  selection: Selection,
  clipboard: Clipboard,
): PasteResult {
  let next: (Cell | null)[] | null = null
  const placed: PlacedCell[] = []
  let changed = false

  for (let y = 0; y < clipboard.rows; y++) {
    for (let x = 0; x < clipboard.cols; x++) {
      const col = selection.col + x
      const row = selection.row + y
      if (col < 0 || row < 0 || col >= levelCols || row >= levelRows) continue

      const index = row * levelCols + col
      if (cells[index]?.locked) continue

      const at = y * clipboard.cols + x
      const copy = clipboard.cells[at]
      if (!copy) {
        // 空方块也会覆盖：目标原来有元件就清掉
        if (!cells[index]) continue
        if (!next) next = cells.slice()
        next[index] = null
        changed = true
        continue
      }

      if (!next) next = cells.slice()
      const cell = { ...copy }
      delete cell.locked
      next[index] = cell
      placed.push({ index, cell, power: clipboard.powers[at] ?? 0 })
      changed = true
    }
  }

  return { cells: next ?? cells, changed, placed }
}

export interface PasteCircuitState {
  powers: Record<number, number>
  inputs: Record<string, 0 | 1>
}

/**
 * 粘贴后要交给 `Simulation.restore()` 的电路状态：
 * 先保留现场每格的电平 / 输入，再把剪贴板记下的激活状态盖到贴上去的格子上。
 * 复制进来的输入元件带着复制那一刻的 0 / 1；其它输入保持玩家现在拨的值。
 */
export function pasteCircuitState(
  state: CircuitState,
  currentInputs: Record<string, 0 | 1>,
  placed: PlacedCell[],
): PasteCircuitState {
  const powers: Record<number, number> = { ...state.powers }
  const inputs: Record<string, 0 | 1> = { ...currentInputs }
  for (const item of placed) {
    powers[item.index] = item.power
    if (item.cell.type === 'input' && item.cell.id) {
      inputs[item.cell.id] = item.power & 1 ? 1 : 0
    }
  }
  return { powers, inputs }
}

/** 选区的快捷键：剪切 X、复制 C、粘贴 V、删除 Delete（也认 Mac 的退格） */
export type SelectionAction = 'cut' | 'copy' | 'paste' | 'delete'

export function selectionActionForKey(key: string): SelectionAction | null {
  switch (key.toLowerCase()) {
    case 'x':
      return 'cut'
    case 'c':
      return 'copy'
    case 'v':
      return 'paste'
    case 'delete':
    case 'backspace':
      return 'delete'
    default:
      return null
  }
}
