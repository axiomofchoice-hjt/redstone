import type { FlyDir, FlyPart } from './types'

/** 画一个零件，cx / cy 是格子中心。extended = 这个活塞正伸出去，要画活塞臂 */
export function drawFlyPart(
  ctx: CanvasRenderingContext2D,
  part: FlyPart,
  cx: number,
  cy: number,
  size: number,
  extended = false,
) {
  const s = size
  const line = Math.max(1, s * 0.05)
  switch (part.type) {
    case 'block': {
      const p = s * 0.34
      roundRect(ctx, cx - p, cy - p, p * 2, p * 2, s * 0.07)
      ctx.fillStyle = '#59627a'
      ctx.fill()
      ctx.strokeStyle = '#808ba6'
      ctx.lineWidth = line
      ctx.stroke()
      roundRect(ctx, cx - p * 0.55, cy - p * 0.55, p * 1.1, p * 1.1, s * 0.04)
      ctx.strokeStyle = '#6b7690'
      ctx.stroke()
      break
    }
    case 'slime': {
      const p = s * 0.36
      roundRect(ctx, cx - p, cy - p, p * 2, p * 2, s * 0.16)
      ctx.fillStyle = 'rgba(74, 222, 128, 0.22)'
      ctx.fill()
      ctx.strokeStyle = '#4ade80'
      ctx.lineWidth = line
      ctx.stroke()
      break
    }
    case 'redstone': {
      const p = s * 0.3
      roundRect(ctx, cx - p, cy - p, p * 2, p * 2, s * 0.05)
      ctx.fillStyle = '#d93636'
      ctx.fill()
      ctx.strokeStyle = '#ff7a6b'
      ctx.lineWidth = line
      ctx.stroke()
      break
    }
    case 'piston':
    case 'stickyPiston': {
      ctx.save()
      ctx.translate(cx, cy)
      ctx.rotate(DIR_ANGLE[part.dir ?? 1])
      const body = s * 0.36
      const sticky = part.type === 'stickyPiston'
      // 机身：伸出时缩进去一截，把地方让给活塞臂
      roundRect(ctx, -body, -body, body * (extended ? 1.15 : 1.55), body * 2, s * 0.06)
      ctx.fillStyle = '#59627a'
      ctx.fill()
      ctx.strokeStyle = '#808ba6'
      ctx.lineWidth = line
      ctx.stroke()
      if (extended) {
        // 活塞臂：从机身一直伸到格子外面，接上隔壁那格的推头
        const thick = s * 0.19
        roundRect(ctx, body * 0.12, -thick / 2, s * 0.6 - body * 0.12, thick, thick * 0.35)
        ctx.fillStyle = sticky ? '#3f7a58' : '#aab4c8'
        ctx.fill()
        ctx.strokeStyle = sticky ? '#4ade80' : '#cfd6e4'
        ctx.lineWidth = Math.max(1, line * 0.7)
        ctx.stroke()
        // 臂上的两道横杠，看得出是推杆
        ctx.beginPath()
        for (const k of [0.45, 0.51]) {
          ctx.moveTo(s * k, -thick * 0.42)
          ctx.lineTo(s * k, thick * 0.42)
        }
        ctx.strokeStyle = 'rgba(14, 16, 24, 0.45)'
        ctx.lineWidth = Math.max(1, line * 0.8)
        ctx.stroke()
      } else {
        // 收回状态：推头贴在机身前面
        roundRect(ctx, body * 0.55, -body * 0.92, body * 0.36, body * 1.84, s * 0.03)
        ctx.fillStyle = sticky ? '#4ade80' : '#c3cbdd'
        ctx.fill()
        ctx.strokeStyle = '#e3e9f5'
        ctx.lineWidth = line
        ctx.stroke()
      }
      ctx.restore()
      break
    }
    case 'clock': {
      const r = s * 0.33
      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(250, 204, 21, 0.16)'
      ctx.fill()
      ctx.strokeStyle = '#facc15'
      ctx.lineWidth = line
      ctx.stroke()
      // 指针
      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.lineTo(cx, cy - r * 0.62)
      ctx.moveTo(cx, cy)
      ctx.lineTo(cx + r * 0.45, cy)
      ctx.stroke()
      break
    }
    case 'observer': {
      ctx.save()
      ctx.translate(cx, cy)
      ctx.rotate(DIR_ANGLE[part.dir ?? 1])
      const p = s * 0.34
      roundRect(ctx, -p, -p, p * 2, p * 2, s * 0.07)
      ctx.fillStyle = '#4b5568'
      ctx.fill()
      ctx.strokeStyle = '#8b95ab'
      ctx.lineWidth = line
      ctx.stroke()
      // 眼睛朝前
      ctx.beginPath()
      ctx.arc(p * 0.62, 0, s * 0.11, 0, Math.PI * 2)
      ctx.fillStyle = '#c3cbdd'
      ctx.fill()
      // 后面的红点
      ctx.beginPath()
      ctx.arc(-p * 0.62, 0, s * 0.07, 0, Math.PI * 2)
      ctx.fillStyle = '#ff5a4a'
      ctx.fill()
      ctx.restore()
      break
    }
  }
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
}

export const DIR_ANGLE: Record<FlyDir, number> = {
  0: -Math.PI / 2,
  1: 0,
  2: Math.PI / 2,
  3: Math.PI,
}

/** 伸出去的活塞头那一格：后面接臂，前面一块推板 */
export function drawPistonHead(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  dir: FlyDir,
  sticky: boolean,
) {
  const s = size
  const line = Math.max(1, s * 0.05)
  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate(DIR_ANGLE[dir])
  // 活塞臂：从格子后沿一路穿到前面
  const thick = s * 0.19
  roundRect(ctx, -s * 0.5, -thick / 2, s * 0.62, thick, thick * 0.35)
  ctx.fillStyle = sticky ? '#3f7a58' : '#aab4c8'
  ctx.fill()
  ctx.strokeStyle = sticky ? '#4ade80' : '#cfd6e4'
  ctx.lineWidth = Math.max(1, line * 0.7)
  ctx.stroke()
  // 推板：贴着前面的边
  roundRect(ctx, s * 0.14, -s * 0.43, s * 0.32, s * 0.86, s * 0.04)
  ctx.fillStyle = sticky ? '#4ade80' : '#c3cbdd'
  ctx.fill()
  ctx.strokeStyle = sticky ? '#86efac' : '#e3e9f5'
  ctx.lineWidth = line
  ctx.stroke()
  ctx.restore()
}
