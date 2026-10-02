import { disc, hsl, TAU } from '../balls/kit.ts'
import type { Trail } from '../trails.ts'
import { between, each, fadeIn, groove, headD, line, offsetLine, pick, resample, side, spark, stations } from './kit.ts'

const drawPenguin = (ctx: CanvasRenderingContext2D, x: number, y: number, ang: number, s: number, waddle: number): void => {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(ang + waddle)
  ctx.fillStyle = '#f97316'
  for (const foot of [-1, 1]) {
    ctx.beginPath()
    ctx.ellipse(-s * 0.55, foot * s * 0.35, s * 0.25, s * 0.15, 0, 0, TAU)
    ctx.fill()
  }
  ctx.fillStyle = '#1f2937'
  ctx.beginPath()
  ctx.ellipse(0, 0, s * 0.85, s * 0.65, 0, 0, TAU)
  ctx.fill()
  for (const flipper of [-1, 1]) {
    ctx.beginPath()
    ctx.ellipse(-s * 0.05, flipper * s * 0.68, s * 0.4, s * 0.12, flipper * (0.3 + waddle), 0, TAU)
    ctx.fill()
  }
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.ellipse(s * 0.25, 0, s * 0.45, s * 0.42, 0, 0, TAU)
  ctx.fill()
  disc(ctx, s * 0.42, -s * 0.18, s * 0.08, '#111827')
  disc(ctx, s * 0.42, s * 0.18, s * 0.08, '#111827')
  ctx.fillStyle = '#f97316'
  ctx.beginPath()
  ctx.moveTo(s * 0.62, -s * 0.12)
  ctx.lineTo(s * 0.95, 0)
  ctx.lineTo(s * 0.62, s * 0.12)
  ctx.fill()
  ctx.restore()
}

export const penguins: Trail = {
  id: 'penguins',
  name: 'Penguins',
  path: groove,
  front: (ctx, points, { r, t }) => {
    for (let k = 1; k <= 3; k += 1) {
      const at = points.length > 1 ? stations(points, 2).reverse().find((p) => headD(points) - p.d >= k * r * 3.6) : undefined
      if (at) drawPenguin(ctx, at.x, at.y, at.ang, r * 0.85, Math.sin(t * 14 + k * 1.7) * 0.25)
    }
  },
}

export const skate: Trail = {
  id: 'iceskate',
  name: 'Ice skate',
  path: (ctx, points, { r }) => {
    for (const by of [-0.28, 0.28]) line(ctx, offsetLine(points, 3, () => by * r), 'rgba(14,116,144,0.45)', 0.9)
  },
  every: 5,
  spawn: (x, y, { ang, r }) => {
    const out = Math.random() < 0.5 ? -1 : 1
    const [vx, vy] = side(ang, out * between(25, 70))
    return spark(x, y, { life: between(0.3, 0.6), vx: vx - Math.cos(ang) * 20, vy: vy - Math.sin(ang) * 20, size: r * between(0.12, 0.25), colour: pick(['#ffffff', '#e0f2fe', '#bae6fd']) })
  },
  draw: (ctx, item, x, y, age) => {
    ctx.globalAlpha = fadeIn(age)
    disc(ctx, x, y, item.size, item.colour)
    ctx.strokeStyle = 'rgba(14,116,144,0.3)'
    ctx.lineWidth = 0.6
    ctx.stroke()
  },
}

export const sparkler: Trail = {
  id: 'sparkler',
  name: 'Sparkler',
  every: 2,
  spawn: (x, y) =>
    [0, 1].map(() => {
      const a = Math.random() * TAU
      const speed = between(60, 170)
      return spark(x, y, { life: between(0.18, 0.4), vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, colour: pick(['#f59e0b', '#facc15', '#fb923c', '#ef4444']) })
    }),
  step: (item, dt) => {
    item.vx *= 1 - 3 * dt
    item.vy *= 1 - 3 * dt
  },
  draw: (ctx, item, x, y, age) => {
    ctx.strokeStyle = item.colour
    ctx.globalAlpha = age
    ctx.lineWidth = 1.2
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(x - item.vx * 0.04, y - item.vy * 0.04)
    ctx.lineTo(x, y)
    ctx.stroke()
  },
}

const drawBee = (ctx: CanvasRenderingContext2D, x: number, y: number, ang: number, s: number, t: number): void => {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(ang)
  ctx.fillStyle = 'rgba(224,242,254,0.85)'
  const flap = Math.sin(t * 50) * 0.4
  for (const wing of [-1, 1]) {
    ctx.beginPath()
    ctx.ellipse(-s * 0.1, wing * s * 0.5, s * 0.45, s * 0.25, wing * (0.5 + flap), 0, TAU)
    ctx.fill()
  }
  ctx.fillStyle = '#facc15'
  ctx.beginPath()
  ctx.ellipse(0, 0, s * 0.7, s * 0.45, 0, 0, TAU)
  ctx.fill()
  ctx.fillStyle = '#1f2937'
  ctx.fillRect(-s * 0.2, -s * 0.45, s * 0.18, s * 0.9)
  ctx.fillRect(-s * 0.55, -s * 0.35, s * 0.15, s * 0.7)
  disc(ctx, s * 0.5, 0, s * 0.22, '#1f2937')
  ctx.restore()
}

export const bees: Trail = {
  id: 'bees',
  name: 'Bees',
  path: (ctx, points, { r }) => {
    ctx.setLineDash([1, r * 0.8])
    line(ctx, offsetLine(points.filter((p) => headD(points) - p.d < r * 14), 2, (d) => Math.sin(d / 9) * r * 1.1), 'rgba(71,85,105,0.5)', 1.2)
    ctx.setLineDash([])
  },
  front: (ctx, points, { r, t }) => {
    const marks = stations(points, 2).reverse()
    for (let k = 1; k <= 3; k += 1) {
      const at = marks.find((p) => headD(points) - p.d >= k * r * 2.6)
      if (!at) continue
      const [ox, oy] = side(at.ang, Math.sin(t * 6 + k * 2) * r * 1.2)
      drawBee(ctx, at.x + ox + Math.sin(t * 31 + k) * 0.8, at.y + oy + Math.cos(t * 27 + k) * 0.8, at.ang + Math.sin(t * 6 + k * 2) * 0.6, r * 0.7, t + k)
    }
  },
}

export const tieDyeBand: Trail = {
  id: 'tiedye',
  name: 'Tie-dye',
  path: (ctx, points, { r, t }) => each(ctx, resample(points, 3), (from) => [hsl(from.d * 0.9 + Math.sin(from.d / 25 + t) * 50, 85, 65, 0.55), r * 1.7]),
}

export const ants: Trail = {
  id: 'ants',
  name: 'Ants',
  path: groove,
  front: (ctx, points, { r, t }) => {
    const marks = stations(points, 1.5).reverse()
    const span = r * 18
    for (let k = 0; k < 9; k += 1) {
      const back = r * 1.6 + ((k * span) / 9 + t * r * 2.5) % span
      const at = marks.find((p) => headD(points) - p.d >= back)
      if (!at) continue
      const [ox, oy] = side(at.ang, Math.sin(k * 2.1) * r * 0.25)
      ctx.save()
      ctx.translate(at.x + ox, at.y + oy)
      ctx.rotate(at.ang)
      ctx.strokeStyle = '#1f2937'
      ctx.lineWidth = 0.6
      const step = Math.sin(t * 25 + k) * r * 0.12
      for (let leg = -1; leg <= 1; leg += 1) {
        ctx.beginPath()
        ctx.moveTo(leg * r * 0.18 + step, -r * 0.3)
        ctx.lineTo(leg * r * 0.18 - step, r * 0.3)
        ctx.stroke()
      }
      for (const [bx, s] of [[-r * 0.3, 0.17], [0, 0.12], [r * 0.25, 0.13]] as const) disc(ctx, bx, 0, r * s, '#1f2937')
      ctx.restore()
    }
  },
}

export const racingStripes: Trail = {
  id: 'racingstripes',
  name: 'Racing stripes',
  path: (ctx, points, { r, tint }) => {
    for (const by of [-0.35, 0.35]) line(ctx, offsetLine(points, 3, () => by * r), tint, r * 0.42)
    line(ctx, points, 'rgba(255,255,255,0.9)', r * 0.12)
  },
}

export const comboHeat: Trail = {
  id: 'combo',
  name: 'Combo heat',
  path: (ctx, points, { r, heat }) => {
    const hue = 210 - heat * 210
    line(ctx, points, hsl(hue, 90, 60, 0.3), r * (1.1 + heat * 0.8))
    line(ctx, points, hsl(hue, 95, 55, 0.85), r * (0.45 + heat * 0.4))
    if (heat > 0.6) line(ctx, points, 'rgba(254,240,138,0.9)', r * 0.18)
  },
}

export const nearMissSparks: Trail = {
  id: 'nearmiss',
  name: 'Near-miss sparks',
  path: groove,
  every: 5,
  spawn: (x, y, { r, fright }) => {
    if (fright < 0.3) return []
    return Array.from({ length: 4 }, () => {
      const a = between(0, TAU)
      const speed = between(50, 110)
      return spark(x, y, { life: 0.5, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, size: r * between(0.25, 0.4), colour: pick(['#facc15', '#fb923c', '#ffffff']) })
    })
  },
  step: (item, dt) => {
    item.vy += dt * 160
  },
  draw: (ctx, item, x, y, age) => {
    ctx.globalAlpha = fadeIn(age)
    ctx.strokeStyle = item.colour
    ctx.lineWidth = item.size
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x - item.vx * 0.04, y - item.vy * 0.04)
    ctx.stroke()
    ctx.globalAlpha = 1
  },
}
