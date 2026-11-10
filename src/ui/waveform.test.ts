import { describe, expect, it } from 'vitest'
import { Simulation } from '../game/sim'
import type { Level } from '../game/types'
import {
  playheadLeft,
  playheadWidth,
  pushSample,
  waveRuns,
  waveRunsBetween,
  waveSample,
  WAVE_TICKS,
  type WaveSample,
} from './waveform'

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

  it('回放可以留更多帧，默认还是只留 WAVE_TICKS 帧', () => {
    let history: WaveSample[] = []
    for (let tick = 0; tick < 40; tick++) history = pushSample(history, sample(tick, 0, 0), 100)
    expect(history).toHaveLength(40)
    history = pushSample(history, sample(40, 0, 0), 10)
    expect(history).toHaveLength(10)
    expect(history[0].tick).toBe(31)
  })

  it('整组测试按 from..to 取采样，前面不补 0，还没跑到的 tick 留空', () => {
    const history = [sample(0, 0, 0), sample(1, 0, 1), sample(2, 1, 1), sample(3, 1, 0)]
    expect(waveRunsBetween(history, 'inputs', 'A', 0, 3)).toEqual([
      { from: 0, to: 2, value: 0 },
      { from: 2, to: 4, value: 1 },
    ])
    expect(waveRunsBetween(history, 'outputs', 'B', 0, 2)).toEqual([
      { from: 0, to: 1, value: 0 },
      { from: 1, to: 3, value: 1 },
    ])
    // 只取后半段时坐标从 from 重新起算
    expect(waveRunsBetween(history, 'outputs', 'B', 2, 3)).toEqual([
      { from: 0, to: 1, value: 1 },
      { from: 1, to: 2, value: 0 },
    ])
  })

  it('时间轴被拨回去时从新的一帧重新记', () => {
    const history = [sample(30, 1, 1), sample(31, 1, 1)]
    expect(pushSample(history, sample(0, 0, 0))).toEqual([sample(0, 0, 0)])
  })

  it('按时间窗口对齐：右端是当前 tick 的结尾，开局那段补 0', () => {
    // tick=3、窗口 32：tick 0 落在 28，tick 3 落在 31..32；
    // 关还没跑满 8 秒，0 之前那截按 0 画，整条线从左边一直拉到现在
    const history = [sample(0, 0, 0), sample(1, 1, 0), sample(2, 1, 1), sample(3, 0, 1)]
    expect(waveRuns(history, 'inputs', 'A', 3)).toEqual([
      { from: 0, to: 29, value: 0 },
      { from: 29, to: 31, value: 1 },
      { from: 31, to: 32, value: 0 },
    ])
    expect(waveRuns(history, 'outputs', 'B', 3)).toEqual([
      { from: 0, to: 30, value: 0 },
      { from: 30, to: 32, value: 1 },
    ])
  })

  it('窗口外的旧采样丢掉', () => {
    const history = [sample(0, 1, 1), sample(40, 1, 1), sample(41, 0, 0)]
    expect(waveRuns(history, 'inputs', 'A', 41)).toEqual([
      { from: 0, to: 30, value: 0 },
      { from: 30, to: 31, value: 1 },
      { from: 31, to: 32, value: 0 },
    ])
    // 窗口一路往前挪，旧采样全落在外面
    expect(waveRuns(history, 'inputs', 'A', 80)).toEqual([])
  })

  it('没记录的端口按 0 画满整条线', () => {
    // 未放置的输出一直按 0 处理：从左边开始就是一整条 0 线
    const history = [sample(40, 1, 1), sample(41, 0, 0)]
    expect(waveRuns(history, 'outputs', 'Z', 41)).toEqual([{ from: 0, to: 32, value: 0 }])
  })

  it('采样把声明的输出都记上，没放的输出记 0', () => {
    const level: Level = {
      id: 't',
      name: 't',
      cols: 3,
      rows: 1,
      inputs: ['A'],
      outputs: ['B', 'C'],
      // 只放了 A 和 B，输出 C 还没放到地图上
      cells: [{ type: 'input', id: 'A' }, { type: 'output', id: 'B' }, null],
      tests: [],
    }
    expect(waveSample(level, new Simulation(level))).toEqual({
      tick: 0,
      inputs: { A: 0 },
      outputs: { B: 0, C: 0 },
    })
  })
})

describe('回放播放头', () => {
  // 采样格是 [tick, tick + 1)，波形在这一格的右边界上跳变
  const boundaryOf = (domain: number, tick: number, lane: number) =>
    (Math.min(tick + 1, domain) / domain) * lane

  it('线宽是 2 CSS px，按设备像素取整', () => {
    expect(playheadWidth(1)).toBe(2)
    expect(playheadWidth(2)).toBe(2)
    // 1.25 / 1.5 倍缩放：2px 会落在半个设备像素上，取整到 3 个设备像素
    expect(playheadWidth(1.25)).toBe(2.4)
    expect(playheadWidth(1.5)).toBe(2)
  })

  it('以这一格的右边界为中线，最多偏半个设备像素，2 倍屏上跳变竖线整个在红线里', () => {
    const cases: [number, number, number][] = [
      [21, 0, 265],
      [21, 1, 265],
      [171, 0, 265],
      [171, 60, 265],
      [34, 20, 300],
    ]
    for (const dpr of [1, 2]) {
      for (const [domain, tick, lane] of cases) {
        const width = playheadWidth(dpr)
        const left = playheadLeft(domain, tick, lane, dpr)
        const center = left + width / 2
        // 只能偏半个设备像素（再远就是没对齐）
        expect(Math.abs(center - boundaryOf(domain, tick, lane))).toBeLessThanOrEqual(
          0.5 / dpr + 1e-9,
        )
      }
    }
    // 波形的竖线是 1.5px、以边界为中点：2 倍屏上整条都躲在 2px 的红线后面
    for (const [domain, tick, lane] of cases) {
      const width = playheadWidth(2)
      const left = playheadLeft(domain, tick, lane, 2)
      const boundary = boundaryOf(domain, tick, lane)
      expect(left).toBeLessThanOrEqual(boundary - 0.75)
      expect(left + width).toBeGreaterThanOrEqual(boundary + 0.75)
    }
  })

  it('竖边对齐设备像素，不会落在半个像素上发虚', () => {
    for (const dpr of [1, 1.25, 1.5, 2, 3]) {
      for (const tick of [0, 3, 9]) {
        const left = playheadLeft(21, tick, 265, dpr)
        const width = playheadWidth(dpr)
        expect(Math.abs(left * dpr - Math.round(left * dpr))).toBeLessThan(1e-9)
        expect(Math.abs(width * dpr - Math.round(width * dpr))).toBeLessThan(1e-9)
      }
    }
  })

  it('两端夹在波形里：第一刻贴左边、最后一刻贴右边，都露全', () => {
    const lane = 265
    for (const dpr of [1, 1.25, 1.5, 2]) {
      const width = playheadWidth(dpr)
      const first = playheadLeft(21, 0, lane, dpr)
      expect(first).toBeGreaterThanOrEqual(0)
      // 回放会在测试结束后多走一步（tick = domain + 1），靠夹住不会再往右跑
      const last = playheadLeft(21, 22, lane, dpr)
      expect(last + width).toBeCloseTo(lane, 6)
      expect(playheadLeft(21, 30, lane, dpr) + width).toBeCloseTo(lane, 6)
    }
  })
})
