import { describe, expect, it } from 'vitest'
import { pushSample, waveRuns, WAVE_TICKS, type WaveSample } from './waveform'

const sample = (tick: number, input: 0 | 1, output: 0 | 1): WaveSample => ({
  tick,
  inputs: { A: input },
  outputs: { B: output },
})

describe('波形采样', () => {
  it('同一 tick 覆盖、新 tick 追加，只留最近 WAVE_TICKS 帧', () => {
    expect(pushSample([], sample(0, 0, 0))).toEqual([sample(0, 0, 0)])

    const replaced = pushSample([sample(0, 0, 0)], sample(0, 1, 0))
    expect(replaced).toEqual([sample(0, 1, 0)])

    const appended = pushSample([sample(0, 0, 0)], sample(1, 0, 0))
    expect(appended.map((item) => item.tick)).toEqual([0, 1])

    let history: WaveSample[] = []
    for (let tick = 0; tick < WAVE_TICKS + 6; tick++) history = pushSample(history, sample(tick, 0, 0))
    expect(history).toHaveLength(WAVE_TICKS)
    expect(history[0].tick).toBe(6)
    expect(history[history.length - 1].tick).toBe(WAVE_TICKS + 5)
  })

  it('按时间窗口对齐：右端是当前 tick 的结尾', () => {
    // tick=3、窗口 32：tick 0 落在 28，tick 3 落在 31..32
    const history = [sample(0, 0, 0), sample(1, 1, 0), sample(2, 1, 1), sample(3, 0, 1)]
    expect(waveRuns(history, 'inputs', 'A', 3)).toEqual([
      { from: 28, to: 29, value: 0 },
      { from: 29, to: 31, value: 1 },
      { from: 31, to: 32, value: 0 },
    ])
    expect(waveRuns(history, 'outputs', 'B', 3)).toEqual([
      { from: 28, to: 30, value: 0 },
      { from: 30, to: 32, value: 1 },
    ])
  })

  it('窗口外的旧采样丢掉，没记录的信号当 0', () => {
    const history = [sample(0, 1, 1), sample(40, 1, 1), sample(41, 0, 0)]
    expect(waveRuns(history, 'inputs', 'A', 41)).toEqual([
      { from: 30, to: 31, value: 1 },
      { from: 31, to: 32, value: 0 },
    ])
    // 窗口一路往前挪，旧采样全落在外面
    expect(waveRuns(history, 'inputs', 'A', 80)).toEqual([])
    // 没记录的信号按 0 画
    expect(waveRuns(history, 'outputs', 'Z', 41)).toEqual([{ from: 30, to: 32, value: 0 }])
  })
})
