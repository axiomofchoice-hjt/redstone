import { useCallback, useEffect, useRef, useState } from 'react'
import { FlyBoard } from './FlyBoard'
import { FlyPalette } from './FlyPalette'
import { FLY_TOOLS, hasFlyDir } from './tools'
import { FlySim } from './sim'
import type { FlyDir, FlyLevel, FlyPart, FlyPartType } from './types'

const COLS = 12
const ROWS = 12
const STORE_KEY = 'fly-editor-v1'
const PLAY_MS = 420

const emptyMap = () => new Array<FlyPart | null>(COLS * ROWS).fill(null)

/** 沙盒关卡：没有墙也没有终点，纯粹拿来看机器怎么动 */
function sandbox(cells: (FlyPart | null)[]): FlyLevel {
  return {
    id: 'sandbox',
    no: 0,
    name: '沙盒',
    cols: COLS,
    rows: ROWS,
    walls: new Array<boolean>(COLS * ROWS).fill(false),
    cells,
    goal: [],
  }
}

function loadMap(): (FlyPart | null)[] {
  try {
    const raw = localStorage.getItem(STORE_KEY)
    if (!raw) return demoMap()
    const data: unknown = JSON.parse(raw)
    if (!Array.isArray(data) || data.length !== COLS * ROWS) return emptyMap()
    return data.map((item) => (item && typeof item === 'object' ? (item as FlyPart) : null))
  } catch {
    return emptyMap()
  }
}

/** 一进编辑器就摆两台能动的机器：脉冲器供电，粘性活塞推出去再拉回来 */
function demoMap(): (FlyPart | null)[] {
  const map = emptyMap()
  const at = (x: number, y: number) => y * COLS + x
  map[at(0, 3)] = { type: 'clock' }
  map[at(1, 3)] = { type: 'stickyPiston', dir: 1 }
  map[at(2, 3)] = { type: 'block' }

  map[at(0, 7)] = { type: 'clock' }
  map[at(1, 7)] = { type: 'stickyPiston', dir: 1 }
  map[at(2, 7)] = { type: 'slime' }
  map[at(3, 7)] = { type: 'block' }

  return map
}

interface RunView {
  cells: (FlyPart | null)[]
  heads: Map<number, { dir: FlyDir; sticky: boolean }>
  bodies: Set<number>
  tick: number
}

export function FlyEditor({ onBack }: { onBack: () => void }) {
  const [cells, setCells] = useState<(FlyPart | null)[]>(loadMap)
  const [tool, setTool] = useState<FlyPartType | 'erase'>('piston')
  const [dir, setDir] = useState<FlyDir>(1)
  const [run, setRun] = useState<RunView | null>(null)
  const [playing, setPlaying] = useState(false)
  const simRef = useRef<FlySim | null>(null)

  useEffect(() => {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(cells))
    } catch {
      // 存不下就算了，不影响编辑
    }
  }, [cells])

  const sync = useCallback(() => {
    const sim = simRef.current
    if (!sim) return
    setRun({
      cells: sim.cells.map((part) => (part ? { ...part } : null)),
      heads: sim.headInfo(),
      bodies: new Set(sim.extended),
      tick: sim.tick,
    })
  }, [])

  const enterRun = () => {
    simRef.current = new FlySim(sandbox(cells))
    setRun(null)
    sync()
  }

  const backToEdit = () => {
    setPlaying(false)
    simRef.current = null
    setRun(null)
  }

  const stepOnce = useCallback(() => {
    const sim = simRef.current
    if (!sim) return
    sim.step()
    sync()
  }, [sync])

  const resetRun = () => {
    setPlaying(false)
    simRef.current?.reset(cells)
    sync()
  }

  const running = run !== null

  // 电脑端用 WASD 转向、数字键选零件
  useEffect(() => {
    if (running) return
    const onKey = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase()
      if (event.metaKey || event.ctrlKey || event.altKey) return
      const dirs: Record<string, FlyDir> = { w: 0, a: 3, s: 2, d: 1 }
      if (key in dirs) {
        setDir(dirs[key])
        return
      }
      const index = Number(key) - 1
      if (index >= 0 && index < FLY_TOOLS.length) setTool(FLY_TOOLS[index].type)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [running])

  useEffect(() => {
    if (!playing || !running) return
    const timer = window.setInterval(stepOnce, PLAY_MS)
    return () => window.clearInterval(timer)
  }, [playing, running, stepOnce])

  const place = (index: number) => {
    setCells((prev) => {
      if (tool === 'erase') {
        if (!prev[index]) return prev
        const next = prev.slice()
        next[index] = null
        return next
      }
      const part: FlyPart = { type: tool }
      if (hasFlyDir(tool)) part.dir = dir
      const next = prev.slice()
      next[index] = part
      return next
    })
  }

  const erase = (index: number) => {
    setCells((prev) => {
      if (!prev[index]) return prev
      const next = prev.slice()
      next[index] = null
      return next
    })
  }

  const count = cells.reduce((n, part) => (part ? n + 1 : n), 0)
  const current = FLY_TOOLS.find((item) => item.type === tool)

  return (
    <div className="app">
      <header className="top">
        <div className="head">
          <button type="button" className="text-btn" onClick={onBack}>
            返回
          </button>
          <h1>飞行器</h1>
        </div>
        <div className="actions">
          {running ? (
            <button type="button" className="debug" onClick={backToEdit}>
              编辑
            </button>
          ) : (
            <>
              <button type="button" className="debug" onClick={() => setCells(demoMap())}>
                示例
              </button>
              <button type="button" className="debug" onClick={() => setCells(emptyMap())}>
                清空
              </button>
            </>
          )}
        </div>
      </header>

      <div className="toolbar">
        {running ? (
          <div className="result">
            运行中 · 第 {run.tick} 刻
            <span style={{ opacity: 0.7 }}>点「下一刻」单步推进</span>
          </div>
        ) : (
          <div className="result">
            {tool === 'erase' ? '点格子删除零件' : `正在放：${current?.label ?? ''}`} · 共 {count} 个零件
            <span style={{ opacity: 0.7 }}>右键也能删</span>
          </div>
        )}
      </div>

      {running ? (
        <FlyBoard
          cols={COLS}
          rows={ROWS}
          cells={run.cells}
          heads={run.heads}
          bodies={run.bodies}
          readOnly
          onCell={() => {}}
          onErase={() => {}}
        />
      ) : (
        <FlyBoard cols={COLS} rows={ROWS} cells={cells} onCell={place} onErase={erase} />
      )}

      {running ? (
        <div className="palette run-bar">
          <button type="button" className="run-btn" onClick={stepOnce}>
            下一刻
          </button>
          <button
            type="button"
            className={playing ? 'run-btn active' : 'run-btn'}
            onClick={() => setPlaying((v) => !v)}
          >
            {playing ? '暂停' : '播放'}
          </button>
          <button type="button" className="run-btn" onClick={resetRun}>
            重置
          </button>
        </div>
      ) : (
        <>
          <div className="palette run-bar">
            <button type="button" className="run-btn go" onClick={enterRun}>
              ▶ 运行
            </button>
          </div>
          <FlyPalette tool={tool} dir={dir} onTool={setTool} onDir={setDir} />
        </>
      )}
    </div>
  )
}
