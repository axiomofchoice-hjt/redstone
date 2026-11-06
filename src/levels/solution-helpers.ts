import type { Cell, CircuitState } from '../game/types'

/** 用导出的稀疏 cells 构造铺平数组，key 是行优先下标 */
export const cellsFrom = (size: number, sparse: Record<number, Cell>): (Cell | null)[] => {
  const cells = new Array<Cell | null>(size).fill(null)
  for (const [index, cell] of Object.entries(sparse)) cells[Number(index)] = { ...cell }
  return cells
}

/** 用非零的通电位构造 state.powers，没列出的格子为 0 */
export const stateFrom = (
  size: number,
  state: Pick<CircuitState, 'tick' | 'inputs' | 'outputs'>,
  powers: Record<number, number> = {},
): CircuitState => {
  const values = new Array<number>(size).fill(0)
  for (const [index, value] of Object.entries(powers)) values[Number(index)] = value
  return { ...state, powers: values }
}
