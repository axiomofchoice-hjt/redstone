import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { hasDirection, runLevel, Simulation, testSpan, type LevelRun } from './game/sim'
import type { Cell, Dir, Level, TestCase } from './game/types'
import { LEVELS } from './levels'
import { freeLevel, isFreeLevel } from './levels/free'
import { defaultTool } from './ui/tools'
import { rotateDir } from './ui/keyboard'
import { download, mapFileName, mapJson } from './ui/export'
import { solutionMap } from './ui/solution'
import { pushSample, waveSample, type WaveSample } from './ui/waveform'
import { checksOf, refLevelOf, replayStep, type TraceInfo } from './ui/trace'
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

/**
 * 测试没通过后的回放：从冷启动重跑这一组测试，输入由测试事件驱动，
 * 玩家电路和参考解一起走；退出时把进来前的编辑状态原样还回去。
 */
interface Replay {
  info: TraceInfo
  test: TestCase
  refLevel: Level | null
  refSim: Simulation | null
  saved: Editing & { inputs: Record<string, 0 | 1>; paused: boolean }
  lastTick: number
}

const initial = (): Editing => {
  const level = { ...LEVELS[0], cells: LEVELS[0].cells.slice() }
  const sim = new Simulation(level)
  return { level, sim, history: [waveSample(level, sim)] }
}

/**
 * 从冷启动按测试事件跑到第 steps 个 tick，返回玩家电路和参考解两份仿真、各自的波形。
 * 回放进入（steps = 0）和「上一刻」（从冷启动重跑到前一个 tick）都走这里。
 */
function replayTo(level: Level, test: TestCase, refLevel: Level | null, steps: number) {
  const sim = new Simulation(level)
  const refSim = refLevel ? new Simulation(refLevel) : null
  let history = [waveSample(level, sim)]
  let refHistory = refSim && refLevel ? [waveSample(refLevel, refSim)] : []
  for (let t = 0; t < steps; t++) {
    replayStep(test, sim, refSim)
    history = pushSample(history, waveSample(level, sim))
    if (refSim && refLevel) refHistory = pushSample(refHistory, waveSample(refLevel, refSim))
  }
  return { sim, refSim, history, refHistory }
}

export default function App() {
  const [{ level, sim, history }, setEditing] = useState<Editing>(initial)
  const [tool, setTool] = useState<Tool>({ type: 'wire' })
  // 再点一次「交互」还原成上一次选的元件（手机端交互时元件栏换成了波形图）
  const lastTool = useRef<Tool>({ type: 'wire' })
  const [dir, setDir] = useState<Dir>(INITIAL_DIR)
  const [run, setRun] = useState<LevelRun | null>(null)
  // 测试没通过后点结果按钮进入的回放：元件栏换成波形图，电路从冷启动重跑
  const [replay, setReplay] = useState<Replay | null>(null)
  // 参考解那几条输出线的采样
  const [refHistory, setRefHistory] = useState<WaveSample[]>([])
  // 编辑器里手动开关的输入
  const [inputs, setInputs] = useState<Record<string, 0 | 1>>({})
  const [menuOpen, setMenuOpen] = useState(false)
  const [screen, setScreen] = useState<Screen>('start')
  // 仿真在后台推进，只在画面有变化时重绘
  const [version, repaint] = useReducer((n: number) => n + 1, 0)
  // 调试用：暂停自动 tick
  const [paused, setPaused] = useState(false)
  // 自由模式没有关卡号、端口和测试，界面上要把这些入口收起来
  const free = isFreeLevel(level)
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

  /** 给波形图补一帧当前 tick 的采样；电脑端检查器和手机端「交互」/ 回放面板都读它 */
  const record = useCallback(() => {
    setEditing((prev) => ({
      ...prev,
      history: pushSample(prev.history, waveSample(prev.level, prev.sim)),
    }))
  }, [])

  /** 走一个 tick：回放时先把这一 tick 的测试事件拨上，玩家电路和参考解一起走 */
  const stepOnce = () => {
    if (replay) {
      // 这组测试已经跑完，回放停在最后
      if (sim.tick > replay.lastTick) {
        setPaused(true)
        return
      }
      replayStep(replay.test, sim, replay.refSim)
      record()
      const { refLevel, refSim } = replay
      if (refLevel && refSim) {
        setRefHistory((prev) => pushSample(prev, waveSample(refLevel, refSim)))
      }
      setInputs(sim.inputValues())
      // 这组测试跑完就停住
      if (sim.tick > replay.lastTick) setPaused(true)
      repaint()
      return
    }
    // step() 直接返回画面有没有变化，不用前后各拍一次快照
    const changed = simRef.current.step()
    record()
    if (changed) repaint()
  }

  // 定时器只建一次，每帧读最新的 stepOnce，换关 / 改元件都不会打断节拍
  const stepRef = useRef(stepOnce)
  useEffect(() => {
    stepRef.current = stepOnce
  })

  useEffect(() => {
    if (paused || mobileMenuOpen || screen !== 'game') return
    const timer = setInterval(() => stepRef.current(), TICK_MS)
    return () => clearInterval(timer)
  }, [paused, mobileMenuOpen, screen])

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
    stepOnce()
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
    setReplay(null)
  }

  /** 选元件；「交互」再点一次就回到上一次选的元件 */
  const pickTool = useCallback((next: Tool) => {
    if (next === 'interact') {
      setTool((prev) => (prev === 'interact' ? lastTool.current : 'interact'))
      return
    }
    lastTool.current = next
    setTool(next)
  }, [])

  /** 切换一个输入元件的 0 / 1；桌面端左侧面板和「交互」工具都走这里 */
  const toggleInput = (id: string) => {
    const next: Record<string, 0 | 1> = { ...inputs, [id]: inputs[id] ? 0 : 1 }
    setInputs(next)
    sim.setInputs(next)
    setRun(null)
    setReplay(null)
    record()
    repaint()
  }

  const handleCell = (index: number) => {
    // 回放时地图只是旁观，别把回放的电路改了
    if (replay) return
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
  const handleErase = (index: number) => {
    if (replay) return
    writeCell(index, null)
  }

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
    setReplay(null)
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
    setReplay(null)
    setRefHistory([])
    setPaused(false)
    setMenuOpen(false)
    setScreen('game')
  }

  /**
   * 点「测试结果：×」进入回放：电路从冷启动重跑第一组没通过的测试，
   * 输入全 0、由测试事件驱动，元件栏换成波形图，地图和波形一起往前走。
   */
  const openTrace = () => {
    if (!run || run.passed || replay) return
    const index = run.outcomes.findIndex((outcome) => !outcome.passed)
    const test = level.tests[Math.max(0, index)]
    if (!test) return
    const refLevel = refLevelOf(level)
    const cold = replayTo(level, test, refLevel, 0)
    setReplay({
      info: { name: test.name ?? '测试', checks: checksOf(test) },
      test,
      refLevel,
      refSim: cold.refSim,
      lastTick: testSpan(test),
      saved: { level, sim, history, inputs, paused },
    })
    setEditing({ level, sim: cold.sim, history: cold.history })
    setInputs(cold.sim.inputValues())
    setRefHistory(cold.refHistory)
    setPaused(true)
    repaint()
  }

  /** 退出回放：把进来之前的电路、输入和暂停状态原样还回去；不在回放里返回 null */
  const leaveTrace = () => {
    if (!replay) return null
    const { saved } = replay
    setEditing({ level: saved.level, sim: saved.sim, history: saved.history })
    setInputs(saved.inputs)
    setPaused(saved.paused)
    setReplay(null)
    setRefHistory([])
    return saved
  }

  /** 再点一次结果按钮：收起回放 */
  const closeTrace = () => {
    if (leaveTrace()) repaint()
  }

  /** 上一刻：回放从冷启动重跑到前一个 tick，地图和波形一起退 */
  const prevTick = () => {
    if (!replay) return
    const back = replayTo(level, replay.test, replay.refLevel, Math.max(0, sim.tick - 1))
    setReplay({ ...replay, refSim: back.refSim })
    setEditing({ level, sim: back.sim, history: back.history })
    setRefHistory(back.refHistory)
    setInputs(back.sim.inputValues())
    repaint()
  }

  const togglePause = () => setPaused((value) => !value)

  const runTests = () => {
    // 回放中按「测试」：先退出回放，再拿回来那份电路重新测
    const saved = leaveTrace()
    setRun(runLevel(saved?.level ?? level, saved?.sim ?? sim))
    if (saved) repaint()
  }

  /** 选关页的「自由模式」：20×20 空白沙盒，没有输入输出和测试 */
  const startFree = () => startLevel(freeLevel)

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
      <StartScreen onStart={goLevels} />
    )
  }

  if (screen === 'levels') {
    return (
      <LevelSelect
        levels={LEVELS}
        onSelect={startLevel}
        onFree={startFree}
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
        free={free}
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
        onRun={runTests}
        onPause={togglePause}
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
      free={free}
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
      trace={replay?.info ?? null}
      refHistory={refHistory}
      onTool={pickTool}
      onDir={setDir}
      onCell={handleCell}
      onErase={handleErase}
      onToggleInput={toggleInput}
      onRun={runTests}
      onOpenTrace={openTrace}
      onCloseTrace={closeTrace}
      onPause={togglePause}
      onNextTick={nextTick}
      onPrevTick={prevTick}
      onMenuToggle={() => setMenuOpen((open) => !open)}
      onContinue={() => setMenuOpen(false)}
      onSolution={applySolution}
      onExport={() => download(mapFileName(level), mapJson(level, sim))}
      onLevels={goLevels}
    />
  )
}
