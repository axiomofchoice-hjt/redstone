import type { CellType, Level } from '../game/types'

/** 元件栏里的一个输入 / 输出按钮 */
export interface Port {
  type: CellType
  id: string
}

/**
 * 元件栏里的输入 / 输出按钮：关卡已经预置在地图上且锁定的，就不再出现。
 */
export function portsFor(level: Level): Port[] {
  const placed = new Set(
    level.cells.flatMap((cell) =>
      cell?.locked && cell.id && (cell.type === 'input' || cell.type === 'output') ? [cell.id] : [],
    ),
  )
  // 输入在前、输出在后，字母由关卡数据给出
  return [
    ...(level.inputs ?? []).map((id) => ({ type: 'input' as CellType, id })),
    ...(level.outputs ?? []).map((id) => ({ type: 'output' as CellType, id })),
  ].filter((port) => !placed.has(port.id))
}
