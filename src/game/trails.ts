import { hash, TAU } from './balls/kit.ts'
import type { Theme } from './themes.ts'
import { ants, bees, comboHeat, nearMissSparks, penguins, racingStripes, skate, sparkler, tieDyeBand } from './trails/extra.ts'
import { behind, between, dot, each, fadeIn, fourPoint, groove, line, offsetLine, pick, resample, rgba, spark } from './trails/kit.ts'
import { dragon, fairyDust, galaxy, goldRush, kite, neonTube, phoenixTrail, rainbowRoad, rocketExhaust } from './trails/premium.ts'
import type { TrailPoint } from './world.ts'

export type TrailId =
  | 'classic'
  | 'rainbow'
  | 'comet'
  | 'sparkle'
  | 'fire'
  | 'hearts'
  | 'tint'
  | 'blush'
  | 'mint'
  | 'lilac'
  | 'fade'
  | 'powder'
  | 'brush'
  | 'chalk'
  | 'stars'
  | 'confetti'
  | 'smoke'
  | 'echoes'
  | 'ducklings'
  | 'snake'
  | 'iceblue'
  | 'shadow'
  | 'deeppowder'
  | 'skitracks'
  | 'snowboard'
  | 'dotted'
  | 'racingstripes'
  | 'tiedye'
  | 'laser'
  | 'lightcycle'
  | 'speedlines'
  | 'iceskate'
  | 'sparkler'
  | 'combo'
  | 'nearmiss'
  | 'penguins'
  | 'bees'
  | 'ants'
  | 'train'
  | 'kite'
  | 'phoenix'
  | 'rocket'
  | 'dragon'
  | 'rainbowroad'
  | 'galaxy'
  | 'goldrush'
  | 'neon'
  | 'fairydust'

export type TrailEnv = {
  r: number
  theme: Theme
  // The chosen ball's colour, for the trails that match it.
  tint: string
  t: number
  // Direction of travel in radians, and sideways travel from -1 to 1.
  ang: number
  heading: number
  hueRate: number
  // The ball's run signals, 0–1: see BallEnv.
  heat: number
  fright: number
  paintBall: (ctx: CanvasRenderingContext2D, x: number, y: number, r: number) => void
}

export type SparkBody = {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  max: number
  size: number
  rot: number
  vr: number
  colour: string
  // A fixed 0–1 per spark, so each one can wink or flip out of step with the rest.
  seed: number
}

// Each spark keeps the trail that threw it, so switching trails doesn't redraw the old ones.
type Spark = SparkBody & { trail: TrailId }

export type TrailFx = { sparks: Spark[]; carry: number }

export type Path = (ctx: CanvasRenderingContext2D, points: readonly TrailPoint[], env: TrailEnv) => void

export type Trail = {
  id: TrailId
  name: string
  // Premium trails only come with Unlock all.
  premium?: true
  path?: Path
  // Drawn over the ball, for trails that ski behind it rather than lie under it.
  front?: Path
  // One spark per this many px skied, so the effect is as dense at a crawl as at full speed.
  every?: number
  spawn?: (x: number, y: number, env: TrailEnv) => SparkBody | SparkBody[]
  // Extra motion on top of the spark's own velocity, run once a frame.
  step?: (spark: Spark, dt: number) => void
  draw?: (ctx: CanvasRenderingContext2D, spark: Spark, x: number, y: number, age: number, env: TrailEnv) => void
}

const MAX_SPARKS = 160
// A full spectrum every 400 px, so the visible tail holds most of it without banding.
export const RAINBOW_HUE_PER_PX = 0.9

// The sparks the first trails shipped with: a little scatter, drifting mostly upward.
const drift = (x: number, y: number, colour: string, size: number, life: number, speed: number): SparkBody =>
  spark(x + between(-3, 3), y, { colour, size, life, vx: between(-speed, speed), vy: between(-speed, speed * 0.4) })

const plain =
  (colour: string): Path =>
  (ctx, points, { r }) =>
    line(ctx, points, colour, r * 1.05)

const fivePoint = (ctx: CanvasRenderingContext2D, x: number, y: number, outer: number, rotation: number): void => {
  ctx.beginPath()
  for (let i = 0; i < 10; i += 1) {
    const a = rotation - Math.PI / 2 + (i / 10) * TAU
    const radius = i % 2 === 0 ? outer : outer * 0.45
    if (i === 0) ctx.moveTo(x + Math.cos(a) * radius, y + Math.sin(a) * radius)
    else ctx.lineTo(x + Math.cos(a) * radius, y + Math.sin(a) * radius)
  }
  ctx.closePath()
}

const heart = (ctx: CanvasRenderingContext2D, x: number, y: number, s: number): void => {
  ctx.beginPath()
  ctx.moveTo(x, y + s * 0.9)
  ctx.bezierCurveTo(x - s * 1.6, y - s * 0.2, x - s * 0.6, y - s * 1.3, x, y - s * 0.4)
  ctx.bezierCurveTo(x + s * 0.6, y - s * 1.3, x + s * 1.6, y - s * 0.2, x, y + s * 0.9)
  ctx.fill()
}

const SPARKLE = ['#60a5fa', '#f59e0b', '#a78bfa', '#34d399']
const EMBER = ['#f97316', '#f59e0b', '#ef4444', '#fbbf24']
const HEART = ['#f472b6', '#fb7185', '#ec4899']
const CONFETTI = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7', '#ec4899']

const drawDuckling = (ctx: CanvasRenderingContext2D, x: number, y: number, ang: number, s: number): void => {
  ctx.fillStyle = 'rgba(92, 122, 162, 0.18)'
  ctx.beginPath()
  ctx.ellipse(x - s * 0.5, y + s * 0.5, s, s * 0.5, 0, 0, TAU)
  ctx.fill()
  dot(ctx, x, y, s, '#fde047')
  const hx = x + Math.cos(ang) * s * 0.9
  const hy = y + Math.sin(ang) * s * 0.9
  dot(ctx, hx, hy, s * 0.6, '#fde047')
  dot(ctx, hx + Math.cos(ang) * s * 0.55, hy + Math.sin(ang) * s * 0.55, s * 0.25, '#f97316')
  dot(ctx, hx + Math.cos(ang - 1) * s * 0.3, hy + Math.sin(ang - 1) * s * 0.3, s * 0.1, '#111827')
}

const SNAKE_LENGTH = 170
const TRAIN_COLOURS = ['#dc2626', '#2563eb', '#16a34a', '#eab308']

export const TRAILS: readonly Trail[] = [
  { id: 'classic', name: 'Classic', path: groove },
  {
    id: 'rainbow',
    name: 'Rainbow',
    // Hue follows the run, not the ball, so the colours stay painted where they were laid.
    path: (ctx, points, { r, hueRate }) =>
      each(ctx, points, (from) => [`hsl(${(from.d * hueRate) % 360} 85% 60%)`, r * 1.05]),
  },
  {
    id: 'comet',
    name: 'Comet',
    path: (ctx, points, env) => {
      groove(ctx, points, env)
      each(ctx, points, (_, u) => [rgba(env.theme.ball, u * u * 0.9), env.r * 1.05 * (0.35 + 0.65 * u)])
    },
  },
  {
    id: 'sparkle',
    name: 'Sparkle',
    path: groove,
    every: 9,
    spawn: (x, y, { r }) => drift(x, y, pick(SPARKLE), between(r * 0.4, r * 0.7), between(0.7, 1.1), 18),
    // Twinkles as it fades, so a field of them never reads as confetti lying still.
    draw: (ctx, item, x, y, age) => {
      ctx.globalAlpha = Math.min(1, age * 1.6)
      ctx.fillStyle = item.colour
      fourPoint(ctx, x, y, item.size * (0.75 + 0.25 * Math.sin(item.life * 18)))
    },
  },
  {
    id: 'fire',
    name: 'Fire',
    path: (ctx, points, env) => {
      groove(ctx, points, env)
      line(ctx, points, 'rgba(249, 115, 22, 0.45)', env.r * 0.5)
    },
    every: 5,
    spawn: (x, y, { r }) => drift(x, y, pick(EMBER), between(r * 0.25, r * 0.5), between(0.35, 0.6), 40),
    draw: (ctx, item, x, y, age) => {
      ctx.globalAlpha = Math.min(1, age * 1.6)
      dot(ctx, x, y, item.size * (0.4 + 0.6 * age), item.colour)
    },
  },
  {
    id: 'hearts',
    name: 'Hearts',
    path: groove,
    every: 16,
    spawn: (x, y, { r }) => drift(x, y, pick(HEART), between(r * 0.4, r * 0.6), between(0.9, 1.3), 12),
    draw: (ctx, item, x, y, age) => {
      ctx.globalAlpha = Math.min(1, age * 1.6)
      ctx.fillStyle = item.colour
      heart(ctx, x, y, item.size)
    },
  },
  { id: 'tint', name: 'Ball tint', path: (ctx, points, { r, tint }) => line(ctx, points, rgba(tint, 0.35), r * 1.05) },
  { id: 'blush', name: 'Blush', path: plain('#fbcfe8') },
  { id: 'mint', name: 'Mint', path: plain('#a7f3d0') },
  { id: 'lilac', name: 'Lilac', path: plain('#ddd6fe') },
  { id: 'fade', name: 'Fade out', path: (ctx, points, { r, tint }) => each(ctx, points, (_, u) => [rgba(tint, u * 0.8), r * 1.05]) },
  {
    id: 'powder',
    name: 'Powder spray',
    path: groove,
    every: 4,
    // Thrown off the outside of the turn.
    spawn: (x, y, { r, heading }) =>
      spark(x, y, { life: between(0.4, 0.7), size: r * between(0.4, 0.8), vx: -heading * between(30, 80) + between(-15, 15), vy: between(-35, 5) }),
    draw: (ctx, item, x, y, age) => dot(ctx, x, y, item.size * (1.6 - age * 0.6), `rgba(190, 210, 236, ${age * 0.8})`),
  },
  {
    id: 'brush',
    name: 'Paint brush',
    path: (ctx, points, { r, tint }) =>
      each(ctx, resample(points, 3), (from) => [tint, r * (0.5 + 0.8 * ((Math.sin(from.d * 0.07) + Math.sin(from.d * 0.13 + 1) + 2) / 4))]),
    every: 34,
    spawn: (x, y, { r, tint }) => spark(x + between(-r * 2, r * 2), y + between(-r, r), { life: 2.5, size: r * between(0.15, 0.4), colour: tint }),
    draw: (ctx, item, x, y) => dot(ctx, x, y, item.size, item.colour),
  },
  {
    id: 'chalk',
    name: 'Chalk',
    path: (ctx, points, { r }) => {
      const dense = resample(points, 3)
      for (let k = 0; k < 4; k += 1) {
        const jitter = dense.map((p) => ({ ...p, x: p.x + (hash(p.d, k) - 0.5) * r * 0.8, y: p.y + (hash(k, p.d) - 0.5) * r * 0.8 }))
        line(ctx, jitter, 'rgba(96, 165, 250, 0.35)', 1.6)
      }
    },
  },
  {
    id: 'stars',
    name: 'Stars',
    path: groove,
    every: 14,
    spawn: (x, y, { r }) => spark(x, y, { life: 0.9, size: r * between(0.6, 0.9), vx: between(-20, 20), vy: between(-20, 5), vr: between(-4, 4) }),
    draw: (ctx, item, x, y, age) => {
      ctx.globalAlpha = fadeIn(age)
      fivePoint(ctx, x, y, item.size, item.rot)
      ctx.fillStyle = '#facc15'
      ctx.fill()
      ctx.strokeStyle = '#ca8a04'
      ctx.lineWidth = 1
      ctx.stroke()
    },
  },
  {
    id: 'confetti',
    name: 'Confetti',
    every: 5,
    spawn: (x, y, { r, heading }) =>
      spark(x, y, { life: 1.1, size: r * 0.55, vx: -heading * 40 + between(-40, 40), vy: between(-50, 10), vr: between(-10, 10), colour: pick(CONFETTI) }),
    // Squashed on one axis as it turns, so each piece flutters instead of spinning flat.
    draw: (ctx, item, x, y, age) => {
      ctx.globalAlpha = fadeIn(age)
      ctx.save()
      ctx.translate(x, y)
      ctx.rotate(item.rot)
      ctx.scale(Math.cos(item.rot * 1.7), 1)
      ctx.fillStyle = item.colour
      ctx.fillRect(-item.size / 2, -item.size * 0.3, item.size, item.size * 0.6)
      ctx.restore()
    },
  },
  {
    id: 'smoke',
    name: 'Smoke',
    every: 5,
    spawn: (x, y, { r }) => spark(x, y, { life: 1.3, size: r * between(0.6, 0.9), vx: between(-8, 8), vy: between(-12, 0) }),
    draw: (ctx, item, x, y, age) => dot(ctx, x, y, item.size * (2.6 - age * 1.6), `rgba(100, 116, 139, ${0.22 * age})`),
  },
  {
    id: 'echoes',
    name: 'Echoes',
    path: (ctx, points, env) => {
      for (let k = 5; k >= 1; k -= 1) {
        const at = behind(points, k * env.r * 2.4)
        if (!at) continue
        ctx.globalAlpha = 0.5 - k * 0.08
        env.paintBall(ctx, at.x, at.y, env.r * (1 - k * 0.06))
      }
      ctx.globalAlpha = 1
    },
  },
  {
    id: 'ducklings',
    name: 'Ducklings',
    front: (ctx, points, { r, t }) => {
      for (let k = 1; k <= 4; k += 1) {
        const at = behind(points, k * r * 3.4)
        if (at) drawDuckling(ctx, at.x, at.y + Math.sin(t * 12 + k) * 0.8, at.ang, r * 0.75)
      }
    },
  },
  {
    id: 'snake',
    name: 'Snake',
    // The ball is the head: the body tapers to its tail, and a tongue flicks out ahead.
    path: (ctx, points, { r }) => {
      const head = points[points.length - 1]
      const body = points.filter((p) => (head?.d ?? 0) - p.d < SNAKE_LENGTH)
      each(ctx, resample(body, 3), (from, u) => [Math.floor(from.d / 9) % 2 === 0 ? '#22c55e' : '#15803d', r * 1.6 * (0.2 + 0.8 * u)])
    },
    front: (ctx, points, { r, t, ang }) => {
      const head = points[points.length - 1]
      if (!head || Math.sin(t * 5) < 0.3) return
      const tx = head.x + Math.cos(ang) * r * 1.9
      const ty = head.y + Math.sin(ang) * r * 1.9
      ctx.strokeStyle = '#dc2626'
      ctx.lineWidth = 1.3
      ctx.beginPath()
      ctx.moveTo(head.x + Math.cos(ang) * r, head.y + Math.sin(ang) * r)
      ctx.lineTo(tx, ty)
      ctx.lineTo(tx + Math.cos(ang - 0.6) * r * 0.5, ty + Math.sin(ang - 0.6) * r * 0.5)
      ctx.moveTo(tx, ty)
      ctx.lineTo(tx + Math.cos(ang + 0.6) * r * 0.5, ty + Math.sin(ang + 0.6) * r * 0.5)
      ctx.stroke()
    },
  },
  { id: 'iceblue', name: 'Ice blue', path: plain('#bfdbfe') },
  { id: 'shadow', name: 'Shadow', path: plain('rgba(11,43,94,0.14)') },
  {
    id: 'deeppowder',
    name: 'Deep powder',
    path: (ctx, points, { r }) => {
      line(ctx, points, '#eef4fc', r * 2.6)
      line(ctx, points, '#dbe7f6', r * 1.1)
    },
  },
  {
    id: 'skitracks',
    name: 'Ski tracks',
    path: (ctx, points, { r }) => {
      for (const by of [-0.55, 0.55]) line(ctx, offsetLine(points, 3, () => by * r), 'rgba(11,43,94,0.13)', r * 0.34)
    },
  },
  {
    id: 'snowboard',
    name: 'Snowboard',
    path: (ctx, points, { r, theme }) => {
      line(ctx, points, theme.trail, r * 1.9)
      for (const by of [-0.95, 0.95]) line(ctx, offsetLine(points, 3, () => by * r), '#cfdef1', 1.3)
    },
  },
  {
    id: 'dotted',
    name: 'Dotted',
    // The dash starts where the oldest point was laid, so the dots hold still on the snow.
    path: (ctx, points, { r, tint }) => {
      ctx.setLineDash([0.1, r * 1.7])
      ctx.lineDashOffset = points[0]?.d ?? 0
      line(ctx, points, tint, r * 0.6)
    },
  },
  racingStripes,
  tieDyeBand,
  {
    id: 'laser',
    name: 'Laser',
    path: (ctx, points, { r }) => {
      line(ctx, points, 'rgba(239,68,68,0.22)', r * 1.5)
      line(ctx, points, '#ef4444', r * 0.45)
      line(ctx, points, '#ffffff', r * 0.15)
    },
  },
  {
    id: 'lightcycle',
    name: 'Light cycle',
    path: (ctx, points, { r }) => {
      line(ctx, points, 'rgba(34,211,238,0.22)', r * 1.8)
      line(ctx, points, '#22d3ee', r * 0.6)
      line(ctx, points, '#ecfeff', r * 0.18)
    },
  },
  {
    id: 'speedlines',
    name: 'Speed lines',
    front: (ctx, points, { r, ang }) => {
      const head = points[points.length - 1]
      if (!head) return
      ctx.strokeStyle = 'rgba(11,43,94,0.35)'
      ctx.lineWidth = 1.4
      for (let k = 0; k < 6; k += 1) {
        const across = between(-r * 2.6, r * 2.6)
        const back = between(r * 1.6, r * 5)
        const length = between(r * 1.5, r * 4)
        const sx = head.x - Math.cos(ang) * back - Math.sin(ang) * across
        const sy = head.y - Math.sin(ang) * back + Math.cos(ang) * across
        ctx.beginPath()
        ctx.moveTo(sx, sy)
        ctx.lineTo(sx - Math.cos(ang) * length, sy - Math.sin(ang) * length)
        ctx.stroke()
      }
    },
  },
  skate,
  sparkler,
  comboHeat,
  nearMissSparks,
  penguins,
  bees,
  ants,
  {
    id: 'train',
    name: 'Train',
    front: (ctx, points, { r }) => {
      for (let k = 1; k <= TRAIN_COLOURS.length; k += 1) {
        const spot = behind(points, k * r * 3)
        if (!spot) continue
        ctx.save()
        ctx.translate(spot.x, spot.y)
        ctx.rotate(spot.ang)
        ctx.fillStyle = TRAIN_COLOURS[k - 1] ?? '#dc2626'
        ctx.beginPath()
        ctx.roundRect(-r * 1.2, -r * 0.8, r * 2.4, r * 1.6, r * 0.3)
        ctx.fill()
        ctx.fillStyle = '#e0f2fe'
        ctx.fillRect(-r * 0.8, -r * 0.45, r * 0.6, r * 0.9)
        ctx.fillRect(r * 0.2, -r * 0.45, r * 0.6, r * 0.9)
        ctx.restore()
      }
    },
  },
  kite,
  phoenixTrail,
  rocketExhaust,
  dragon,
  rainbowRoad,
  galaxy,
  goldRush,
  neonTube,
  fairyDust,
]

export const isPremiumTrail = (id: TrailId): boolean => trailOf(id)?.premium === true

const trailOf = (id: TrailId): Trail | undefined => TRAILS.find((entry) => entry.id === id)

// The ball's own spot on the run, one step past the last laid point.
export const trailHead = (points: readonly TrailPoint[], x: number, y: number): TrailPoint => {
  const last = points[points.length - 1]
  return { x, y, d: last ? last.d + Math.hypot(x - last.x, y - last.y) : 0 }
}

const onScreen = (points: readonly TrailPoint[], head: TrailPoint, camY: number): TrailPoint[] =>
  [...points, head].map((point) => ({ x: point.x, y: point.y - camY, d: point.d }))

const drawLayer = (
  ctx: CanvasRenderingContext2D,
  layer: Path | undefined,
  points: readonly TrailPoint[],
  head: TrailPoint,
  camY: number,
  env: TrailEnv,
): void => {
  if (!layer || points.length < 1) return
  ctx.save()
  layer(ctx, onScreen(points, head, camY), env)
  ctx.restore()
}

export const drawTrailPath = (
  ctx: CanvasRenderingContext2D,
  id: TrailId,
  points: readonly TrailPoint[],
  head: TrailPoint,
  camY: number,
  env: TrailEnv,
): void => drawLayer(ctx, trailOf(id)?.path, points, head, camY, env)

export const drawTrailFront = (
  ctx: CanvasRenderingContext2D,
  id: TrailId,
  points: readonly TrailPoint[],
  head: TrailPoint,
  camY: number,
  env: TrailEnv,
): void => drawLayer(ctx, trailOf(id)?.front, points, head, camY, env)

export const createTrailFx = (): TrailFx => ({ sparks: [], carry: 0 })

export const clearTrailFx = (fx: TrailFx): void => {
  fx.sparks.length = 0
  fx.carry = 0
}

export const emitTrailFx = (fx: TrailFx, id: TrailId, x: number, y: number, travelled: number, env: TrailEnv): void => {
  const trail = trailOf(id)
  if (!trail?.every || !trail.spawn) return
  fx.carry += travelled
  while (fx.carry >= trail.every) {
    fx.carry -= trail.every
    const made = trail.spawn(x, y, env)
    for (const body of Array.isArray(made) ? made : [made]) if (fx.sparks.length < MAX_SPARKS) fx.sparks.push({ ...body, trail: id })
  }
}

export const stepTrailFx = (fx: TrailFx, dt: number): void => {
  for (let i = fx.sparks.length - 1; i >= 0; i -= 1) {
    const item = fx.sparks[i]
    if (!item) continue
    item.life -= dt
    if (item.life <= 0) {
      fx.sparks.splice(i, 1)
      continue
    }
    item.x += item.vx * dt
    item.y += item.vy * dt
    item.rot += item.vr * dt
    trailOf(item.trail)?.step?.(item, dt)
  }
}

export const drawTrailFx = (ctx: CanvasRenderingContext2D, fx: TrailFx, camY: number, height: number, env: TrailEnv): void => {
  for (const item of fx.sparks) {
    const y = item.y - camY
    if (y < -20 || y > height + 20) continue
    ctx.save()
    trailOf(item.trail)?.draw?.(ctx, item, item.x, y, item.life / item.max, env)
    ctx.restore()
  }
}
