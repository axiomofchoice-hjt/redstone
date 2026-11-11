import { useMemo } from 'react'
import type { Dir, Level } from '../game/types'
import { MAX_ZOOM, MIN_ZOOM } from './camera'
import { DIRECTIONS, usePaletteKeys } from './keyboard'
import { portsFor } from './ports'
import { isToolActive, toolItems, toolSpec, type Tool } from './tools'
import { ToolIcon } from './ToolIcon'
import { Waveform } from './Waveform'
import type { WaveSample } from './waveform'
import type { EditMode } from './edit-mode'
import type { TraceInfo } from './trace'
import { ArrowUp } from './icons'

interface Props {
  level: Level
  tool: Tool
  /** 电脑端左键模式：按钮上显示的就是当前模式 */
  mode: EditMode
  dir: Dir
  zoom: number
  inputs: Record<string, 0 | 1>
  /** 最近一段时间的输入 / 输出采样，波形图用 */
  history: WaveSample[]
  /** 当前 tick，波形窗口的右端 */
  tick: number
  outputAt: (id: string) => boolean
  /** 测试失败后的回放；有值时元件、模式和方向都不能改，波形多画参考解和检查区间 */
  trace: TraceInfo | null
  /** 参考解那几条输出线的采样 */
  refHistory: WaveSample[]
  onTool: (tool: Tool) => void
  onMode: () => void
  onDir: (dir: Dir) => void
  onZoom: (zoom: number) => void
  onToggleInput: (id: string) => void
  /** 回放时点波形跳到这一刻 */
  onSeek: (tick: number) => void
}

/** 电脑端左侧面板：只保留元件、朝向、信号和测试结果，能省的字都省掉 */
export function Inspector({
  level,
  tool,
  mode,
  dir,
  zoom,
  inputs,
  history,
  tick,
  outputAt,
  trace,
  refHistory,
  onTool,
  onMode,
  onDir,
  onZoom,
  onToggleInput,
  onSeek,
}: Props) {
  const ports = useMemo(() => portsFor(level), [level])
  const replay = trace !== null
  // WASD / 方向键在电脑端留给画布平移，这里只认数字键
  usePaletteKeys(level, ports, null, onTool, replay)

  const tools = useMemo(() => toolItems(level, ports), [level, ports])

  // 波形把关卡声明的端口都列出来：没放到地图上的也占一行，输出按 0 画，输入按玩家设置
  const inputIds = level.inputs ?? []
  const outputIds = level.outputs ?? []

  return (
    <aside className="inspector" aria-label="工具与状态">
      <div className="tool-grid">
        {tools.map((item) => {
          const active = isToolActive(tool, item)
          return (
            <button
              key={`${item.type}-${item.id ?? ''}`}
              type="button"
              className={active ? 'tool-tile active' : 'tool-tile'}
              disabled={item.disabled || replay}
              title={item.label}
              onClick={() => onTool(toolSpec(item))}
            >
              <ToolIcon type={item.type} id={item.id} dir={dir} size={38} />
              <span className="tool-label">{item.label}</span>
            </button>
          )
        })}
      </div>

      <div className="control-row">
        <div className="dir-pad" role="group" aria-label="朝向">
          {DIRECTIONS.map((item) => (
            <button
              key={item.key}
              type="button"
              className={dir === item.dir ? 'dir-btn active' : 'dir-btn'}
              style={{ gridArea: item.area }}
              disabled={replay}
              aria-label={`朝${item.label}`}
              title={`朝${item.label}`}
              onClick={() => onDir(item.dir)}
            >
              <span
                className="dir-arrow"
                style={{ transform: `rotate(${item.dir * 90}deg)` }}
              >
                <ArrowUp size={15} />
              </span>
            </button>
          ))}
        </div>

        <div className="mode-switch">
          <button
            type="button"
            className={`mode-btn ${mode === 'place' ? 'mode-place' : 'mode-overwrite'}`}
            title={
              mode === 'place'
                ? '当前：放置模式 · 点输入元件拨 0 / 1，放元件不会覆盖已有元件；点击切到覆盖模式'
                : '当前：覆盖模式 · 放元件会盖掉已有元件；点击切到放置模式'
            }
            aria-label={
              mode === 'place'
                ? '当前放置模式，点击切换到覆盖模式'
                : '当前覆盖模式，点击切换到放置模式'
            }
            disabled={replay}
            onClick={onMode}
          >
            {mode === 'place' ? '放置' : '覆盖'}
          </button>
          <button
            type="button"
            className={tool === 'erase' ? 'mode-btn active' : 'mode-btn'}
            aria-pressed={tool === 'erase'}
            title="删除：点击或拖动清除，右键也能拖着删"
            disabled={replay}
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

      {trace ? <p className="wave-note">回放：{trace.name} · 点波形跳转</p> : null}
      {inputIds.length > 0 || outputIds.length > 0 ? (
        <Waveform
          history={history}
          tick={tick}
          inputIds={inputIds}
          outputIds={outputIds}
          inputs={inputs}
          outputAt={outputAt}
          onToggleInput={onToggleInput}
          interactive={!replay}
          refHistory={replay ? refHistory : null}
          checks={trace?.checks}
          pairs={trace?.pairs}
          span={trace ? trace.lastTick + 1 : undefined}
          onSeek={onSeek}
        />
      ) : null}

      <div className="inspector-hints">
        <p className="inspector-hint">左键放置 · 右键删除 · 滚轮换朝向 · 方向键移动地图</p>
      </div>
    </aside>
  )
}
