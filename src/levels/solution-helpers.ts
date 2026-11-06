import type { Cell, CircuitState } from '../game/types'

/** 用导出的稀疏 cells 构造铺平数组，key 是行优先下标 */
export const cellsFrom = (size: number, sparse: Record<number, Cell>): (Cell | null)[] => {
  const cells = new Array<Cell | null>(size).fill(null)
  for (const [index, cell] of Object.entries(sparse)) cells[Number(index)] = { ...cell }
  return cells
}

/** 参考解的状态：通电位和 cells 一样稀疏，没列出的格子就是 0 */
export const stateFrom = (
  state: Pick<CircuitState, 'tick' | 'inputs' | 'outputs'>,
  powers: Record<number, number> = {},
): CircuitState => ({ ...state, powers: { ...powers } })
