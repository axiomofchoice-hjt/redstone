import { describe, expect, it } from 'vitest'
import {
  clampCamera,
  clampZoom,
  MAX_ZOOM,
  MIN_ZOOM,
  zoomAround,
  zoomForKey,
  ZOOM_PRESETS,
} from './camera'

describe('相机夹取', () => {
  it('缩放限制在 0.5 到 3 之间', () => {
    expect(clampZoom(0.2)).toBe(MIN_ZOOM)
    expect(clampZoom(1.5)).toBe(1.5)
    expect(clampZoom(9)).toBe(MAX_ZOOM)
  })

  it('地图比视口小时居中', () => {
    expect(clampCamera(-500, 900, 800, 600, 400, 300)).toEqual({ x: 200, y: 150 })
  })

  it('地图比视口大时留出 12 的边，拖不出去', () => {
    // 地图 1200×900，视口 800×600：左边最多到 -412，右边最多到 12
    expect(clampCamera(-4000, -4000, 800, 600, 1200, 900)).toEqual({ x: -412, y: -312 })
    expect(clampCamera(4000, 4000, 800, 600, 1200, 900)).toEqual({ x: 12, y: 12 })
    // 范围内的位置原样保留
    expect(clampCamera(-100, -50, 800, 600, 1200, 900)).toEqual({ x: -100, y: -50 })
  })
})

describe('以视口中心缩放', () => {
  const view = { w: 800, h: 600, camX: -200, camY: -100, mapW: 1200, mapH: 900 }

  it('视口中心下面的地图点保持不动', () => {
    const before = { x: -200, y: -100, zoom: 1 }
    const after = zoomAround(before, view, 2)
    // 视口中心 (400, 300)：放大前对应地图 (600, 400)，放大后仍是 (600, 400)
    expect((400 - after.x) / after.zoom).toBeCloseTo(600)
    expect((300 - after.y) / after.zoom).toBeCloseTo(400)
    expect(after.zoom).toBe(2)
  })

  it('超出范围的缩放夹到最大 / 最小', () => {
    expect(zoomAround({ x: 0, y: 0, zoom: 1 }, view, 99).zoom).toBe(MAX_ZOOM)
    expect(zoomAround({ x: 0, y: 0, zoom: 1 }, view, 0.1).zoom).toBe(MIN_ZOOM)
    // 缩放没变时原样返回，不白改一次相机
    const cam = { x: 10, y: 20, zoom: 2 }
    expect(zoomAround(cam, view, 2)).toBe(cam)
  })
})

describe('缩放按键', () => {
  it('档位是 50 67 75 80 90 100 110 125 150 175 200 250 300', () => {
    expect(ZOOM_PRESETS.map((zoom) => Math.round(zoom * 100))).toEqual([
      50, 67, 75, 80, 90, 100, 110, 125, 150, 175, 200, 250, 300,
    ])
  })

  it('+ / = 往上跳一档，- / _ 往下跳一档', () => {
    expect(zoomForKey(1, '+')).toBe(1.1)
    expect(zoomForKey(1, '=')).toBe(1.1)
    expect(zoomForKey(1, '-')).toBe(0.9)
    expect(zoomForKey(1, '_')).toBe(0.9)
    // 正好落在档位上时往下走，不会因为浮点误差原地不动
    expect(zoomForKey(0.67, '+')).toBe(0.75)
    expect(zoomForKey(0.67, '-')).toBe(0.5)
  })

  it('当前不在档位上时跳到相邻的一档', () => {
    expect(zoomForKey(0.83, '+')).toBe(0.9)
    expect(zoomForKey(0.83, '-')).toBe(0.8)
    expect(zoomForKey(0.66, '+')).toBe(0.67)
    expect(zoomForKey(0.66, '-')).toBe(0.5)
  })

  it('到头就停在 50% / 300%，超出范围先夹回来', () => {
    expect(zoomForKey(3, '+')).toBe(3)
    expect(zoomForKey(0.5, '-')).toBe(0.5)
    expect(zoomForKey(9, '-')).toBe(2.5)
    expect(zoomForKey(0.1, '+')).toBe(0.67)
  })

  it('其他键不处理', () => {
    expect(zoomForKey(1, '0')).toBeNull()
    expect(zoomForKey(1, 'ArrowUp')).toBeNull()
    expect(zoomForKey(1, '+1')).toBeNull()
  })
})
