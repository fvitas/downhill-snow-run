import { TAU } from '../balls/kit.ts'
import type { Path, SparkBody } from '../trails.ts'
import type { TrailPoint } from '../world.ts'

export const between = (low: number, high: number): number => low + Math.random() * (high - low)

export const pick = (colours: readonly string[]): string =>
  colours[Math.floor(Math.random() * colours.length)] ?? '#ffffff'


export const rgba = (hex: string, alpha: number): string => {
  const value = Number.parseInt(hex.slice(1), 16)
  return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`
}

export const spark = (x: number, y: number, over: Partial<SparkBody>): SparkBody => {
  const life = over.life ?? 1
  return { x, y, vx: 0, vy: 0, size: 3, rot: 0, vr: 0, colour: '#ffffff', seed: Math.random(), ...over, life, max: life }
}

export const line = (ctx: CanvasRenderingContext2D, points: readonly TrailPoint[], colour: string, width: number): void => {
  if (points.length < 2) return
  ctx.strokeStyle = colour
  ctx.lineWidth = width
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.beginPath()
  points.forEach((point, i) => (i === 0 ? ctx.moveTo(point.x, point.y) : ctx.lineTo(point.x, point.y)))
  ctx.stroke()
}

// Each segment is stroked on its own, so the colour or weight can change along the track.
export const each = (
  ctx: CanvasRenderingContext2D,
  points: readonly TrailPoint[],
  style: (from: TrailPoint, u: number) => [string, number],
): void => {
  ctx.lineCap = 'round'
  for (let i = 1; i < points.length; i += 1) {
    const from = points[i - 1]
    const to = points[i]
    if (!from || !to) continue
    const [colour, width] = style(from, i / (points.length - 1))
    ctx.strokeStyle = colour
    ctx.lineWidth = width
    ctx.beginPath()
    ctx.moveTo(from.x, from.y)
    ctx.lineTo(to.x, to.y)
    ctx.stroke()
  }
}

// Points every `step` px of the run, pinned to the snow rather than to the ball.
export const resample = (points: readonly TrailPoint[], step: number): TrailPoint[] => {
  const first = points[0]
  const last = points[points.length - 1]
  if (!first || !last) return []
  const out: TrailPoint[] = [first]
  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1]
    const b = points[i]
    if (!a || !b || b.d <= a.d) continue
    for (let k = Math.ceil(a.d / step); k * step < b.d; k += 1) {
      const u = (k * step - a.d) / (b.d - a.d)
      out.push({ x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u, d: k * step })
    }
  }
  if (last !== first) out.push(last)
  return out
}

// Where the run was `back` px before the head, and which way it was heading there.
export const behind = (points: readonly TrailPoint[], back: number): { x: number; y: number; ang: number } | null => {
  const head = points[points.length - 1]
  if (!head) return null
  const target = head.d - back
  for (let i = points.length - 1; i > 0; i -= 1) {
    const a = points[i - 1]
    const b = points[i]
    if (!a || !b) continue
    if (a.d <= target && target <= b.d) {
      const u = (target - a.d) / Math.max(0.001, b.d - a.d)
      return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u, ang: Math.atan2(b.y - a.y, b.x - a.x) }
    }
  }
  return null
}

export const groove: Path = (ctx, points, { r, theme }) => line(ctx, points, theme.trail, r * 1.05)

export const fourPoint = (ctx: CanvasRenderingContext2D, x: number, y: number, s: number): void => {
  ctx.beginPath()
  ctx.moveTo(x, y - s)
  ctx.quadraticCurveTo(x, y, x + s, y)
  ctx.quadraticCurveTo(x, y, x, y + s)
  ctx.quadraticCurveTo(x, y, x - s, y)
  ctx.quadraticCurveTo(x, y, x, y - s)
  ctx.fill()
}

export const dot = (ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, colour: string): void => {
  ctx.fillStyle = colour
  ctx.beginPath()
  ctx.arc(x, y, radius, 0, TAU)
  ctx.fill()
}

export const fadeIn = (age: number): number => Math.min(1, age * 2)

export const headD = (points: readonly TrailPoint[]): number => points[points.length - 1]?.d ?? 0

// The offset `by` px to the left of travel at heading `ang`.
export const side = (ang: number, by: number): [number, number] => [-Math.sin(ang) * by, Math.cos(ang) * by]

// Each resampled point with the run's direction there, for marks laid across or along the track.
export const stations = (points: readonly TrailPoint[], step: number): (TrailPoint & { ang: number; u: number })[] => {
  const dense = resample(points, step)
  return dense.map((point, i) => {
    const next = dense[Math.min(dense.length - 1, i + 1)] ?? point
    const prev = dense[Math.max(0, i - 1)] ?? point
    return { ...point, ang: Math.atan2(next.y - prev.y, next.x - prev.x), u: dense.length > 1 ? i / (dense.length - 1) : 1 }
  })
}

// The run shifted sideways by `by(d)`, for tracks that run beside the ball's.
export const offsetLine = (points: readonly TrailPoint[], step: number, by: (d: number) => number): TrailPoint[] =>
  stations(points, step).map((point) => {
    const [ox, oy] = side(point.ang, by(point.d))
    return { x: point.x + ox, y: point.y + oy, d: point.d }
  })

export const at = (ctx: CanvasRenderingContext2D, x: number, y: number, rot: number, draw: () => void): void => {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(rot)
  draw()
  ctx.restore()
}
