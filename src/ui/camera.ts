/** 画布相机：地图左上角在画布里的位置，以及相对 100% 格子大小的缩放 */
export interface Camera {
  x: number
  y: number
  zoom: number
}

/** 一帧画出来的视口和地图尺寸，滑轨缩放时拿视口中心当锚点 */
export interface Viewport {
  w: number
  h: number
  camX: number
  camY: number
  mapW: number
  mapH: number
}

/** 地图比视口大时，拖动和缩放后至少留的边 */
const EDGE = 12

/** 缩放范围（相对 100% 的格子大小）；20×20 这种大图要能缩到整张都在屏幕上 */
export const MIN_ZOOM = 0.5
export const MAX_ZOOM = 3

/** 键盘缩放的档位：50% 67% 75% 80% 90% 100% 110% 125% 150% 175% 200% 250% 300% */
export const ZOOM_PRESETS = [0.5, 0.67, 0.75, 0.8, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2, 2.5, 3] as const

/** 浮点误差容忍：捏合和滑轨得到的值可能差一丁点，别当成还没到这一档 */
const ZOOM_EPSILON = 1e-4

export const clampZoom = (zoom: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom))

/**
 * 缩放按键落到哪一档：+ / = 往上跳一档，- / _ 往下跳一档，到头就停在 50% / 300%。
 * 主键盘的 + 要按 Shift，很多键盘布局上不按 Shift 的 = 更顺手，所以两个都认。
 * 当前缩放不在档位上（滑轨或捏合停在 83% 这种）时，跳到相邻的那一档。
 */
export const zoomForKey = (zoom: number, key: string): number | null => {
  const up = key === '+' || key === '='
  const down = key === '-' || key === '_'
  if (!up && !down) return null

  const current = clampZoom(zoom)
  if (up) {
    return ZOOM_PRESETS.find((step) => step > current + ZOOM_EPSILON) ?? current
  }
  for (let i = ZOOM_PRESETS.length - 1; i >= 0; i--) {
    if (ZOOM_PRESETS[i] < current - ZOOM_EPSILON) return ZOOM_PRESETS[i]
  }
  return current
}

/** 地图比视口小就居中摆；比视口大就把相机的活动范围夹在 EDGE 以内 */
export function clampCamera(
  x: number,
  y: number,
  w: number,
  h: number,
  mapW: number,
  mapH: number,
) {
  return {
    x: mapW <= w ? (w - mapW) / 2 : Math.min(EDGE, Math.max(w - mapW - EDGE, x)),
    y: mapH <= h ? (h - mapH) / 2 : Math.min(EDGE, Math.max(h - mapH - EDGE, y)),
  }
}

/** 以视口中心为锚点缩放：拖右侧滑轨时，地图中心那一块停在原地 */
export function zoomAround(cam: Camera, view: Viewport, zoom: number): Camera {
  const next = clampZoom(zoom)
  if (next === cam.zoom) return cam
  const ratio = next / cam.zoom
  const cx = view.w / 2
  const cy = view.h / 2
  const pos = clampCamera(
    cx - (cx - view.camX) * ratio,
    cy - (cy - view.camY) * ratio,
    view.w,
    view.h,
    view.mapW * ratio,
    view.mapH * ratio,
  )
  return { x: pos.x, y: pos.y, zoom: next }
}
