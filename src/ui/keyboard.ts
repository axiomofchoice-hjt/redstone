import { useEffect } from 'react'
import type { CellType, Dir, Level } from '../game/types'
import { TOOLS, toolEnabled } from './tools'

const KEY_DIRS: Record<string, Dir> = { w: 0, a: 3, s: 2, d: 1 }

export interface PaletteTool {
  type: CellType
  id?: string
}

export interface PalettePort {
  type: CellType
  id: string
}

/** WASD 对应的方向；不认识的键返回 null */
export const dirForKey = (key: string): Dir | null => KEY_DIRS[key.toLowerCase()] ?? null

/** 方向按顺时针排：上 0、右 1、下 2、左 3；鼠标滚轮一格转 90° */
export const rotateDir = (dir: Dir, step: number): Dir =>
  ((((dir + step) % 4) + 4) % 4) as Dir

/** 1～9 对应的元件栏位置；其他键返回 null */
export const toolIndexForKey = (key: string): number | null =>
  /^[1-9]$/.test(key) ? Number(key) - 1 : null

/**
 * 数字键对应的元件：1～5 是基础元件，6 起依次是元件栏里剩下的输入 / 输出。
 * 这关不让用的元件返回 null。
 */
export const toolForKey = (
  key: string,
  level: Level,
  ports: PalettePort[],
): PaletteTool | null => {
  const index = toolIndexForKey(key)
  if (index === null) return null
  if (index < TOOLS.length) {
    const item = TOOLS[index]
    return toolEnabled(level, item.type) ? { type: item.type } : null
  }
  const port = ports[index - TOOLS.length]
  return port ? { type: port.type, id: port.id } : null
}

export const isTypingTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) return false
  return (
    target.isContentEditable ||
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.tagName === 'SELECT'
  )
}

/**
 * 游戏页挂载时用数字键操作元件栏。
 * 手机端传 onDir，额外用 WASD 换朝向；电脑端传 null，WASD 和方向键留给地图平移。
 * 回放时传 disabled，元件栏和方向键都变灰，键盘也别偷偷改选。
 */
export function usePaletteKeys(
  level: Level,
  ports: PalettePort[],
  onDir: ((dir: Dir) => void) | null,
  onTool: (tool: PaletteTool) => void,
  disabled = false,
): void {
  useEffect(() => {
    if (disabled) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return
      if (isTypingTarget(event.target)) return

      const dir = onDir ? dirForKey(event.key) : null
      if (onDir && dir !== null) {
        event.preventDefault()
        onDir(dir)
        return
      }

      const tool = toolForKey(event.key, level, ports)
      if (!tool) return
      event.preventDefault()
      onTool(tool)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [level, ports, onDir, onTool, disabled])
}
