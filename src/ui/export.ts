import type { Simulation } from '../game/sim'
import type { Cell, Level } from '../game/types'

/** 导出用的文件名：当前地图和电路状态 */
export const mapFileName = (level: Level): string => `${level.id}-map.json`

/** 稀疏化：只保留有元件的格子，key 是行优先下标 */
const sparseCells = (cells: (Cell | null)[]): Record<string, Cell> => {
  const result: Record<string, Cell> = {}
  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i]
    if (cell) result[i] = cell
  }
  return result
}

/** 当前地图 + 点下按钮那一刻的电路状态；`cells` 只记录非空格子 */
export const mapJson = (level: Level, sim: Simulation): string => {
  return JSON.stringify(
    {
      id: level.id,
      cols: level.cols,
      rows: level.rows,
      state: sim.circuitState(),
      cells: sparseCells(level.cells),
    },
    null,
    2,
  )
}

/** 把一段文本当文件下载下来 */
export const download = (name: string, text: string, type = 'application/json'): void => {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const link = document.createElement('a')
  link.href = url
  link.download = name
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  link.remove()
  // 立刻 revoke 在部分浏览器里会让下载中断，留一点时间
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
