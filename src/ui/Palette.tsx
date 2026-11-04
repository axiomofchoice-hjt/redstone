import type { CellType, Dir } from '../game/types'

export type Tool = CellType | 'erase'

const TOOLS: { type: CellType; label: string }[] = [
  { type: 'wire', label: '导线' },
  { type: 'cross', label: '交叉' },
  { type: 'charger', label: '充能' },
  { type: 'not', label: '非门' },
  { type: 'input', label: '输入' },
  { type: 'output', label: '输出' },
]

const DIR_BUTTONS: { dir: Dir; label: string; area: string }[] = [
  { dir: 0, label: 'W', area: 'up' },
  { dir: 3, label: 'A', area: 'left' },
  { dir: 2, label: 'S', area: 'down' },
  { dir: 1, label: 'D', area: 'right' },
]

interface Props {
  tool: Tool
  dir: Dir
  onTool: (tool: Tool) => void
  onDir: (dir: Dir) => void
}

export function Palette({ tool, dir, onTool, onDir }: Props) {
  return (
    <div className="palette">
      <div className="tools">
        {TOOLS.map((item) => (
          <button
            key={item.type}
            type="button"
            className={tool === item.type ? 'tool active' : 'tool'}
            onClick={() => onTool(item.type)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="side">
        <div className="dpad">
          {DIR_BUTTONS.map((item) => (
            <button
              key={item.label}
              type="button"
              className={`dir ${item.area}${dir === item.dir ? ' active' : ''}`}
              style={{ gridArea: item.area }}
              onClick={() => onDir(item.dir)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          className={tool === 'erase' ? 'erase active' : 'erase'}
          onClick={() => onTool('erase')}
        >
          删除
        </button>
      </div>
    </div>
  )
}
