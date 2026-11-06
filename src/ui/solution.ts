import type { Cell, CircuitState, Level, Solution } from '../game/types'

const cloneState = (state: CircuitState): CircuitState => ({
  ...state,
  inputs: { ...state.inputs },
  outputs: { ...state.outputs },
  powers: state.powers.slice(),
})

/**
 * 菜单里「参考答案」要盖到地图上的布局和电路状态：没有参考解就返回 null。
 * 每次都复制一份，盖完以后玩家接着改，不会改到关卡数据本身。
 */
export const solutionMap = (level: Level): Solution | null => {
  if (!level.solution) return null
  return {
    cells: level.solution.cells.map((cell) => (cell ? { ...cell } : null)),
    state: cloneState(level.solution.state),
  }
}

/** 只关心参考解元件数组时的便捷函数 */
export const solutionCells = (level: Level): (Cell | null)[] | null =>
  solutionMap(level)?.cells ?? null
