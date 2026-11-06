import type { CellType, Level } from '../game/types'

/** 这关能不能用某种元件；关卡没写 tools 就是全都可用 */
export function toolEnabled(level: Level, type: CellType): boolean {
  return !level.tools || level.tools.includes(type)
}

/** 元件栏里的顺序，也是选默认元件时的优先级 */
export const TOOLS: { type: CellType; label: string }[] = [
  { type: 'wire', label: '导线' },
  { type: 'cross', label: '交叉' },
  { type: 'charger', label: '充能' },
  { type: 'repeater', label: '中继' },
  { type: 'not', label: '非门' },
]

/** 换关时默认选这关能用的第一个元件 */
export function defaultTool(level: Level): CellType {
  return TOOLS.find((item) => toolEnabled(level, item.type))?.type ?? 'wire'
}
