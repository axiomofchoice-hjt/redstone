import { useMemo } from 'react'
import type { LevelRun } from '../game/sim'
import type { Dir, Level } from '../game/types'
import { MAX_ZOOM, MIN_ZOOM } from './camera'
import { usePaletteKeys } from './keyboard'
import { portsFor } from './ports'
import { TOOLS, toolEnabled } from './tools'
import { ToolIcon } from './ToolIcon'
import { ArrowUp } from './icons'
import type { Tool } from './Palette'

interface Props {
  level: Level
  tool: Tool
  dir: Dir
  zoom: number
  inputs: Record<string, 0 | 1>
  outputAt: (id: string) => boolean
  run: LevelRun | null
  onTool: (tool: Tool) => void
  onDir: (dir: Dir) => void
  onZoom: (zoom: number) => void
  onToggleInput: (id: string) => void
}

const DIR_BUTTONS: { dir: Dir; label: string; area: string }[] = [
  { dir: 0, label: '上', area: 'up' },
  { dir: 3, label: '左', area: 'left' },
  { dir: 2, label: '下', area: 'down' },
  { dir: 1, label: '右', area: 'right' },
]

/** 电脑端右侧面板：只保留元件、朝向、信号和测试结果，能省的字都省掉 */
export function Inspector({
  level,
  tool,
  dir,
  zoom,
  inputs,
  outputAt,
  run,
  onTool,
  onDir,
  onZoom,
  onToggleInput,
}: Props) {
  const ports = useMemo(() => portsFor(level), [level])
  // WASD / 方向键在电脑端留给画布平移，这里只认数字键
  usePaletteKeys(level, ports, null, onTool)

  const tools = useMemo(
    () => [
      ...TOOLS.map((item) => ({
        type: item.type,
        id: undefined as string | undefined,
        label: item.label,
        disabled: !toolEnabled(level, item.type),
      })),
      ...ports.map((item) => ({
        type: item.type,
        id: item.id as string | undefined,
        label: item.label,
        disabled: false,
      })),
    ],
    [level, ports],
  )

  const placed = useMemo(() => {
    const set = new Set<string>()
    for (const cell of level.cells) {
      if (cell?.id && (cell.type === 'input' || cell.type === 'output')) set.add(cell.id)
    }
    return set
  }, [level.cells])

  const inputIds = level.inputs ?? []
  const outputIds = level.outputs ?? []
  const outcomes = run?.outcomes ?? []
  const passed = outcomes.filter((outcome) => outcome.passed).length
  const testState = run === null ? '' : run.passed ? ' ok' : ' bad'

  return (
    <aside className="inspector" aria-label="工具与状态">
      <div className="tool-grid">
        {tools.map((item) => {
          const active = typeof tool === 'object' && tool.type === item.type && tool.id === item.id
          return (
            <button
              key={`${item.type}-${item.id ?? ''}`}
              type="button"
              className={
                active
                  ? item.type === 'input' || item.type === 'output'
                    ? 'tool-tile port active'
                    : 'tool-tile active'
                  : 'tool-tile'
              }
              disabled={item.disabled}
              title={item.label}
              onClick={() =>
                onTool(item.id ? { type: item.type, id: item.id } : { type: item.type })
              }
            >
              <ToolIcon type={item.type} id={item.id} dir={dir} active={active} size={34} />
              <span className="tool-label">{item.label}</span>
            </button>
          )
        })}
      </div>

      <div className="control-row">
        <div className="dir-pad" role="group" aria-label="朝向">
          {DIR_BUTTONS.map((item) => (
            <button
              key={item.label}
              type="button"
              className={dir === item.dir ? 'dir-btn active' : 'dir-btn'}
              style={{ gridArea: item.area }}
              aria-label={`朝${item.label}`}
              title={`朝${item.label}`}
              onClick={() => onDir(item.dir)}
            >
              <span
                className="dir-arrow"
                style={{ transform: `rotate(${[0, 90, 180, -90][item.dir]}deg)` }}
              >
                <ArrowUp size={13} />
              </span>
            </button>
          ))}
        </div>

        <div className="mode-switch">
          <button
            type="button"
            className={tool === 'interact' ? 'mode-btn active' : 'mode-btn'}
            aria-pressed={tool === 'interact'}
            title="交互：点击输入元件切换 0 / 1"
            onClick={() => onTool('interact')}
          >
            交互
          </button>
          <button
            type="button"
            className={tool === 'erase' ? 'mode-btn active' : 'mode-btn'}
            aria-pressed={tool === 'erase'}
            title="删除：点击或拖动清除，右键也能拖着删"
            onClick={() => onTool('erase')}
          >
            删除
          </button>
        </div>
      </div>

      <div className="zoom-row">
        <span className="zoom-label">缩放</span>
        <input
          className="zoom-slider"
          type="range"
          min={MIN_ZOOM}
          max={MAX_ZOOM}
          step={0.05}
          value={zoom}
          aria-label="地图缩放"
          onChange={(event) => onZoom(Number(event.target.value))}
          // 鼠标松开后放掉焦点，WASD / 方向键才能直接接着平移地图
          onPointerUp={(event) => {
            if (event.pointerType === 'mouse') event.currentTarget.blur()
          }}
        />
        <span className="zoom-value">{Math.round(zoom * 100)}%</span>
      </div>

      {inputIds.length > 0 || outputIds.length > 0 ? (
        <div className="signals">
          {inputIds.length > 0 ? (
            <div className="signal-row">
              <span className="signal-label">输入</span>
              {inputIds.map((id) => {
                const on = (inputs[id] ?? 0) === 1
                const present = placed.has(id)
                return (
                  <button
                    key={id}
                    type="button"
                    className={`signal-chip${on ? ' on' : ''}${present ? '' : ' missing'}`}
                    disabled={!present}
                    aria-pressed={on}
                    title={present ? `切换输入 ${id}` : `输入 ${id} 还没放到地图上`}
                    onClick={() => onToggleInput(id)}
                  >
                    <span className="signal-letter">{id}</span>
                    <span className="signal-value">{present ? (on ? '1' : '0') : '—'}</span>
                  </button>
                )
              })}
            </div>
          ) : null}

          {outputIds.length > 0 ? (
            <div className="signal-row">
              <span className="signal-label">输出</span>
              {outputIds.map((id) => {
                const on = outputAt(id)
                const present = placed.has(id)
                return (
                  <div
                    key={id}
                    className={`signal-chip output${on ? ' on' : ''}${present ? '' : ' missing'}`}
                    role="img"
                    aria-label={`输出 ${id}：${present ? (on ? '1' : '0') : '未放置'}`}
                    title={present ? `输出 ${id} = ${on ? 1 : 0}` : `输出 ${id} 还没放到地图上`}
                  >
                    <span className="signal-letter">{id}</span>
                    <span className="signal-lamp" aria-hidden="true" />
                  </div>
                )
              })}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className={`test-line${testState}`} role="status">
        <span className="test-dot" aria-hidden="true" />
        <span>
          {run === null ? '未运行' : run.passed ? '全部通过' : `${outcomes.length - passed} 组未通过`}
        </span>
      </div>

      <div className="inspector-hints">
        <p className="inspector-hint">滚轮换朝向 · WASD / 方向键移图</p>
        <p className="inspector-hint">左键拖动连续放置 · 右键拖动连续删除</p>
      </div>
    </aside>
  )
}
