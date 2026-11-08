import { describe, expect, it } from 'vitest'
import { clampCamera, clampZoom, MAX_ZOOM, MIN_ZOOM, zoomAround } from './camera'

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
