import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { hasDirection, runLevel, Simulation, type LevelRun } from './game/sim'
import type { Cell, Dir, Level } from './game/types'
import { LEVELS } from './levels'
import { defaultTool } from './ui/tools'
import { rotateDir } from './ui/keyboard'
import { download, mapFileName, mapJson } from './ui/export'
import { solutionMap } from './ui/solution'
import { pushSample, waveSample, type WaveSample } from './ui/waveform'
import type { Tool } from './ui/Palette'
import { DESKTOP_QUERY, useMediaQuery } from './ui/useMediaQuery'
import { StartScreen } from './ui/StartScreen'
import { LevelSelect } from './ui/LevelSelect'
import { GameDesktop } from './ui/GameDesktop'
import { GameMobile } from './ui/GameMobile'
import './App.css'

const INITIAL_DIR: Dir = 1

/** 编辑器里仿真每 tick 的间隔：4 tick/s */
const TICK_MS = 250

type Screen = 'start' | 'levels' | 'game'

interface Editing {
  level: Level
  sim: Simulation
  /** 检查器波形图用的采样，只保留最近一段 tick；和仿真一起更新，改元件时当拍就能覆盖 */
  history: WaveSample[]
}

const initial = (): Editing => {
  const level = { ...LEVELS[0], cells: LEVELS[0].cells.slice() }
  const sim = new Simulation(level)
  return { level, sim, history: [waveSample(level, sim)] }
}

export default function App() {
  const [{ level, sim, history }, setEditing] = useState<Editing>(initial)
  const [tool, setTool] = useState<Tool>({ type: 'wire' })
  // 再点一次「交互」还原成上一次选的元件（手机端交互时元件栏换成了波形图）
  const lastTool = useRef<Tool>({ type: 'wire' })
  const [dir, setDir] = useState<Dir>(INITIAL_DIR)
  const [run, setRun] = useState<LevelRun | null>(null)
  // 编辑器里手动开关的输入
  const [inputs, setInputs] = useState<Record<string, 0 | 1>>({})
  const [menuOpen, setMenuOpen] = useState(false)
  const [screen, setScreen] = useState<Screen>('start')
  // 仿真在后台推进，只在画面有变化时重绘
  const [version, repaint] = useReducer((n: number) => n + 1, 0)
  // 调试用：暂停自动 tick
  const [paused, setPaused] = useState(false)
  const isDesktop = useMediaQuery(DESKTOP_QUERY)
  // 手机菜单只在手机布局里算数；拖到桌面宽度时不应该把仿真停住
  const mobileMenuOpen = menuOpen && !isDesktop

  /**
   * 定时器只建一次：改元件会重建仿真，如果定时器依赖 sim，每放一格都会被清掉重建，
   * 计数又从 0 开始——一直连点 / 拖动画布时 tick 就永远到不了 250ms，看起来是卡住了。
   * 这里让定时器读 ref 里的最新仿真，放东西不会打断节拍。
   */
  const simRef = useRef(sim)
  useEffect(() => {
    simRef.current = sim
  }, [sim])

  /** 给波形图补一帧当前 tick 的采样；电脑端检查器和手机端「交互」面板都读它 */
  const record = useCallback(() => {
    setEditing((prev) => ({
      ...prev,
      history: pushSample(prev.history, waveSample(prev.level, prev.sim)),
    }))
  }, [])

  useEffect(() => {
    if (paused || mobileMenuOpen || screen !== 'game') return
    const timer = setInterval(() => {
      // step() 直接返回画面有没有变化，不用前后各拍一次快照
      const changed = simRef.current.step()
      record()
      if (changed) repaint()
    }, TICK_MS)
    return () => clearInterval(timer)
  }, [paused, mobileMenuOpen, screen, record])

  // 鼠标点完按钮别留下焦点：焦点在按钮上时再按键盘，浏览器会描一圈焦点框
  useEffect(() => {
    let pointerType = 'mouse'
    const onPointerDown = (event: PointerEvent) => {
      pointerType = event.pointerType
    }
    const onMouseDown = (event: MouseEvent) => {
      // 只有鼠标点击才处理，别影响触摸 / 触控笔
      if (pointerType !== 'mouse' || event.button !== 0) return
      // 不让按钮拿到焦点；已经拿到的也放掉，焦点框只留给 Tab 键
      if (event.target instanceof Element && event.target.closest('button')) event.preventDefault()
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
    }
    document.addEventListener('pointerdown', onPointerDown, true)
    document.addEventListener('mousedown', onMouseDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true)
      document.removeEventListener('mousedown', onMouseDown)
    }
  }, [])

  const nextTick = () => {
    if (!paused) return
    sim.step()
    record()
    repaint()
  }

  // 画布只按需取可见格子的状态，不再每帧生成整张 powers
  const powerAt = useCallback((index: number) => sim.powerAt(index), [sim])
  const lockedAt = useCallback((index: number) => sim.isLocked(index), [sim])
  const outputAt = useCallback((id: string) => sim.output(id), [sim])

  /** 改一格元件并重建仿真；锁住的格子不动 */
  const writeCell = (index: number, next: Cell | null) => {
    setEditing((prev) => {
      const cells = prev.level.cells.slice()
      if (cells[index]?.locked) return prev
      if (next === null && !cells[index]) return prev
      cells[index] = next
      const level = { ...prev.level, cells }
      const sim = new Simulation(level, prev.sim)
      // 重建后把手动开关的输入接着用
      sim.setInputs(inputs)
      // 这一 tick 的输出已经跟着电路变了，采样要覆盖成新值，
      // 只改最后一格的画面没用：过一刻它就成了历史，又会显示回旧电平
      return { level, sim, history: pushSample(prev.history, waveSample(level, sim)) }
    })
    setRun(null)
  }

  /** 切换一个输入元件的 0 / 1；桌面端左侧面板和「交互」工具都走这里 */
  /** 选元件；「交互」再点一次就回到上一次选的元件 */
  const pickTool = useCallback((next: Tool) => {
    if (next === 'interact') {
      setTool((prev) => (prev === 'interact' ? lastTool.current : 'interact'))
      return
    }
    lastTool.current = next
    setTool(next)
  }, [])

  const toggleInput = (id: string) => {
    const next: Record<string, 0 | 1> = { ...inputs, [id]: inputs[id] ? 0 : 1 }
    setInputs(next)
    sim.setInputs(next)
    setRun(null)
    record()
    repaint()
  }

  const handleCell = (index: number) => {
    // 交互：点输入元件开关它
    if (tool === 'interact') {
      const cell = level.cells[index]
      if (cell?.type !== 'input' || !cell.id) return
      toggleInput(cell.id)
      return
    }

    const cell: Cell | null =
      tool === 'erase'
        ? null
        : { type: tool.type, dir: hasDirection(tool.type) ? dir : undefined, id: tool.id }
    writeCell(index, cell)
  }

  /** 右键删除：只删格子，元件栏选中的元件不变 */
  const handleErase = (index: number) => writeCell(index, null)

  /** 参考答案：把布局和保存时的电路状态一起盖上去，玩家当前搭的会被冲掉 */
  const applySolution = () => {
    const solution = solutionMap(level)
    if (!solution) return
    const next = { ...level, cells: solution.cells }
    const sim = new Simulation(next)
    sim.restore(solution.state)
    // 参考解把 tick 拨回去了，旧波形接不上，从这个 tick 重新记
    setEditing({ level: next, sim, history: [waveSample(next, sim)] })
    setInputs(solution.state.inputs)
    setRun(null)
    setMenuOpen(false)
  }

  const startLevel = (next: Level) => {
    const level = { ...next, cells: next.cells.slice() }
    const sim = new Simulation(level)
    setEditing({ level, sim, history: [waveSample(level, sim)] })
    // 换关后元件选择也回到这关的默认元件，别把上一关照到哪都带着
    lastTool.current = { type: defaultTool(level) }
    setTool(lastTool.current)
    setDir(INITIAL_DIR)
    setInputs({})
    setRun(null)
    setPaused(false)
    setMenuOpen(false)
    setScreen('game')
  }

  const goHome = () => {
    setMenuOpen(false)
    setScreen('start')
  }

  const goLevels = () => {
    setMenuOpen(false)
    setScreen('levels')
  }

  if (screen === 'start') {
    return (
      <StartScreen onResume={() => setScreen('game')} onLevels={goLevels} />
    )
  }

  if (screen === 'levels') {
    return (
      <LevelSelect
        levels={LEVELS}
        onSelect={startLevel}
        onResume={() => setScreen('game')}
        onHome={goHome}
      />
    )
  }

  if (isDesktop) {
    return (
      <GameDesktop
        key={level.id}
        level={level}
        tool={tool}
        dir={dir}
        inputs={inputs}
        history={history}
        tick={sim.tick}
        run={run}
        paused={paused}
        revision={version}
        powerAt={powerAt}
        lockedAt={lockedAt}
        outputAt={outputAt}
        onTool={pickTool}
        onDir={setDir}
        onCell={handleCell}
        onErase={handleErase}
        onToggleInput={toggleInput}
        onSolution={applySolution}
        onExport={() => download(mapFileName(level), mapJson(level, sim))}
        onRun={() => setRun(runLevel(level, sim))}
        onPause={() => setPaused((value) => !value)}
        onNextTick={nextTick}
        onRotate={(step) => setDir((value) => rotateDir(value, step))}
        onHome={goHome}
        onLevels={goLevels}
      />
    )
  }

  return (
    <GameMobile
      level={level}
      tool={tool}
      dir={dir}
      run={run}
      paused={paused}
      revision={version}
      menuOpen={mobileMenuOpen}
      history={history}
      tick={sim.tick}
      inputs={inputs}
      powerAt={powerAt}
      lockedAt={lockedAt}
      outputAt={outputAt}
      onTool={pickTool}
      onDir={setDir}
      onCell={handleCell}
      onErase={handleErase}
      onToggleInput={toggleInput}
      onRun={() => setRun(runLevel(level, sim))}
      onPause={() => setPaused((value) => !value)}
      onNextTick={nextTick}
      onMenuToggle={() => setMenuOpen((open) => !open)}
      onContinue={() => setMenuOpen(false)}
      onSolution={applySolution}
      onExport={() => download(mapFileName(level), mapJson(level, sim))}
      onLevels={goLevels}
    />
  )
}
