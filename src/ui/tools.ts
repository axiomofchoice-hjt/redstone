import type { CellType, Level } from '../game/types'

/** 这关能不能用某种元件；关卡没写 tools 就是全都可用 */
export function toolEnabled(level: Level, type: CellType): boolean {
  return !level.tools || level.tools.includes(type)
}
