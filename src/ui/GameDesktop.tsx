import { useEffect, useRef, useState } from 'react'
import { hasDirection } from '../game/sim'
import type { LevelRun } from '../game/sim'
import type { Dir, Level } from '../game/types'
import { Board } from './Board'
import { clampZoom, zoomAround, type Camera, type Viewport } from './camera'
import { Inspector } from './Inspector'
import { Logo, MenuIcon, PauseIcon, PlayIcon, StepIcon } from './icons'
import type { Tool } from './Palette'
import { padNo } from './levels-meta'

interface Props {
  level: Level
  tool: Tool
  dir: Dir
  inputs: Record<string, 0 | 1>
  run: LevelRun | null
  paused: boolean
  revision: number
  powerAt: (index: number) => number
  lockedAt: (index: number) => boolean
  outputAt: (id: string) => boolean
  onTool: (tool: Tool) => void
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
  onHome: () => void
  onLevels: () => void
}

/** 电脑端游戏界面：顶栏（右上角一个菜单键）+ 左侧检查器 + 右侧画布 */
export function GameDesktop({
  level,
  tool,
  dir,
  inputs,
  run,
  paused,
  revision,
  powerAt,
  lockedAt,
  outputAt,
  onTool,
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
  onHome,
  onLevels,
}: Props) {
  // 相机放在工作台这一层：画布负责平移，左侧滑轨直接改缩放。
  // 换关时外面的 key 会重新挂载，相机跟着回中。
  const [camera, setCamera] = useState<Camera>({ x: 0, y: 0, zoom: 1 })
  const viewport = useRef<Viewport | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const zoomTo = (zoom: number) => {
    const view = viewport.current
    setCamera((cam) => (view ? zoomAround(cam, view, zoom) : { ...cam, zoom: clampZoom(zoom) }))
  }

  // 点菜单外面或者按 Esc 都收起来
  useEffect(() => {
    if (!menuOpen) return
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target
      // 菜单里的项交给它自己的 onClick；菜单键负责开关，别在这里抢
      if (
        target instanceof Element &&
        (target.closest('.menu-panel') || target.closest('.menu-key'))
      ) {
        return
      }
      setMenuOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [menuOpen])

  const pick = (action: () => void) => () => {
    setMenuOpen(false)
    action()
  }

  return (
    <div className="game-desktop">
      <header className="appbar">
        <button type="button" className="brand" onClick={onHome} title="返回首页">
          <span className="brand-mark">
            <Logo size={20} />
          </span>
          <span className="brand-name">红石电路</span>
        </button>

        <div className="crumb">
          <span className="crumb-kicker">第 {padNo(level.no ?? 1)} 关</span>
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
          <button type="button" className="btn primary" onClick={onRun} title="运行测试">
            测试
          </button>

          <button
            type="button"
            className="btn icon menu-key"
            aria-label="菜单"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            title="菜单"
            onClick={() => setMenuOpen((open) => !open)}
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
        </div>
      </header>

      <div className="game-grid">
        <Inspector
          level={level}
          tool={tool}
          dir={dir}
          zoom={camera.zoom}
          inputs={inputs}
          outputAt={outputAt}
          run={run}
          onTool={onTool}
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
            workbench={{ camera, onCamera: setCamera, onRotate }}
            viewportRef={viewport}
          />
        </main>
      </div>
    </div>
  )
}
