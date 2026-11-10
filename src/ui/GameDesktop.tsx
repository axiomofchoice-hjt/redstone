import { useEffect, useRef, useState } from 'react'
import { hasDirection } from '../game/sim'
import type { LevelRun } from '../game/sim'
import type { Dir, Level } from '../game/types'
import { Board } from './Board'
import { clampZoom, zoomAround, type Camera, type Viewport } from './camera'
import { Inspector } from './Inspector'
import { InfoIcon, Logo, MenuIcon, PauseIcon, PlayIcon, StepIcon } from './icons'
import type { Tool } from './Palette'
import type { EditMode } from './edit-mode'
import type { WaveSample } from './waveform'
import { padNo } from './levels-meta'

interface Props {
  level: Level
  /** 自由模式：没有关卡号、端口和测试，相关入口收起来 */
  free: boolean
  tool: Tool
  /** 电脑端左键模式：放置不覆盖已有元件、点输入元件拨 0 / 1 */
  mode: EditMode
  dir: Dir
  inputs: Record<string, 0 | 1>
  history: WaveSample[]
  tick: number
  run: LevelRun | null
  paused: boolean
  revision: number
  powerAt: (index: number) => number
  lockedAt: (index: number) => boolean
  outputAt: (id: string) => boolean
  onTool: (tool: Tool) => void
  onMode: () => void
  onDir: (dir: Dir) => void
  onCell: (index: number) => void
  onErase: (index: number) => void
  onToggleInput: (id: string) => void
  onSolution: () => void
  onExport: () => void
  onRun: () => void
  onPause: () => void
  onNextTick: () => void
  onRotate: (step: 1 | -1) => void
  onLevels: () => void
}

/** 电脑端游戏界面：顶栏（右上角关卡信息 + 菜单键）+ 左侧检查器 + 右侧画布 */
export function GameDesktop({
  level,
  free,
  tool,
  mode,
  dir,
  inputs,
  history,
  tick,
  run,
  paused,
  revision,
  powerAt,
  lockedAt,
  outputAt,
  onTool,
  onMode,
  onDir,
  onCell,
  onErase,
  onToggleInput,
  onSolution,
  onExport,
  onRun,
  onPause,
  onNextTick,
  onRotate,
  onLevels,
}: Props) {
  // 相机放在工作台这一层：画布负责平移，左侧滑轨直接改缩放。
  // 换关时外面的 key 会重新挂载，相机跟着回中。
  const [camera, setCamera] = useState<Camera>({ x: 0, y: 0, zoom: 1 })
  const viewport = useRef<Viewport | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [infoOpen, setInfoOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const zoomTo = (zoom: number) => {
    const view = viewport.current
    setCamera((cam) => (view ? zoomAround(cam, view, zoom) : { ...cam, zoom: clampZoom(zoom) }))
  }

  const toggleMenu = () => {
    setInfoOpen(false)
    setMenuOpen((open) => !open)
  }

  const toggleInfo = () => {
    setMenuOpen(false)
    setInfoOpen((open) => !open)
  }

  // 点菜单 / 关卡信息外面或者按 Esc 都收起来
  useEffect(() => {
    if (!menuOpen && !infoOpen) return
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target
      // 面板里的内容和开关键交给它们自己的 onClick，别在这里抢
      if (
        target instanceof Element &&
        (target.closest('.menu-panel') ||
          target.closest('.menu-key') ||
          target.closest('.info-panel') ||
          target.closest('.info-key'))
      ) {
        return
      }
      setMenuOpen(false)
      setInfoOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false)
        setInfoOpen(false)
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [menuOpen, infoOpen])

  const pick = (action: () => void) => () => {
    setMenuOpen(false)
    setInfoOpen(false)
    action()
  }

  return (
    <div className="game-desktop">
      <header className="appbar">
        <div className="brand">
          <span className="brand-mark">
            <Logo size={20} />
          </span>
          <span className="brand-name">红石电路</span>
        </div>

        <div className="crumb">
          {level.no ? <span className="crumb-kicker">第 {padNo(level.no)} 关</span> : null}
          <h1 className="crumb-title">{level.name}</h1>
        </div>

        <div className="appbar-actions" ref={menuRef}>
          <button
            type="button"
            className="btn icon"
            onClick={onPause}
            aria-label={paused ? '继续仿真' : '暂停仿真'}
            title={paused ? '继续仿真' : '暂停仿真'}
          >
            {paused ? <PlayIcon /> : <PauseIcon />}
          </button>
          <button
            type="button"
            className="btn icon"
            onClick={onNextTick}
            disabled={!paused}
            aria-label="推进一个 tick"
            title="推进一个 tick"
          >
            <StepIcon />
          </button>
          {free ? null : (
            <button type="button" className="btn primary" onClick={onRun} title="运行测试">
              测试
            </button>
          )}

          <button
            type="button"
            className="btn icon info-key"
            aria-label="关卡信息"
            aria-expanded={infoOpen}
            aria-controls="level-info"
            title="关卡信息"
            onClick={toggleInfo}
          >
            <InfoIcon />
          </button>

          <button
            type="button"
            className="btn icon menu-key"
            aria-label="菜单"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            title="菜单"
            onClick={toggleMenu}
          >
            <MenuIcon />
          </button>

          {menuOpen ? (
            <div className="menu-panel" role="menu" aria-label="菜单">
              <button
                type="button"
                role="menuitem"
                className="menu-item"
                disabled={!level.solution}
                onClick={pick(onSolution)}
              >
                参考答案
              </button>
              <button
                type="button"
                role="menuitem"
                className="menu-item"
                onClick={pick(onExport)}
              >
                导出地图
              </button>

              <div className="menu-sep" role="none" />

              <button type="button" role="menuitem" className="menu-item" onClick={pick(onLevels)}>
                返回选关
              </button>
            </div>
          ) : null}

          {infoOpen ? (
            <section id="level-info" className="info-panel" aria-label="关卡信息">
              <p className="info-label">{free ? '自由模式' : '本关目标'}</p>
              <p className="info-text">{level.brief?.trim() || '这一关还没写目标说明。'}</p>
            </section>
          ) : null}
        </div>
      </header>

      <div className="game-grid">
        <Inspector
          level={level}
          free={free}
          tool={tool}
          mode={mode}
          dir={dir}
          zoom={camera.zoom}
          inputs={inputs}
          history={history}
          tick={tick}
          outputAt={outputAt}
          run={run}
          onTool={onTool}
          onMode={onMode}
          onDir={onDir}
          onZoom={zoomTo}
          onToggleInput={onToggleInput}
        />

        <main className="stage">
          <Board
            key={level.id}
            level={level}
            cells={level.cells}
            powerAt={powerAt}
            lockedAt={lockedAt}
            revision={revision}
            onCell={onCell}
            onErase={onErase}
            preview={tool}
            previewDir={
              tool !== 'erase' && tool !== 'interact' && hasDirection(tool.type) ? dir : undefined
            }
            placeMode={mode === 'place'}
            workbench={{ camera, onCamera: setCamera, onRotate }}
            viewportRef={viewport}
          />
        </main>
      </div>
    </div>
  )
}
