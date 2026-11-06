import type { Level } from '../game/types'

/** 导出用的文件名：只导当前地图上的元件数组 */
export const cellsFileName = (level: Level): string => `${level.id}-cells.json`

/** 地图上的元件数组，按行铺平，空格是 null，可直接贴进关卡文件 */
export const cellsJson = (level: Level): string => JSON.stringify(level.cells, null, 2)

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
