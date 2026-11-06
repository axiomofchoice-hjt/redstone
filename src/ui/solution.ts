import type { Cell, Level } from '../game/types'

/**
 * 菜单里「参考答案」要盖到地图上的元件：没有参考解就返回 null。
 * 每次都复制一份，盖完以后玩家接着改，不会改到关卡数据本身。
 */
export const solutionCells = (level: Level): (Cell | null)[] | null => {
  if (!level.solution) return null
  return level.solution.map((cell) => (cell ? { ...cell } : null))
}
