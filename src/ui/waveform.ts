import type { Simulation } from '../game/sim'
import type { Level } from '../game/types'

/** 波形里显示多少个 tick：4 tick/s 下正好 8 秒 */
export const WAVE_TICKS = 32

/** 某一 tick 的输入 / 输出取值 */
export interface WaveSample {
  tick: number
  inputs: Record<string, 0 | 1>
  outputs: Record<string, 0 | 1>
}

/** 给当前这一 tick 拍一帧采样 */
export function waveSample(level: Level, sim: Simulation): WaveSample {
  const outputs: Record<string, 0 | 1> = {}
  for (const id of level.outputs ?? []) outputs[id] = sim.output(id) ? 1 : 0
  return { tick: sim.tick, inputs: sim.inputValues(), outputs }
}

/**
 * 追加一帧。同一个 tick 直接覆盖：暂停时拨输入开关、编辑元件都会重建仿真，
 * 但它们仍然属于当前这一 tick，不该在波形上多出一格。超出窗口就丢掉最老的。
 */
export function pushSample(history: WaveSample[], sample: WaveSample): WaveSample[] {
  const last = history[history.length - 1]
  // 时间轴被拨回去（恢复了更早的存档之类），旧采样接不上，从这一帧重新记
  if (last && sample.tick < last.tick) return [sample]
  const next = last?.tick === sample.tick ? [...history.slice(0, -1), sample] : [...history, sample]
  return next.length > WAVE_TICKS ? next.slice(next.length - WAVE_TICKS) : next
}

/** 一段电平不变的区间，坐标就是 svg 里的横坐标（0 是窗口左端） */
export interface WaveRun {
  from: number
  to: number
  value: 0 | 1
}

/**
 * 取最近 WAVE_TICKS 个 tick 的取值，并对齐到时间窗口：右端是当前 tick 的结尾，
 * 所以最右边一段的 `to` 正好是 WAVE_TICKS。相邻同值的采样合并成一段。
 */
export function waveRuns(
  history: WaveSample[],
  field: 'inputs' | 'outputs',
  id: string,
  tick: number,
): WaveRun[] {
  const start = tick - WAVE_TICKS + 1
  const runs: WaveRun[] = []
  for (const sample of history) {
    if (sample.tick < start || sample.tick > tick) continue
    const from = sample.tick - start
    const value = sample[field][id] ?? 0
    const last = runs[runs.length - 1]
    if (last && last.to === from && last.value === value) last.to = from + 1
    else runs.push({ from, to: from + 1, value })
  }
  return runs
}
