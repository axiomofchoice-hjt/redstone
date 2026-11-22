import { Simulation } from '../game/sim'
import type { Level, TestCase } from '../game/types'
import { solutionCells } from './solution'
import { pushSample, waveSample, type WaveSample } from './waveform'

/** 测试里的一段检查：区间 [from, to] 内这些输出应该一直是给定取值 */
export interface TraceCheck {
  from: number
  to: number
  outputs: Record<string, 0 | 1>
}

/**
 * 成对检查：同一条输出在两个时刻的取值必须落在 allow 里。
 * 时钟、T 触发器这类只看「翻转 / 保持」的测试用的都是它，没有固定的期望电平。
 */
export interface TracePair {
  output: string
  from: number
  to: number
  allow: (0 | 1)[][]
}

/** 回放面板要显示的东西：这组测试叫什么、检查区间和对比的时刻在哪 */
export interface TraceInfo {
  name: string
  checks: TraceCheck[]
  pairs: TracePair[]
  /** 这组测试跑到第几个 tick */
  lastTick: number
}

/** 检查区间统一带上 `to`，没写的就当只查一个 tick */
export const checksOf = (test: TestCase): TraceCheck[] =>
  (test.checks ?? []).map((c) => ({ from: c.from, to: c.to ?? c.from, outputs: c.outputs }))

/** 成对检查按两个时刻排好，回放波形上画成一段对比区间 */
export const pairsOf = (test: TestCase): TracePair[] =>
  (test.pairs ?? []).map((p) => ({
    output: p.output,
    from: Math.min(p.ticks[0], p.ticks[1]),
    to: Math.max(p.ticks[0], p.ticks[1]),
    allow: p.allow,
  }))

/** 把参考解的元件铺到关卡上，用来并排跑同一组测试；没有参考解就返回 null */
export function refLevelOf(level: Level): Level | null {
  const cells = solutionCells(level)
  return cells ? { ...level, cells } : null
}

/**
 * 参考解并排跑测试用的仿真：除了铺元件，还要恢复保存的电路状态。
 * 导出的 tick 只是保存那一刻，回放和玩家一样从 tick 0 开始，所以 tick 和输入归零；
 * 延迟元件的通电位必须留下，否则 T / JK 触发器这类参考解会从错误的相位起跑。
 */
export function refSimOf(level: Level, refLevel = refLevelOf(level)): Simulation | null {
  if (!refLevel || !level.solution) return null
  const sim = new Simulation(refLevel)
  sim.restore({ ...level.solution.state, tick: 0, inputs: {} })
  return sim
}

/**
 * 第 tick 个 tick 要拨的输入（测试事件设置后会一直保持）：
 * 回放时每个 tick 开头把这一份盖到仿真上，玩家点的开关就不参与回放了。
 */
export function eventsAt(test: TestCase, tick: number): Record<string, 0 | 1> | null {
  const values: Record<string, 0 | 1> = {}
  let found = false
  for (const event of test.events ?? []) {
    if (event.tick !== tick) continue
    Object.assign(values, event.values)
    found = true
  }
  return found ? values : null
}

/**
 * 把仿真准备到第 `mine.tick` 刻：拨上这一 tick 的测试事件，并按测试检查这一 tick 的
 * 同一时机刷新输出。
 *
 * `runTest` 在每一拍开头先拨事件、再在 `step()` 里采输出；那时延迟元件还是上一拍算完的
 * 状态，所以「第 t tick 的检查值」要等第 t 拍开始时才看得到。回放要采的就是这一份，
 * 不能等 `step()` 把 tick 推到 t + 1 再采（那样整条波形和检查区间会差一格）。
 */
export function replayPrepare(test: TestCase, mine: Simulation, ref?: Simulation | null): void {
  const values = eventsAt(test, mine.tick)
  if (values) {
    mine.setInputs(values)
    ref?.setInputs(values)
  }
  mine.refreshOutputs()
  ref?.refreshOutputs()
}

/**
 * 回放往前推一刻：先让两边各走一步，再把仿真准备到新的一刻。
 * 调用前当前位置已经由 `replayPrepare` 准备过（进回放时也要先调它一次）。
 */
export function replayStep(test: TestCase, mine: Simulation, ref?: Simulation | null): void {
  mine.step()
  ref?.step()
  replayPrepare(test, mine, ref)
}

/**
 * 按测试事件跑到第 steps 个 tick，返回玩家电路和参考解两份仿真、各自的波形。
 * 波形里第 t 帧就是测试检查第 t tick 时看到的值，所以整组波形和检查区间按同一套
 * tick 编号对齐；回放进入（steps = 0）和「上一刻」都走这里。
 * `start` 给了就从这份仿真（测试快照）起跑，没给就从冷启动的电路起跑。
 */
export function replayTo(
  level: Level,
  test: TestCase,
  refLevel: Level | null,
  steps: number,
  start?: Simulation,
) {
  const sim = start ? start.fork() : new Simulation(level)
  const refSim = refSimOf(level, refLevel)
  const cap = steps + 2
  replayPrepare(test, sim, refSim)
  let history: WaveSample[] = [waveSample(level, sim)]
  let refHistory: WaveSample[] = refSim && refLevel ? [waveSample(refLevel, refSim)] : []
  for (let step = 0; step < steps; step++) {
    replayStep(test, sim, refSim)
    history = pushSample(history, waveSample(level, sim), cap)
    if (refSim && refLevel) refHistory = pushSample(refHistory, waveSample(refLevel, refSim), cap)
  }
  return { sim, refSim, history, refHistory }
}

/**
 * 从测试快照跑到第 steps 个 tick，只要仿真本身；停下时已经准备好这一 tick 的事件和输出。
 * 回放的「上一刻」和点波形跳转都走这里：波形已经整组存下了，不用再采样。
 */
export function replaySimTo(test: TestCase, steps: number, start: Simulation): Simulation {
  const sim = start.fork()
  replayPrepare(test, sim)
  for (let step = 0; step < steps; step++) replayStep(test, sim)
  return sim
}
