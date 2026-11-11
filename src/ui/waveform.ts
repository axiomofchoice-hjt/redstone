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

/**
 * 给当前这一 tick 拍一帧采样。
 * 输出按关卡声明的端口逐个记：没放到地图上的输出就是 0；
 * 输入记的是玩家设过的值，输入元件删掉后这个值也还留着（sim 里会一直保存）。
 */
export function waveSample(level: Level, sim: Simulation): WaveSample {
  const outputs: Record<string, 0 | 1> = {}
  for (const id of level.outputs ?? []) outputs[id] = sim.output(id) ? 1 : 0
  return { tick: sim.tick, inputs: sim.inputValues(), outputs }
}

/**
 * 追加一帧。同一个 tick 直接覆盖：暂停时拨输入开关、编辑元件都会重建仿真，
 * 但它们仍然属于当前这一 tick，不该在波形上多出一格。超出窗口就丢掉最老的。
 */
export function pushSample(
  history: WaveSample[],
  sample: WaveSample,
  /** 最多留几帧；回放要看整组测试，会传更大的值 */
  cap = WAVE_TICKS,
): WaveSample[] {
  const last = history[history.length - 1]
  // 时间轴被拨回去（恢复了更早的存档之类），旧采样接不上，从这一帧重新记
  if (last && sample.tick < last.tick) return [sample]
  const next = last?.tick === sample.tick ? [...history.slice(0, -1), sample] : [...history, sample]
  return next.length > cap ? next.slice(next.length - cap) : next
}

/**
 * 点波形上的横坐标要跳到第几个 tick：横轴按 domain 等分成格，一格一个 tick，
 * 点在第 c 格就停到第 c 刻——这一格画的就是第 c 刻的采样，右边界是「现在」。
 * 点在两端外面时夹住：最左是 0，最右是回放走完的 domain。
 */
export function tickAtX(domain: number, x: number, laneWidth: number): number {
  if (domain <= 0 || laneWidth <= 0) return 0
  const cell = Math.floor((x / laneWidth) * domain)
  return Math.min(Math.max(cell, 0), domain)
}

/** 回放播放头的宽度：固定 2 CSS px，但按设备像素取整，竖边才不会糊成 3px */
export function playheadWidth(dpr = 1): number {
  return Math.max(1, Math.round(2 * dpr)) / dpr
}

/**
 * 回放播放头（收进波形里的那条竖线）的左边缘，单位是 CSS px。
 * 采样格是 [tick, tick + 1)，这一格的右边界就是「现在」：波形在那儿由 0 跳到 1
 * （或反过来）时，竖线正好画在这条边界上，所以播放头以边界为中线、左右各压一半，
 * 整条跳变竖线都被红线盖住。
 * 左边缘再对齐到设备像素（线身不会一会儿粗一会儿细），最后夹在波形里，两端都露全。
 */
export function playheadLeft(domain: number, tick: number, laneWidth: number, dpr = 1): number {
  if (domain <= 0 || laneWidth <= 0) return 0
  const width = playheadWidth(dpr)
  const boundary = (Math.min(tick + 1, domain) / domain) * laneWidth
  const left = Math.round((boundary - width / 2) * dpr) / dpr
  return Math.min(Math.max(left, 0), Math.max(0, laneWidth - width))
}

/** 一段电平不变的区间，坐标就是 svg 里的横坐标（0 是窗口左端） */
export interface WaveRun {
  from: number
  to: number
  value: 0 | 1
}

/**
 * 取 [from, to] 这一段 tick 的采样，坐标从 from 起算，不在前面补 0。
 * 回放的横轴是整组测试，用它一次取出整条波形。
 */
export function waveRunsBetween(
  history: WaveSample[],
  field: 'inputs' | 'outputs',
  id: string,
  from: number,
  to: number,
): WaveRun[] {
  const runs: WaveRun[] = []
  for (const sample of history) {
    if (sample.tick < from || sample.tick > to) continue
    const start = sample.tick - from
    const value = sample[field][id] ?? 0
    const last = runs[runs.length - 1]
    if (last && last.to === start && last.value === value) last.to = start + 1
    else runs.push({ from: start, to: start + 1, value })
  }
  return runs
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

  // 关卡刚开始、窗口里还没攒够 32 帧：前面这段按 0 补满，一上来就是一整条 0 线，
  // 而不是只在最右边挂一小截
  const first = runs[0]
  if (first && first.from > 0) {
    if (first.value === 0) first.from = 0
    else runs.unshift({ from: 0, to: first.from, value: 0 })
  }
  return runs
}
