import { disc, hash, hsl, star, TAU } from '../balls/kit.ts'
import type { Trail } from '../trails.ts'
import { at, behind, between, each, fadeIn, fourPoint, groove, headD, line, offsetLine, pick, resample, rgba, side, spark, stations } from './kit.ts'

export const rainbowRoad: Trail = {
  id: 'rainbowroad',
  name: 'Rainbow road',
  premium: true,
  path: (ctx, points, { r, t }) => {
    const marks = stations(points, 7)
    const half = r * 1.25
    for (let i = 1; i < marks.length; i += 1) {
      const a = marks[i - 1]
      const b = marks[i]
      if (!a || !b) continue
      const [ax, ay] = side(a.ang, half)
      const [bx, by] = side(b.ang, half)
      ctx.fillStyle = hsl(Math.round(a.d / 7) * 28 + t * 30, 90, 62, 0.85)
      ctx.beginPath()
      ctx.moveTo(a.x - ax, a.y - ay)
      ctx.lineTo(a.x + ax, a.y + ay)
      ctx.lineTo(b.x + bx + Math.cos(b.ang), b.y + by + Math.sin(b.ang))
      ctx.lineTo(b.x - bx + Math.cos(b.ang), b.y - by + Math.sin(b.ang))
      ctx.fill()
    }
    for (const edge of [-1, 1]) {
      const rail = offsetLine(points, 4, () => edge * half)
      line(ctx, rail, 'rgba(255,255,255,0.35)', r * 0.6)
      line(ctx, rail, 'rgba(255,255,255,0.9)', 1.3)
    }
    for (const p of stations(points, 9)) {
      const k = Math.round(p.d / 9)
      const on = (((k - t * 18) % 5) + 5) % 5 < 1
      if (!on) continue
      for (const edge of [-1, 1]) {
        const [ox, oy] = side(p.ang, edge * half)
        disc(ctx, p.x + ox, p.y + oy, r * 0.3, 'rgba(255,255,255,0.9)')
      }
    }
  },
}

export const goldRush: Trail = {
  id: 'goldrush',
  name: 'Gold rush',
  premium: true,
  path: (ctx, points, { r }) => line(ctx, points, 'rgba(250,204,21,0.22)', r * 1.05),
  every: 22,
  spawn: (x, y, { r }) => spark(x, y, { life: 1.3, vx: between(-60, 60), vy: -between(40, 100), size: r * 0.7 }),
  step: (item, dt) => {
    item.vy += 280 * dt
  },
  draw: (ctx, item, x, y, age, { t }) => {
    ctx.globalAlpha = fadeIn(age)
    const flip = Math.cos(t * 9 + item.seed * 6)
    const w = Math.max(0.15, Math.abs(flip)) * item.size
    ctx.fillStyle = flip > 0 ? '#facc15' : '#ca8a04'
    ctx.strokeStyle = '#a16207'
    ctx.lineWidth = 0.8
    ctx.beginPath()
    ctx.ellipse(x, y, w, item.size, 0, 0, TAU)
    ctx.fill()
    ctx.stroke()
    if (Math.abs(flip) > 0.5) {
      ctx.fillStyle = 'rgba(254,249,195,0.9)'
      star(ctx, x, y, item.size * 0.45 * Math.abs(flip), 0, 5, 0.45)
      ctx.fill()
    }
    if (Math.sin(t * 7 + item.seed * 20) > 0.92) {
      ctx.fillStyle = '#ffffff'
      fourPoint(ctx, x + w * 0.6, y - item.size * 0.6, item.size * 0.8)
    }
  },
}

export const phoenixTrail: Trail = {
  id: 'phoenix',
  name: 'Phoenix wings',
  premium: true,
  path: (ctx, points, { r, t }) => {
    const head = headD(points)
    const body = resample(points.filter((p) => head - p.d < r * 30), 3)
    for (const p of stations(body, 9)) {
      if (p.u < 0.15) continue
      const k = Math.round(p.d / 9)
      for (const wing of [-1, 1]) {
        const length = r * 2.6 * p.u * (0.75 + 0.25 * Math.sin(t * 12 + k))
        const a = p.ang + Math.PI + wing * (1.1 - 0.4 * p.u)
        ctx.fillStyle = hsl(10 + p.u * 40 + (k % 3) * 8, 100, 55, 0.35 + 0.35 * p.u)
        ctx.beginPath()
        ctx.moveTo(p.x, p.y)
        ctx.quadraticCurveTo(
          p.x + Math.cos(a - wing * 0.35) * length * 0.6,
          p.y + Math.sin(a - wing * 0.35) * length * 0.6,
          p.x + Math.cos(a) * length,
          p.y + Math.sin(a) * length,
        )
        ctx.quadraticCurveTo(p.x + Math.cos(a + wing * 0.3) * length * 0.4, p.y + Math.sin(a + wing * 0.3) * length * 0.4, p.x, p.y)
        ctx.fill()
      }
    }
    each(ctx, body, (_, u) => [hsl(10 + u * 40, 100, 50 + u * 15, u), r * 1.3 * u])
  },
  every: 7,
  spawn: (x, y, { r }) => spark(x + between(-r, r), y, { life: between(0.6, 1), vx: between(-15, 15), vy: -between(40, 90), size: r * between(0.15, 0.3), colour: pick(['#f59e0b', '#f97316', '#ea580c']) }),
  draw: (ctx, item, x, y, age) => {
    ctx.globalAlpha = age
    disc(ctx, x, y, item.size * 2.2, rgba(item.colour, 0.25))
    disc(ctx, x, y, item.size, item.colour)
  },
}

export const galaxy: Trail = {
  id: 'galaxy',
  name: 'Galaxy',
  premium: true,
  path: (ctx, points, { r, t }) => {
    const dense = resample(points, 3)
    each(ctx, dense, (_, u) => [`rgba(139,92,246,${0.25 * u})`, r * 3])
    each(ctx, dense, (_, u) => [`rgba(30,27,75,${0.25 + 0.7 * u})`, r * 2.1])
    ctx.globalCompositeOperation = 'lighter'
    each(ctx, dense, (from, u) => [hsl(250 + Math.sin(from.d / 40) * 50, 85, 55, 0.3 * u), r * 1.3])
    ctx.globalCompositeOperation = 'source-over'
    for (const p of stations(points, 3.5)) {
      const k = Math.round(p.d / 3.5)
      const [ox, oy] = side(p.ang, (hash(k) - 0.5) * r * 1.8)
      const twinkle = 0.4 + 0.6 * Math.abs(Math.sin(t * 2 + hash(k, 1) * 20))
      if (hash(k, 2) > 0.93) {
        ctx.fillStyle = `rgba(255,255,255,${twinkle * p.u})`
        fourPoint(ctx, p.x + ox, p.y + oy, r * 0.5 * twinkle)
      } else {
        disc(ctx, p.x + ox, p.y + oy, Math.max(0.4, r * 0.08 * hash(k, 3) + 0.3), `rgba(255,255,255,${twinkle * p.u})`)
      }
    }
  },
}

export const neonTube: Trail = {
  id: 'neon',
  name: 'Neon tube',
  premium: true,
  path: (ctx, points, { r, t }) => {
    for (const edge of [-1, 1]) {
      const tube = offsetLine(points, 4, () => edge * r * 0.55)
      each(ctx, tube, (from, u) => [hsl(from.d * 0.7 - t * 120 + edge * 40, 100, 60, 0.25 * u), r * 0.9])
      each(ctx, tube, (from, u) => [hsl(from.d * 0.7 - t * 120 + edge * 40, 100, 55, u), r * 0.32])
      each(ctx, tube, (_, u) => [`rgba(255,255,255,${0.8 * u})`, r * 0.1])
    }
  },
}

export const fairyDust: Trail = {
  id: 'fairydust',
  name: 'Fairy dust',
  premium: true,
  path: (ctx, points, { r }) => line(ctx, points, 'rgba(253,230,138,0.3)', r * 1.05),
  every: 6,
  spawn: (x, y, { r }) => spark(x + between(-r, r), y + between(-r, r), { life: between(1, 1.8), vx: between(-12, 12), vy: between(-14, 6), size: r * between(0.35, 0.7), colour: pick(['#f59e0b', '#ec4899', '#8b5cf6', '#eab308']) }),
  draw: (ctx, item, x, y, age, { t }) => {
    const wink = 0.5 + 0.5 * Math.sin(t * 8 + item.seed * 30)
    ctx.globalAlpha = fadeIn(age) * (0.4 + 0.6 * wink)
    disc(ctx, x, y, item.size * 1.1, rgba(item.colour, 0.18))
    ctx.fillStyle = item.colour
    fourPoint(ctx, x, y, item.size * (0.5 + 0.5 * wink))
  },
}

const DRAGON_LENGTH = 300

export const dragon: Trail = {
  id: 'dragon',
  name: 'Dragon',
  premium: true,
  path: (ctx, points, { r, t }) => {
    const head = headD(points)
    const body = resample(points.filter((p) => head - p.d < DRAGON_LENGTH), 3)
    const tail = body[0]
    if (tail && body.length > 4) {
      for (let i = 0; i < 5; i += 1) {
        const a = (body[1] ? Math.atan2(tail.y - body[1].y, tail.x - body[1].x) : 0) + (i - 2) * 0.35 + Math.sin(t * 10 + i) * 0.15
        ctx.fillStyle = i % 2 === 0 ? 'rgba(249,115,22,0.6)' : 'rgba(250,204,21,0.6)'
        ctx.beginPath()
        ctx.ellipse(tail.x + Math.cos(a) * r * 0.8, tail.y + Math.sin(a) * r * 0.8, r * 0.9, r * 0.3, a, 0, TAU)
        ctx.fill()
      }
    }
    for (const p of stations(body, 7)) {
      for (const flank of [-1, 1]) {
        const reach = r * (0.25 + 0.95 * p.u)
        const [bx, by] = side(p.ang, flank * reach)
        const [tx, ty] = side(p.ang, flank * (reach + r * 0.45))
        ctx.fillStyle = '#facc15'
        ctx.beginPath()
        ctx.moveTo(p.x + bx - Math.cos(p.ang) * r * 0.3, p.y + by - Math.sin(p.ang) * r * 0.3)
        ctx.lineTo(p.x + tx - Math.cos(p.ang) * r * 0.5, p.y + ty - Math.sin(p.ang) * r * 0.5)
        ctx.lineTo(p.x + bx + Math.cos(p.ang) * r * 0.3, p.y + by + Math.sin(p.ang) * r * 0.3)
        ctx.fill()
      }
    }
    each(ctx, body, (from, u) => [Math.floor(from.d / 9) % 2 === 0 ? '#dc2626' : '#b91c1c', r * (0.5 + 1.9 * u)])
    each(ctx, body, (_, u) => ['rgba(250,204,21,0.85)', r * 0.35 * u])
  },
  front: (ctx, points, { r, t, ang }) => {
    const head = points[points.length - 1]
    if (!head) return
    ctx.strokeStyle = '#facc15'
    ctx.lineWidth = 1.1
    ctx.lineCap = 'round'
    for (const flank of [-1, 1]) {
      const [ox, oy] = side(ang, flank * r * 0.6)
      const back = ang + Math.PI + flank * 0.5
      ctx.beginPath()
      ctx.moveTo(head.x + ox, head.y + oy)
      ctx.quadraticCurveTo(
        head.x + ox + Math.cos(back) * r * 1.6 + Math.sin(t * 7 + flank) * r * 0.6,
        head.y + oy + Math.sin(back) * r * 1.6,
        head.x + ox + Math.cos(back + flank * 0.4) * r * 3,
        head.y + oy + Math.sin(back + flank * 0.4) * r * 3 + Math.sin(t * 5 + flank) * r * 0.5,
      )
      ctx.stroke()
      const [hx, hy] = side(ang, flank * r * 0.5)
      ctx.fillStyle = '#fde68a'
      ctx.beginPath()
      ctx.moveTo(head.x + hx - Math.cos(ang) * r * 0.3, head.y + hy - Math.sin(ang) * r * 0.3)
      ctx.lineTo(head.x + hx * 2.2 - Math.cos(ang) * r * 1.4, head.y + hy * 2.2 - Math.sin(ang) * r * 1.4)
      ctx.lineTo(head.x + hx * 1.4 - Math.cos(ang) * r * 0.2, head.y + hy * 1.4 - Math.sin(ang) * r * 0.2)
      ctx.fill()
    }
  },
}

export const kite: Trail = {
  id: 'kite',
  name: 'Kite',
  premium: true,
  path: groove,
  front: (ctx, points, { r, t }) => {
    const head = points[points.length - 1]
    const tailEnd = points[0]
    if (!head || !tailEnd) return
    const spot = behind(points, Math.min(r * 11, (head.d - tailEnd.d) * 0.8))
    if (!spot) return
    const [ox, oy] = side(spot.ang, Math.sin(t * 1.3) * r * 2.5)
    const kx = spot.x + ox
    const ky = spot.y + oy
    ctx.strokeStyle = 'rgba(71,85,105,0.7)'
    ctx.lineWidth = 0.8
    ctx.beginPath()
    ctx.moveTo(head.x, head.y)
    ctx.quadraticCurveTo((head.x + kx) / 2 + Math.sin(t * 2) * r, (head.y + ky) / 2, kx, ky)
    ctx.stroke()
    const ang = spot.ang + Math.sin(t * 2.2) * 0.25
    ctx.strokeStyle = 'rgba(71,85,105,0.8)'
    ctx.beginPath()
    ctx.moveTo(kx, ky)
    const tail: [number, number][] = []
    for (let k = 1; k <= 5; k += 1) {
      const [sx, sy] = side(ang, Math.sin(t * 6 - k * 0.9) * r * 0.5)
      const px = kx - Math.cos(ang) * r * 1.3 * k + sx
      const py = ky - Math.sin(ang) * r * 1.3 * k + sy
      ctx.lineTo(px, py)
      tail.push([px, py])
    }
    ctx.stroke()
    tail.forEach(([px, py], k) => {
      at(ctx, px, py, t * 3 + k, () => {
        ctx.fillStyle = k % 2 === 0 ? '#ef4444' : '#facc15'
        ctx.beginPath()
        ctx.moveTo(-r * 0.3, -r * 0.18)
        ctx.lineTo(0, 0)
        ctx.lineTo(-r * 0.3, r * 0.18)
        ctx.moveTo(r * 0.3, -r * 0.18)
        ctx.lineTo(0, 0)
        ctx.lineTo(r * 0.3, r * 0.18)
        ctx.fill()
      })
    })
    at(ctx, kx, ky, ang + Math.PI, () => {
      const s = r * 2.3
      const corners: [number, number][] = [[s * 1.3, 0], [0, -s * 0.7], [-s * 0.6, 0], [0, s * 0.7]]
      for (let k = 0; k < 4; k += 1) {
        const a = corners[k]
        const b = corners[(k + 1) % 4]
        if (!a || !b) continue
        ctx.fillStyle = ['#ef4444', '#facc15', '#3b82f6', '#22c55e'][k] ?? '#ef4444'
        ctx.beginPath()
        ctx.moveTo(0, 0)
        ctx.lineTo(a[0], a[1])
        ctx.lineTo(b[0], b[1])
        ctx.fill()
      }
      ctx.strokeStyle = 'rgba(15,23,42,0.5)'
      ctx.lineWidth = 0.8
      ctx.beginPath()
      ctx.moveTo(s * 1.3, 0)
      ctx.lineTo(-s * 0.6, 0)
      ctx.moveTo(0, -s * 0.7)
      ctx.lineTo(0, s * 0.7)
      ctx.stroke()
    })
  },
}

export const rocketExhaust: Trail = {
  id: 'rocket',
  name: 'Rocket exhaust',
  premium: true,
  path: groove,
  every: 9,
  spawn: (x, y, { r }) => spark(x + between(-r * 0.3, r * 0.3), y, { life: 1, size: r * between(0.35, 0.55), vx: between(-10, 10), vy: between(-14, -4) }),
  step: (item, dt) => {
    item.size += dt * 9
  },
  draw: (ctx, item, x, y, age) => {
    ctx.globalAlpha = fadeIn(age) * 0.75
    disc(ctx, x, y, item.size, age > 0.8 ? '#fde68a' : age > 0.6 ? '#fdba74' : '#cbd5e1')
    ctx.globalAlpha = 1
  },
  front: (ctx, points, { r, t }) => {
    const head = points[points.length - 1]
    const spot = behind(points, r * 0.9)
    if (!head || !spot) return
    const back = spot.ang + Math.PI
    const flick = 1 + Math.sin(t * 40) * 0.12 + Math.sin(t * 23) * 0.08
    at(ctx, head.x, head.y, back, () => {
      for (const [len, w, colour] of [[5, 0.9, 'rgba(249,115,22,0.85)'], [3.4, 0.6, '#facc15'], [2, 0.32, '#fffbeb']] as const) {
        ctx.fillStyle = colour
        ctx.beginPath()
        ctx.moveTo(r * 0.5, -r * w)
        ctx.quadraticCurveTo(r * (0.6 + len * flick * 0.6), -r * w * 0.6, r * (0.6 + len * flick), 0)
        ctx.quadraticCurveTo(r * (0.6 + len * flick * 0.6), r * w * 0.6, r * 0.5, r * w)
        ctx.closePath()
        ctx.fill()
      }
    })
  },
}
