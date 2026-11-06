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

const isTypingTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) return false
  return (
    target.isContentEditable ||
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.tagName === 'SELECT'
  )
}

/** 游戏页挂载时用 WASD 和数字键操作元件栏；菜单打开时元件栏本来就不在 */
export function usePaletteKeys(
  level: Level,
  ports: PalettePort[],
  onDir: (dir: Dir) => void,
  onTool: (tool: PaletteTool) => void,
): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return
      if (isTypingTarget(event.target)) return

      const dir = dirForKey(event.key)
      if (dir !== null) {
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
  }, [level, ports, onDir, onTool])
}
