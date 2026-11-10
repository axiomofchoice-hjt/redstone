import { useState } from 'react'
import { hasDirection } from '../game/sim'
import type { LevelRun } from '../game/sim'
import type { Dir, Level } from '../game/types'
import { Board } from './Board'
import {
  CheckIcon,
  CrossIcon,
  DotsIcon,
  InfoIcon,
  MenuIcon,
  PauseIcon,
  PlayIcon,
  PrevIcon,
  StepIcon,
} from './icons'
import { Palette } from './Palette'
import type { Tool } from './Palette'
import { Waveform } from './Waveform'
import type { WaveSample } from './waveform'
import type { TraceInfo } from './trace'

interface Props {
  level: Level
  /** 自由模式：没有关卡号、端口和测试，相关按钮收起来 */
  free: boolean
  tool: Tool
  dir: Dir
  run: LevelRun | null
  paused: boolean
  revision: number
  menuOpen: boolean
  history: WaveSample[]
  tick: number
  inputs: Record<string, 0 | 1>
  powerAt: (index: number) => number
  outputAt: (id: string) => boolean
  lockedAt: (index: number) => boolean
  /** 测试没通过后的回放；有值时元件栏换成回放波形 */
  trace: TraceInfo | null
  /** 参考解那几条输出线的采样 */
  refHistory: WaveSample[]
  /** 回放已经走到最后一刻，不能再往后单步 */
  traceEnd: boolean
  onTool: (tool: Tool) => void
  onDir: (dir: Dir) => void
  onCell: (index: number) => void
  onErase: (index: number) => void
  onToggleInput: (id: string) => void
  onRun: () => void
  onPause: () => void
  onNextTick: () => void
  onPrevTick: () => void
  onOpenTrace: () => void
  onCloseTrace: () => void
  onMenuToggle: () => void
  onContinue: () => void
  onSolution: () => void
  onExport: () => void
  onLevels: () => void
}

/** 手机端游戏界面：原来的单列布局，地图占满中间，元件栏在底部 */
export function GameMobile({
  level,
  free,
  tool,
  dir,
  run,
  paused,
  revision,
  menuOpen,
  history,
  tick,
  inputs,
  powerAt,
  lockedAt,
  outputAt,
  trace,
  refHistory,
  traceEnd,
  onTool,
  onDir,
  onCell,
  onErase,
  onToggleInput,
  onRun,
  onPause,
  onNextTick,
  onPrevTick,
  onOpenTrace,
  onCloseTrace,
  onMenuToggle,
  onContinue,
  onSolution,
  onExport,
  onLevels,
}: Props) {
  // 信息页只盖住地图和操控区，顶栏不动；再点一次 ⓘ 或「返回地图」就退出来
  const [infoOpen, setInfoOpen] = useState(false)

  const toggleInfo = () => {
    if (menuOpen) onContinue()
    setInfoOpen((open) => !open)
  }

  // 回放和「交互」两种波形共用同一份数据，只在回放时多画参考解和检查区间
  const wave = {
    history,
    tick,
    inputIds: level.inputs ?? [],
    outputIds: level.outputs ?? [],
    inputs,
    outputAt,
    onToggleInput,
  }

  return (
    <div className="app">
      <header className="top">
        <div className="head">
          <h1>
            {level.no ? `第 ${level.no} 关 · ` : ''}
            {level.name}
          </h1>
          <div className="head-keys">
            <button
              type="button"
              className="menu"
              aria-label="本关目标"
              aria-pressed={infoOpen}
              title="本关目标"
              onClick={toggleInfo}
            >
              <InfoIcon size={15} />
            </button>
            <button
              type="button"
              className="menu"
              aria-label="菜单"
              aria-expanded={menuOpen}
              title="菜单"
              onClick={() => {
                setInfoOpen(false)
                onMenuToggle()
              }}
            >
              <MenuIcon size={15} />
            </button>
          </div>
        </div>
      </header>

      {menuOpen ? (
        // 菜单打开时把地图和底部栏都让出来，按钮放在中间
        <div className="menu-screen">
          <div className="menu-actions">
            <button type="button" className="btn primary menu-btn" onClick={onContinue}>
              继续游戏
            </button>
            <button
              type="button"
              className="btn menu-btn"
              disabled={!level.solution}
              onClick={onSolution}
            >
              参考答案
            </button>
            <button type="button" className="btn menu-btn" onClick={onExport}>
              导出地图
            </button>
            <button type="button" className="btn menu-btn" onClick={onLevels}>
              返回选关界面
            </button>
          </div>
        </div>
      ) : infoOpen ? (
        // 只写本关目标：地图、工具栏、元件栏都不显示，顶栏保留
        <div className="info-screen">
          <div className="info-card">
            <p className="info-label">{free ? '自由模式' : '本关目标'}</p>
            <p className="info-text">{level.brief?.trim() || '这一关还没写目标说明。'}</p>
            <button
              type="button"
              className="btn primary menu-btn"
              onClick={() => setInfoOpen(false)}
            >
              返回地图
            </button>
          </div>
        </div>
      ) : (
        <>
          <Board
            level={level}
            cells={level.cells}
            powerAt={powerAt}
            lockedAt={lockedAt}
            revision={revision}
            onCell={onCell}
            onErase={onErase}
            preview={trace ? null : tool}
            previewDir={
              tool !== 'erase' && tool !== 'interact' && hasDirection(tool.type) ? dir : undefined
            }
          />

          <div className="toolbar">
            {/* 未通过时点它进入回放，再点一次回到元件栏；自由模式没有测试 */}
            {free ? null : (
              <button
                type="button"
                className={run?.passed ? 'result ok' : !run ? 'result' : 'result fail'}
                disabled={run === null || run.passed}
                onClick={trace ? onCloseTrace : onOpenTrace}
                title={
                  run === null
                    ? '还没运行测试'
                    : run.passed
                      ? '测试全部通过'
                      : trace
                        ? '收起回放，回到元件栏'
                        : '测试未通过，点这里看回放波形'
                }
              >
                测试结果：
                {run === null ? <DotsIcon /> : run.passed ? <CheckIcon /> : <CrossIcon />}
              </button>
            )}
            <div className="actions">
              {free ? null : trace ? (
                // 回放时这一格换成「上一刻」：光标往前挪一个 tick
                <button
                  type="button"
                  className="debug icon"
                  onClick={onPrevTick}
                  disabled={!paused || tick <= 0}
                  aria-label="上一刻"
                  title={paused ? '上一刻：回放往前退一个 tick' : '暂停后才能回退'}
                >
                  <PrevIcon size={14} />
                </button>
              ) : (
                <button
                  type="button"
                  className={tool === 'interact' ? 'debug active' : 'debug'}
                  aria-pressed={tool === 'interact'}
                  title="交互：点输入元件切换 0 / 1"
                  onClick={() => onTool('interact')}
                >
                  交互
                </button>
              )}
              <button
                type="button"
                className="debug icon"
                aria-label={paused ? '继续' : '暂停'}
                title={paused ? '继续' : '暂停'}
                onClick={onPause}
              >
                {paused ? <PlayIcon size={14} /> : <PauseIcon size={14} />}
              </button>
              <button
                type="button"
                className="debug icon"
                onClick={onNextTick}
                disabled={!paused || traceEnd}
                aria-label={traceEnd ? '回放已到最后' : trace ? '下一刻回放' : '推进一个 tick'}
                title={traceEnd ? '已到最后一刻' : trace ? '下一刻：回放往后走一个 tick' : '推进一个 tick'}
              >
                <StepIcon size={14} />
              </button>
              {free ? null : (
                <button type="button" className="run" onClick={onRun} title="运行测试">
                  测试
                </button>
              )}
            </div>
          </div>

          {trace ? (
            // 回放模式：元件栏换成波形图，测试事件驱动输入，再并几条参考解的输出
            <div className="wave-panel">
              <p className="wave-note">回放：{trace.name}</p>
              <Waveform
                {...wave}
                interactive={false}
                refHistory={refHistory}
                checks={trace.checks}
              />
            </div>
          ) : tool === 'interact' ? (
            // 交互模式：元件栏换成波形图，点行首的字母就能拨输入
            <div className="wave-panel">
              <Waveform {...wave} />
            </div>
          ) : (
            <Palette level={level} tool={tool} dir={dir} onTool={onTool} onDir={onDir} />
          )}
        </>
      )}
    </div>
  )
}
