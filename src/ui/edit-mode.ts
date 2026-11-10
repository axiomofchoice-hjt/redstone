import type { Cell } from '../game/types'

/**
 * 电脑端左键的两种模式：
 * - 放置：点输入元件拨 0 / 1，放元件只填空格，不覆盖已有元件
 * - 覆盖：放元件直接替换格子上的元件
 */
export type EditMode = 'place' | 'overwrite'

export type CellAction =
  | { type: 'toggle'; id: string }
  | { type: 'place' }
  | { type: 'blocked' }

/** 左键点一格时该做什么；cell 是这一格现在的元件 */
export function editAction(mode: EditMode, cell: Cell | null): CellAction {
  if (mode === 'overwrite') return { type: 'place' }
  if (cell?.type === 'input' && cell.id) return { type: 'toggle', id: cell.id }
  if (cell) return { type: 'blocked' }
  return { type: 'place' }
}
