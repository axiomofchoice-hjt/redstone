import { useMemo } from 'react'
import type { Dir, Level } from '../game/types'
import { TrashIcon } from './icons'
import { DIRECTIONS, usePaletteKeys } from './keyboard'
import { portsFor } from './ports'
import { isToolActive, toolItems, toolSpec, type Tool } from './tools'
import { ToolIcon } from './ToolIcon'

interface Props {
  level: Level
  tool: Tool
  dir: Dir
  onTool: (tool: Tool) => void
  onDir: (dir: Dir) => void
}

export function Palette({ level, tool, dir, onTool, onDir }: Props) {
  const ports = useMemo(() => portsFor(level), [level])
  usePaletteKeys(level, ports, onDir, onTool)
  const items = toolItems(level, ports)

  return (
    <div className="palette">
      <div className="tools">
        {items.map((item, index) => {
          const active = isToolActive(tool, item)
          return (
            <button
              key={`${item.type}-${item.id ?? ''}`}
              type="button"
              className={active ? 'tool active' : 'tool'}
              disabled={item.disabled}
              aria-label={item.label}
              title={`${index + 1 <= 9 ? `${index + 1} · ` : ''}${item.label}`}
              onClick={() => onTool(toolSpec(item))}
            >
              <ToolIcon type={item.type} id={item.id} dir={dir} invert={active} />
            </button>
          )
        })}
      </div>

      <div className="side">
        <div className="dpad">
          {DIRECTIONS.map((item) => (
            <button
              key={item.key}
              type="button"
              className={`dir ${item.area}${dir === item.dir ? ' active' : ''}`}
              onClick={() => onDir(item.dir)}
            >
              {item.key}
            </button>
          ))}
        </div>
        <div className="stack">
          <button
            type="button"
            className={tool === 'erase' ? 'erase active' : 'erase'}
            aria-label="删除"
            title="删除（右键地图也可以直接删掉一格）"
            onClick={() => onTool('erase')}
          >
            <TrashIcon size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
