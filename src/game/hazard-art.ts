import {
  CROSSERS,
  GATE_HALF,
  HOLE_R,
  ICICLE,
  icicleDrop,
  JUMP,
  KID,
  LOG,
  NET_HEIGHT,
  SNOWBALL,
  toppleFall,
  toppleShake,
  TOPPLE_R,
} from './hazards.ts'
import { drawPine, drawShadow } from './pine.ts'
import { createRng } from './rng.ts'
import { sprite } from './sprites.ts'
import type { GameState, Hazard, Theme } from './state.ts'
import { axisAngle, drawStone, IDENTITY, ROCK_PALETTE, SNOW_PALETTE, stoneFor } from './stone.ts'
import { LOGICAL_WIDTH } from './viewport.ts'
import type { Shot } from './world.ts'

// Every shape here was drawn in mockups/obstacles.html; x, y is the ground point on screen.

const W = LOGICAL_WIDTH
const clamp01 = (value: number): number => Math.min(1, Math.max(0, value))

const drawLog = (ctx: CanvasRenderingContext2D, theme: Theme, x: number, y: number, dir: number, tilt: number): void => {
  const { len, h } = LOG
  const half = len / 2
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(dir, 1)
  ctx.rotate(tilt)

  ctx.fillStyle = theme.shadow
  ctx.beginPath()
  ctx.moveTo(-half - 4, h / 2 - 2)
  ctx.lineTo(half, h / 2 - 2)
  ctx.lineTo(half - 14, h / 2 + 12)
  ctx.lineTo(-half - 18, h / 2 + 12)
  ctx.closePath()
  ctx.fill()

  const body = ctx.createLinearGradient(0, -h / 2, 0, h / 2)
  body.addColorStop(0, '#8d6443')
  body.addColorStop(0.45, '#6e4b30')
  body.addColorStop(1, '#442d1c')
  ctx.fillStyle = body
  ctx.beginPath()
  ctx.roundRect(-half, -h / 2, len, h, 7)
  ctx.fill()

  const rng = createRng(9)
  ctx.strokeStyle = 'rgba(38, 22, 10, 0.5)'
  ctx.lineWidth = 1.4
  ctx.lineCap = 'round'
  for (let i = 0; i < 26; i += 1) {
    const bx = -half + 10 + rng() * (len - 34)
    const by = -h / 2 + 7 + rng() * (h - 11)
    const bl = 8 + rng() * 18
    ctx.beginPath()
    ctx.moveTo(bx, by)
    ctx.lineTo(bx + bl, by + (rng() - 0.5) * 2)
    ctx.stroke()
  }

  const stubs: readonly (readonly [number, number, number, number])[] = [
    [-50, -h / 2 + 2, -2.3, 13],
    [28, h / 2 - 2, 2.0, 10],
    [62, -h / 2 + 2, -1.1, 15],
  ]
  for (const [sx, sy, a, l] of stubs) {
    ctx.save()
    ctx.translate(sx, sy)
    ctx.rotate(a)
    ctx.fillStyle = '#5a3c26'
    ctx.beginPath()
    ctx.roundRect(0, -3, l, 6, 3)
    ctx.fill()
    ctx.fillStyle = '#c9a27a'
    ctx.beginPath()
    ctx.ellipse(l, 0, 1.8, 3, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }

  for (const ex of [-half, half]) {
    ctx.fillStyle = '#442d1c'
    ctx.beginPath()
    ctx.ellipse(ex, 0, 8, h / 2 + 1, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = ex > 0 ? '#e0c095' : '#c9a57a'
    ctx.beginPath()
    ctx.ellipse(ex, 0, 6.5, h / 2 - 1.5, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = 'rgba(138, 106, 69, 0.85)'
    ctx.lineWidth = 1
    for (const k of [0.66, 0.36]) {
      ctx.beginPath()
      ctx.ellipse(ex, 0, 6.5 * k, (h / 2 - 1.5) * k, 0, 0, Math.PI * 2)
      ctx.stroke()
    }
  }

  ctx.fillStyle = 'rgba(255, 255, 255, 0.96)'
  ctx.beginPath()
  ctx.moveTo(-half + 10, -h / 2 + 6)
  for (let i = 0; i <= 12; i += 1) {
    ctx.lineTo(-half + 10 + (i / 12) * (len - 26), -h / 2 - 2 - Math.abs(Math.sin(i * 1.3)) * 3)
  }
  for (let i = 12; i >= 0; i -= 1) {
    ctx.lineTo(-half + 10 + (i / 12) * (len - 26), -h / 2 + 4 + Math.abs(Math.sin(i * 2.1)) * 3)
  }
  ctx.closePath()
  ctx.fill()

  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
  for (const [dx, rx] of [
    [-70, 16],
    [-10, 12],
    [50, 18],
  ] as const) {
    ctx.beginPath()
    ctx.ellipse(dx, -h / 2 - 3, rx, 4, 0, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

const NET_POST = 46

const netTop = (ctx: CanvasRenderingContext2D, posts: number[], top: number): void => {
  const first = posts[0] ?? 0
  ctx.moveTo(first, top)
  for (let i = 1; i < posts.length; i += 1) {
    const a = posts[i - 1] ?? 0
    const b = posts[i] ?? 0
    ctx.quadraticCurveTo((a + b) / 2, top + 7, b, top)
  }
}

const drawNetRun = (ctx: CanvasRenderingContext2D, theme: Theme, a: number, b: number, y: number): void => {
  const top = y - NET_HEIGHT
  const bays = Math.max(1, Math.round((b - a) / NET_POST))
  const posts = Array.from({ length: bays + 1 }, (_, i) => a + ((b - a) * i) / bays)

  ctx.fillStyle = theme.shadow
  ctx.beginPath()
  ctx.moveTo(a, y)
  ctx.lineTo(b, y)
  ctx.lineTo(b - 16, y + 12)
  ctx.lineTo(a - 16, y + 12)
  ctx.closePath()
  ctx.fill()

  const outline = (): void => {
    ctx.beginPath()
    netTop(ctx, posts, top)
    ctx.lineTo(b, y)
    ctx.lineTo(a, y)
    ctx.closePath()
  }
  outline()
  ctx.fillStyle = 'rgba(232, 52, 40, 0.28)'
  ctx.fill()
  ctx.save()
  outline()
  ctx.clip()
  ctx.strokeStyle = 'rgba(214, 40, 30, 0.85)'
  ctx.lineWidth = 1.3
  for (let x = a - NET_HEIGHT; x < b + NET_HEIGHT; x += 7) {
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x + NET_HEIGHT, top)
    ctx.moveTo(x, top)
    ctx.lineTo(x + NET_HEIGHT, y)
    ctx.stroke()
  }
  ctx.restore()

  ctx.strokeStyle = '#b91c1c'
  ctx.lineWidth = 3
  ctx.beginPath()
  netTop(ctx, posts, top)
  ctx.stroke()
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(a, y - 1)
  ctx.lineTo(b, y - 1)
  ctx.stroke()

  for (const x of posts) {
    ctx.fillStyle = '#1f2937'
    ctx.fillRect(x - 2, top - 6, 4, NET_HEIGHT + 6)
    ctx.fillStyle = '#f8fafc'
    ctx.fillRect(x - 2, top - 6, 4, 4)
  }
}

const drawHole = (ctx: CanvasRenderingContext2D, x: number, y: number): void => {
  const r = HOLE_R
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)'
  ctx.lineWidth = 2
  for (let i = 0; i < 7; i += 1) {
    const a = (i / 7) * Math.PI * 2 + 0.4
    ctx.beginPath()
    ctx.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.6)
    ctx.lineTo(x + Math.cos(a) * (r + 28), y + Math.sin(a + 0.3) * (r + 28) * 0.6)
    ctx.stroke()
  }
  ctx.fillStyle = '#a9d3ee'
  ctx.beginPath()
  ctx.ellipse(x, y, r + 5, (r + 5) * 0.6, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#173a5e'
  ctx.beginPath()
  ctx.ellipse(x, y, r, r * 0.6, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = 'rgba(255, 255, 255, 0.35)'
  ctx.beginPath()
  ctx.ellipse(x - 12, y - 8, 14, 5, -0.3, 0, Math.PI * 2)
  ctx.fill()
}

const SKIER_HEIGHT = 40

const drawSkier = (ctx: CanvasRenderingContext2D, theme: Theme, hazard: Hazard, y: number): void => {
  const colour = Math.floor(hazard.homeY / 7) % 2 ? 'teal' : 'red'
  const image = sprite(`skier/${colour}-${hazard.dir > 0 ? 'right' : 'left'}.png`)
  if (!image) return
  const h = SKIER_HEIGHT
  const w = (image.naturalWidth / image.naturalHeight) * h
  ctx.fillStyle = theme.shadow
  ctx.beginPath()
  ctx.ellipse(hazard.x, y + h * 0.22, w * 0.46, 6, hazard.dir * 0.75, 0, Math.PI * 2)
  ctx.fill()
  ctx.drawImage(image, hazard.x - w / 2, y - h / 2, w, h)
}

// Drawn heading right; a sled going left is the same drawing mirrored.
const drawSnowmobile = (ctx: CanvasRenderingContext2D, theme: Theme, x: number, y: number, dir: number): void => {
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(dir, 1)
  ctx.fillStyle = theme.shadow
  ctx.beginPath()
  ctx.ellipse(-8, 12, 34, 10, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = 'rgba(255, 230, 150, 0.35)'
  ctx.beginPath()
  ctx.moveTo(24, -6)
  ctx.lineTo(130, -30)
  ctx.lineTo(130, 18)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = '#1e293b'
  ctx.fillRect(-34, 2, 28, 10)
  ctx.strokeStyle = '#1e293b'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(10, 12)
  ctx.lineTo(34, 12)
  ctx.moveTo(10, -8)
  ctx.lineTo(34, -8)
  ctx.stroke()
  ctx.fillStyle = '#e2483c'
  ctx.beginPath()
  ctx.roundRect(-30, -12, 56, 22, 8)
  ctx.fill()
  ctx.fillStyle = '#b62f25'
  ctx.beginPath()
  ctx.roundRect(-30, -12, 56, 9, [8, 8, 0, 0])
  ctx.fill()
  ctx.fillStyle = 'rgba(200, 230, 250, 0.9)'
  ctx.beginPath()
  ctx.roundRect(10, -10, 12, 18, 3)
  ctx.fill()
  ctx.fillStyle = '#1e293b'
  ctx.beginPath()
  ctx.arc(-8, -4, 7, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#ffe28a'
  ctx.beginPath()
  ctx.arc(26, -1, 3, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

// A blinking chevron: `angle` 0 points right, π/2 points down the slope.
const drawChevron = (ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, t: number): void => {
  if (Math.floor(t * 6) % 2) return
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(angle)
  ctx.strokeStyle = '#e2483c'
  ctx.lineWidth = 5
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(-8, -16)
  ctx.lineTo(8, 0)
  ctx.lineTo(-8, 16)
  ctx.stroke()
  ctx.restore()
}

const BEAR_STRIDE = 22
const BEAR_WALK = 140
// Sprites are stored at three times their on-slope size so they stay sharp on dense screens.
const SPRITE_SCALE = 1 / 3

const drawBear = (ctx: CanvasRenderingContext2D, theme: Theme, hazard: Hazard, y: number): void => {
  const frame = Math.floor((Math.max(0, hazard.age) * BEAR_WALK) / BEAR_STRIDE) % 4
  const image = sprite(`bear/${hazard.dir > 0 ? 'right' : 'left'}-${frame}.png`)
  if (!image) return
  const w = image.naturalWidth * SPRITE_SCALE
  const h = image.naturalHeight * SPRITE_SCALE
  ctx.fillStyle = theme.shadow
  ctx.beginPath()
  ctx.ellipse(hazard.x, y - 3, w * 0.42, 9, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.drawImage(image, hazard.x - w / 2, y - h, w, h)
}

const DEER = { hop: 0.42, hips: 21, lift: 18 }

// Take-off, stretch and reach are in the air; the fourth frame gathers on the ground.
const drawDeer = (ctx: CanvasRenderingContext2D, theme: Theme, hazard: Hazard, y: number): void => {
  const phase = (Math.max(0, hazard.age) % DEER.hop) / DEER.hop
  const frame = Math.floor(phase * 4)
  const lift = phase < 0.75 ? Math.sin((phase / 0.75) * Math.PI) * DEER.lift : 0
  const image = sprite(`deer/${hazard.dir > 0 ? 'right' : 'left'}-${frame}.png`)
  if (!image) return
  const w = image.naturalWidth * SPRITE_SCALE
  const h = image.naturalHeight * SPRITE_SCALE
  ctx.fillStyle = theme.shadow
  ctx.beginPath()
  ctx.ellipse(hazard.x, y + 2, 26 * (1 - lift / (DEER.lift * 3)), 5, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.drawImage(image, hazard.x - w / 2, y - DEER.hips - lift - h / 2, w, h)
}

type Coat = {
  light: string
  dark: string
  saddle: string
  head: string
  ears: string
  legs: string
  tip: string
  muzzle: string
  size: number
  speed: number
}

const WOLF_COAT: Coat = {
  light: '#aab3bd',
  dark: '#6b7480',
  saddle: 'rgba(40, 46, 56, 0.3)',
  head: '#8f98a3',
  ears: '#5b636e',
  legs: '#3f4650',
  tip: '#3f4650',
  muzzle: '#d3d9e0',
  size: 1,
  speed: 380,
}
const FOX_COAT: Coat = {
  light: '#f7a35c',
  dark: '#d9661f',
  saddle: 'rgba(140, 50, 10, 0.25)',
  head: '#e9782c',
  ears: '#3a2418',
  legs: '#3a2418',
  tip: '#ffffff',
  muzzle: '#fff4e8',
  size: 1.15,
  speed: 390,
}

const drawPawPrints = (ctx: CanvasRenderingContext2D, hazard: Hazard, camY: number): void => {
  const count = hazard.prints.length
  hazard.prints.forEach(({ x, y, heading, left }, i) => {
    const off = left ? 4 : -4
    ctx.fillStyle = `rgba(92, 122, 162, ${0.08 + (i / count) * 0.3})`
    ctx.beginPath()
    ctx.ellipse(x + Math.cos(heading) * off, y - camY - Math.sin(heading) * off, 2.2, 1.6, 0, 0, Math.PI * 2)
    ctx.fill()
  })
}

const drawCanine = (ctx: CanvasRenderingContext2D, theme: Theme, hazard: Hazard, y: number, coat: Coat): void => {
  const gait = Math.max(0, hazard.age) * coat.speed
  ctx.save()
  ctx.translate(hazard.x, y)
  ctx.scale(coat.size, coat.size)
  ctx.fillStyle = theme.shadow
  ctx.beginPath()
  ctx.ellipse(-4, 5, 24, 10, Math.PI / 2 - hazard.heading, 0, Math.PI * 2)
  ctx.fill()
  ctx.rotate(Math.PI / 2 - hazard.heading)
  const swing = Math.sin(gait * 0.12) * 5
  ctx.fillStyle = coat.legs
  for (const [px, py, k] of [
    [10, -8, 1],
    [10, 8, -1],
    [-11, -8, -1],
    [-11, 8, 1],
  ] as const) {
    ctx.beginPath()
    ctx.ellipse(px + swing * k, py, 4.5, 3, 0, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.fillStyle = coat.dark
  ctx.beginPath()
  ctx.ellipse(-24, Math.sin(gait * 0.06) * 2, 11, 4.5, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = coat.tip
  ctx.beginPath()
  ctx.ellipse(-33, Math.sin(gait * 0.06) * 2.5, 4, 3, 0, 0, Math.PI * 2)
  ctx.fill()
  const fur = ctx.createRadialGradient(0, -3, 2, 0, 0, 20)
  fur.addColorStop(0, coat.light)
  fur.addColorStop(1, coat.dark)
  ctx.fillStyle = fur
  ctx.beginPath()
  ctx.ellipse(-2, 0, 18, 9, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = coat.saddle
  ctx.beginPath()
  ctx.ellipse(-5, 0, 10, 4.5, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = coat.ears
  for (const ey of [-1, 1]) {
    ctx.beginPath()
    ctx.moveTo(13, ey * 3)
    ctx.lineTo(10, ey * 10)
    ctx.lineTo(17, ey * 6)
    ctx.closePath()
    ctx.fill()
  }
  ctx.fillStyle = coat.head
  ctx.beginPath()
  ctx.ellipse(17, 0, 7.5, 6.5, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = coat.muzzle
  ctx.beginPath()
  ctx.ellipse(24, 0, 5, 3.5, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#1f242b'
  ctx.beginPath()
  ctx.arc(28.5, 0, 1.8, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

const SHOT_R = 7
const SHOT_FADE = 0.3
const shotStone = (shot: Shot) => stoneFor((Math.floor(shot.fromY) ^ Math.floor(shot.x * 13)) & 0xffff)

// The ring shrinks onto the spot while the stone is in the air; then it sits there, then fades.
const drawShotGround = (ctx: CanvasRenderingContext2D, theme: Theme, shot: Shot, camY: number): void => {
  const mx = shot.x
  const my = shot.y - camY
  const u = shot.age / KID.flight
  if (u < 1) {
    ctx.strokeStyle = 'rgba(214, 64, 48, 0.6)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(mx, my, 22 - 12 * u, 0, Math.PI * 2)
    ctx.stroke()
    ctx.fillStyle = 'rgba(214, 64, 48, 0.35)'
    ctx.beginPath()
    ctx.arc(mx, my, 2.5, 0, Math.PI * 2)
    ctx.fill()
    return
  }
  const after = shot.age - KID.flight
  const alpha = Math.min(1, (KID.lethal + SHOT_FADE - after) / SHOT_FADE)
  if (alpha <= 0) return
  ctx.save()
  ctx.globalAlpha = alpha
  drawStone(ctx, shotStone(shot), IDENTITY, mx, my, SHOT_R, ROCK_PALETTE, theme.shadow)
  ctx.restore()
  const k = after / 0.4
  if (k >= 1) return
  ctx.fillStyle = `rgba(255, 255, 255, ${1 - k})`
  ctx.strokeStyle = `rgba(195, 209, 227, ${1 - k})`
  ctx.lineWidth = 1
  for (let i = 0; i < 8; i += 1) {
    const a = (i / 8) * Math.PI * 2
    ctx.beginPath()
    ctx.arc(mx + Math.cos(a) * (6 + k * 18), my + Math.sin(a) * (3 + k * 10) - Math.sin(k * Math.PI) * 6, 2.2, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
  }
}

const drawShotFlying = (ctx: CanvasRenderingContext2D, theme: Theme, shot: Shot, camY: number): void => {
  const u = shot.age / KID.flight
  if (u >= 1) return
  const gx = shot.fromX + (shot.x - shot.fromX) * u
  const gy = shot.fromY + (shot.y - shot.fromY) * u - camY
  const lift = 4 * u * (1 - u) * 110 + (1 - u) * KID.hand
  ctx.fillStyle = theme.shadow
  ctx.beginPath()
  ctx.ellipse(gx, gy, 8 * (1 - lift / 260), 3.5, 0, 0, Math.PI * 2)
  ctx.fill()
  drawStone(ctx, shotStone(shot), axisAngle([0.6, 0, 0.8], u * Math.PI * 3), gx, gy - lift, SHOT_R, ROCK_PALETTE, 'rgba(0, 0, 0, 0)')
}

// -1 winding up with a stone, 1 just thrown, 0 at rest.
const kidArm = (age: number): number =>
  KID.throws.reduce((arm, { at }) => (age > at - 0.3 && age < at ? -1 : age >= at && age < at + 0.2 ? 1 : arm), 0)

// Feet in the stored frame; the left frames are mirrors, so their x is measured from the other side.
const KID_FEET = { x: 100, y: 168 }
const KID_SCALE = SPRITE_SCALE * 0.75

const drawKid = (ctx: CanvasRenderingContext2D, theme: Theme, x: number, y: number, dir: number, arm: number): void => {
  const frame = arm < 0 ? 1 : arm > 0 ? 2 : 0
  const image = sprite(`kid/${dir > 0 ? 'right' : 'left'}-${frame}.png`)
  if (!image) return
  const w = image.naturalWidth * KID_SCALE
  const h = image.naturalHeight * KID_SCALE
  const feetX = (dir > 0 ? KID_FEET.x : image.naturalWidth - KID_FEET.x) * KID_SCALE
  ctx.fillStyle = theme.shadow
  ctx.beginPath()
  ctx.ellipse(x - dir * 5, y - 2, 18, 5, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.drawImage(image, x - feetX, y - KID_FEET.y * KID_SCALE, w, h)
}

const SNOWBALL_SEED = 5

const drawSnowball = (ctx: CanvasRenderingContext2D, theme: Theme, hazard: Hazard, y: number): void => {
  const r = hazard.size
  drawStone(ctx, stoneFor(SNOWBALL_SEED, 0.05), axisAngle([-1, 0, 0], hazard.heading), hazard.x, y, r, SNOW_PALETTE, theme.shadow)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
  for (let i = 0; i < 4; i += 1) {
    ctx.beginPath()
    ctx.arc(hazard.x - r + ((i * 17 + hazard.age * 90) % (r * 2)), y - r - 6 - (i % 2) * 8, 4, 0, Math.PI * 2)
    ctx.fill()
  }
}

const GROOVE_PX = 900

// Starts where the snowball was set rolling and fades out up the slope behind it.
const drawGroove = (ctx: CanvasRenderingContext2D, hazard: Hazard, camY: number): void => {
  const y = hazard.y - camY
  const top = Math.max(hazard.homeY - SNOWBALL.behind, hazard.y - GROOVE_PX) - camY
  if (top >= y) return
  const fade = ctx.createLinearGradient(0, y - GROOVE_PX, 0, y)
  fade.addColorStop(0, 'rgba(200, 216, 235, 0)')
  fade.addColorStop(0.6, 'rgba(200, 216, 235, 0.55)')
  ctx.fillStyle = fade
  const w = hazard.size * 1.6
  ctx.fillRect(hazard.x - w / 2, top, w, y - top)
}

const drawTopple = (ctx: CanvasRenderingContext2D, state: GameState, hazard: Hazard, y: number): void => {
  const fall = toppleFall(hazard, state.y)
  const angle = fall * (Math.PI / 2) + toppleShake(hazard, state.y)
  drawShadow(ctx, state.theme, hazard.x, y, TOPPLE_R)
  if (fall > 0 && fall < 1) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
    for (let i = 0; i < 5; i += 1) {
      ctx.beginPath()
      ctx.arc(hazard.x - 10 + i * 5, y - 2 - Math.sin(fall * 6 + i) * 10, 3, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  ctx.save()
  ctx.translate(hazard.x, y)
  ctx.rotate(hazard.dir * angle)
  drawPine(ctx, state.theme, 0, 0, TOPPLE_R)
  ctx.restore()
}

const drawIcicle = (ctx: CanvasRenderingContext2D, x: number, y: number, scale: number, alpha: number): void => {
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.translate(x, y)
  ctx.scale(scale, scale)
  ctx.rotate(-0.35)
  ctx.fillStyle = '#d7edfa'
  ctx.strokeStyle = '#7fb8d8'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(-12, -60)
  ctx.lineTo(12, -60)
  ctx.lineTo(4, -20)
  ctx.lineTo(0, 0)
  ctx.lineTo(-5, -24)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)'
  ctx.beginPath()
  ctx.moveTo(-6, -54)
  ctx.lineTo(-2, -26)
  ctx.stroke()
  ctx.restore()
}

const drawIcicleSplash = (ctx: CanvasRenderingContext2D, x: number, y: number, b: number): void => {
  ctx.strokeStyle = `rgba(255, 255, 255, ${1 - b})`
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.ellipse(x, y, 10 + b * 40, 5 + b * 20, 0, 0, Math.PI * 2)
  ctx.stroke()
  ctx.fillStyle = `rgba(215, 237, 250, ${1 - b})`
  for (let i = 0; i < 8; i += 1) {
    const a = (i / 8) * Math.PI * 2
    ctx.beginPath()
    ctx.arc(x + Math.cos(a) * (12 + b * 36), y + Math.sin(a) * (6 + b * 18) - Math.sin(b * Math.PI) * 10, 3, 0, Math.PI * 2)
    ctx.fill()
  }
}

const snowBall = (ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number): void => {
  ctx.fillStyle = '#ffffff'
  ctx.strokeStyle = '#c3d0dd'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
}

// `broken` runs from 0 as the ball ploughs through, and the pieces are thrown for a third of a second.
const drawSnowman = (ctx: CanvasRenderingContext2D, theme: Theme, x: number, y: number, broken: number): void => {
  ctx.fillStyle = theme.shadow
  ctx.beginPath()
  ctx.ellipse(x - 8, y + 6, 24, 9, 0, 0, Math.PI * 2)
  ctx.fill()
  if (broken >= 0) {
    const k = Math.min(1, broken * 3)
    snowBall(ctx, x - 26 - k * 30, y + 4 + k * 10, 12 - k * 3)
    snowBall(ctx, x + 30 + k * 40, y - 2 + k * 14, 9 - k * 2)
    snowBall(ctx, x + 8 - k * 10, y + 10 + k * 18, 6)
    ctx.fillStyle = '#f97316'
    ctx.fillRect(x + 20 + k * 30, y - 6 + k * 20, 10, 3)
    return
  }
  snowBall(ctx, x, y - 4, 18)
  snowBall(ctx, x, y - 30, 13)
  snowBall(ctx, x, y - 50, 10)
  ctx.fillStyle = '#1e293b'
  for (const cy of [y - 12, y - 2]) {
    ctx.beginPath()
    ctx.arc(x, cy, 2, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.beginPath()
  ctx.arc(x - 4, y - 53, 1.6, 0, Math.PI * 2)
  ctx.arc(x + 4, y - 53, 1.6, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#f97316'
  ctx.beginPath()
  ctx.moveTo(x, y - 51)
  ctx.lineTo(x + 12, y - 48)
  ctx.lineTo(x, y - 46)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = '#1e293b'
  ctx.fillRect(x - 12, y - 60, 24, 3)
  ctx.fillRect(x - 8, y - 72, 16, 13)
  ctx.strokeStyle = '#7a5638'
  ctx.lineWidth = 2.5
  ctx.beginPath()
  ctx.moveTo(x - 12, y - 30)
  ctx.lineTo(x - 30, y - 42)
  ctx.moveTo(x + 12, y - 30)
  ctx.lineTo(x + 30, y - 40)
  ctx.stroke()
}

const BUSH_LEAVES: readonly (readonly [number, number, number])[] = [
  [-20, 4, 11],
  [-12, -8, 12],
  [2, -14, 13],
  [16, -6, 12],
  [20, 6, 10],
  [-4, 6, 13],
  [8, 2, 12],
  [-14, 10, 9],
  [12, 12, 9],
]
const BUSH_TWIGS: readonly (readonly [number, number, number])[] = [
  [-28, -6, -2.7],
  [-8, -24, -1.8],
  [14, -22, -1.1],
  [30, -2, -0.3],
  [26, 14, 0.5],
]
const BUSH_SNOW: readonly (readonly [number, number, number, number])[] = [
  [4, -22, 8, 3.5],
  [-12, -16, 7, 3],
  [18, -12, 6, 3],
  [-22, -2, 5, 2.5],
  [8, -6, 4, 2],
]

// `shake` runs 0 → 1 after the ball goes through; 1 is a bush at rest.
const drawBush = (ctx: CanvasRenderingContext2D, theme: Theme, x: number, y: number, shake: number): void => {
  const j = Math.sin(shake * 40) * 3 * Math.max(0, 1 - shake)
  ctx.fillStyle = theme.shadow
  ctx.beginPath()
  ctx.ellipse(x - 8, y + 12, 32, 11, 0, 0, Math.PI * 2)
  ctx.fill()

  ctx.strokeStyle = '#5b4632'
  ctx.lineWidth = 2
  ctx.lineCap = 'round'
  for (const [tx, ty, a] of BUSH_TWIGS) {
    ctx.beginPath()
    ctx.moveTo(x + tx * 0.4 + j, y + ty * 0.4)
    ctx.lineTo(x + tx + j, y + ty)
    ctx.lineTo(x + tx + Math.cos(a) * 6 + j, y + ty + Math.sin(a) * 6)
    ctx.stroke()
  }

  for (const [dx, dy, r] of BUSH_LEAVES) {
    const cx = x + dx + j
    const cy = y + dy
    const g = ctx.createRadialGradient(cx + r * 0.35, cy - r * 0.35, r * 0.1, cx, cy, r)
    g.addColorStop(0, '#5f8f5a')
    g.addColorStop(0.7, '#3d6b45')
    g.addColorStop(1, '#2b4f36')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.fill()
  }

  ctx.fillStyle = 'rgba(255, 255, 255, 0.95)'
  for (const [dx, dy, rx, ry] of BUSH_SNOW) {
    ctx.beginPath()
    ctx.ellipse(x + dx + j, y + dy, rx, ry, -0.2, 0, Math.PI * 2)
    ctx.fill()
  }

  if (shake >= 1) return
  const rng = createRng(31)
  for (let i = 0; i < 10; i += 1) {
    const a = rng() * Math.PI * 2
    const dist = 14 + shake * (30 + rng() * 30)
    ctx.fillStyle = i % 2 ? `rgba(61, 107, 69, ${1 - shake})` : `rgba(255, 255, 255, ${1 - shake})`
    ctx.beginPath()
    ctx.ellipse(x + Math.cos(a) * dist, y - 6 + Math.sin(a) * dist * 0.6, 3.5, 2, a, 0, Math.PI * 2)
    ctx.fill()
  }
}

const GATE_RED = '#e2483c'

const drawPole = (ctx: CanvasRenderingContext2D, theme: Theme, x: number, y: number): void => {
  ctx.fillStyle = theme.shadow
  ctx.beginPath()
  ctx.ellipse(x - 4, y + 3, 9, 4, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = GATE_RED
  ctx.lineWidth = 4
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.lineTo(x, y - 46)
  ctx.stroke()
  ctx.fillStyle = GATE_RED
  ctx.beginPath()
  ctx.moveTo(x, y - 46)
  ctx.lineTo(x + 22, y - 40)
  ctx.lineTo(x, y - 30)
  ctx.closePath()
  ctx.fill()
}

const drawGateLine = (ctx: CanvasRenderingContext2D, x: number, y: number): void => {
  ctx.setLineDash([6, 8])
  ctx.strokeStyle = 'rgba(226, 72, 60, 0.45)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(x - GATE_HALF, y - 12)
  ctx.lineTo(x + GATE_HALF, y - 12)
  ctx.stroke()
  ctx.setLineDash([])
}

const drawFlag = (ctx: CanvasRenderingContext2D, x: number, y: number): void => {
  ctx.strokeStyle = '#334155'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.lineTo(x, y - 24)
  ctx.stroke()
  ctx.fillStyle = '#f97316'
  ctx.beginPath()
  ctx.moveTo(x, y - 24)
  ctx.lineTo(x + 12, y - 20)
  ctx.lineTo(x, y - 16)
  ctx.closePath()
  ctx.fill()
}

const drawJump = (ctx: CanvasRenderingContext2D, theme: Theme, x: number, y: number): void => {
  const left = x - JUMP.w / 2
  const right = x + JUMP.w / 2
  const top = y - JUMP.ramp
  ctx.fillStyle = theme.shadow
  ctx.beginPath()
  ctx.moveTo(left, y)
  ctx.lineTo(right, y)
  ctx.lineTo(right - 10, y + 22)
  ctx.lineTo(left - 18, y + 22)
  ctx.closePath()
  ctx.fill()
  const face = ctx.createLinearGradient(0, top, 0, y)
  face.addColorStop(0, '#fdfeff')
  face.addColorStop(1, '#cddbeb')
  ctx.fillStyle = face
  ctx.beginPath()
  ctx.moveTo(left + 14, top)
  ctx.lineTo(right - 14, top)
  ctx.lineTo(right, y)
  ctx.lineTo(left, y)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = 'rgba(150, 172, 200, 0.55)'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(left + 14, top)
  ctx.lineTo(left, y)
  ctx.moveTo(right - 14, top)
  ctx.lineTo(right, y)
  ctx.stroke()
  ctx.fillStyle = '#9fb3c9'
  ctx.beginPath()
  ctx.roundRect(left, y - 3, JUMP.w, 7, 3)
  ctx.fill()
  drawFlag(ctx, left - 8, y)
  drawFlag(ctx, right + 8, y)
}

// Flat things the ball runs over or into: holes, ramps, tracks and landing marks.
export const drawHazardUnder = (ctx: CanvasRenderingContext2D, state: GameState, hazard: Hazard, camY: number): void => {
  const y = hazard.y - camY
  switch (hazard.kind) {
    case 'hole':
      drawHole(ctx, hazard.x, y)
      return
    case 'jump':
      drawJump(ctx, state.theme, hazard.x, y)
      return
    case 'gate':
      drawGateLine(ctx, hazard.x, y)
      return
    case 'snowball':
      if (hazard.age >= 0) drawGroove(ctx, hazard, camY)
      return
    case 'wolf':
    case 'fox':
      drawPawPrints(ctx, hazard, camY)
      return
    case 'kid':
      for (const shot of hazard.shots) drawShotGround(ctx, state.theme, shot, camY)
      return
    case 'icicle': {
      if (icicleDrop(hazard, state.y) < 1) return
      const b = clamp01((ICICLE.land - (hazard.homeY - state.y)) / (ICICLE.land - ICICLE.settle))
      if (b < 1) drawIcicleSplash(ctx, hazard.x, y, b)
      return
    }
    default:
  }
}

// Anything that stands up off the snow, drawn in y order with the pines.
export const drawHazardStanding = (ctx: CanvasRenderingContext2D, state: GameState, hazard: Hazard, camY: number): void => {
  const { theme } = state
  const y = hazard.y - camY
  switch (hazard.kind) {
    case 'boulder':
      drawStone(ctx, stoneFor(Math.floor(hazard.homeY) ^ 0x2b), IDENTITY, hazard.x, y, hazard.size, ROCK_PALETTE, theme.shadow)
      return
    case 'log':
      drawLog(ctx, theme, hazard.x, y, hazard.dir, hazard.size)
      return
    case 'net':
      drawNetRun(ctx, theme, hazard.x - hazard.size, hazard.x + hazard.size, y)
      return
    case 'skier':
      if (hazard.age >= 0) drawSkier(ctx, theme, hazard, y)
      return
    case 'snowmobile': {
      const warn = CROSSERS.snowmobile?.warn ?? 0
      if (hazard.age >= warn) drawSnowmobile(ctx, theme, hazard.x, y, hazard.dir)
      return
    }
    case 'deer':
      if (hazard.age >= 0) drawDeer(ctx, theme, hazard, y)
      return
    case 'bear':
      if (hazard.age >= 0) drawBear(ctx, theme, hazard, y)
      return
    case 'kid':
      drawKid(ctx, theme, hazard.x, y, hazard.dir, hazard.age < 0 ? 0 : kidArm(hazard.age))
      return
    case 'snowball':
      if (hazard.age >= 0) drawSnowball(ctx, theme, hazard, y)
      return
    case 'topple':
      drawTopple(ctx, state, hazard, y)
      return
    case 'icicle':
      if (icicleDrop(hazard, state.y) >= 1) drawIcicle(ctx, hazard.x, y, 1, 1)
      return
    case 'snowman':
      drawSnowman(ctx, theme, hazard.x, y, hazard.hitAge)
      return
    case 'bush':
      drawBush(ctx, theme, hazard.x, y, hazard.hitAge < 0 ? 1 : Math.min(1, hazard.hitAge * 1.5))
      return
    case 'gate':
      drawPole(ctx, theme, hazard.x - GATE_HALF, y)
      drawPole(ctx, theme, hazard.x + GATE_HALF, y)
      return
    case 'wolf':
      if (hazard.age >= 0) drawCanine(ctx, theme, hazard, y, WOLF_COAT)
      return
    case 'fox':
      if (hazard.age >= 0) drawCanine(ctx, theme, hazard, y, FOX_COAT)
      return
    default:
  }
}

// In the air or at the screen's edge: stones in flight, a falling icicle, the warnings.
export const drawHazardOver = (ctx: CanvasRenderingContext2D, state: GameState, hazard: Hazard, camY: number): void => {
  const y = hazard.y - camY
  switch (hazard.kind) {
    case 'kid':
      for (const shot of hazard.shots) drawShotFlying(ctx, state.theme, shot, camY)
      return
    case 'icicle': {
      const k = icicleDrop(hazard, state.y)
      if (k <= 0 || k >= 1) return
      const e = k * k
      drawIcicle(ctx, hazard.x, y - (1 - e) * 300, 2 - e, 0.5 + e * 0.5)
      return
    }
    case 'snowmobile': {
      const warn = CROSSERS.snowmobile?.warn ?? 0
      if (hazard.age < 0 || hazard.age >= warn) return
      drawChevron(ctx, hazard.dir > 0 ? 14 : W - 14, y, hazard.dir > 0 ? 0 : Math.PI, state.elapsed)
      return
    }
    case 'snowball':
      // Coming from behind, off the top of the screen: the only warning you get is where.
      if (hazard.age < 0 || hazard.spent || y + hazard.size > 0) return
      drawChevron(ctx, hazard.x, 26, Math.PI / 2, state.elapsed)
      return
    default:
  }
}

// How far above and below its ground point each thing is drawn, for the on-screen test.
export const hazardReach = (hazard: Hazard): number => {
  switch (hazard.kind) {
    case 'snowball':
      return 960
    case 'wolf':
    case 'fox':
      return 700
    case 'kid':
      return 1_200
    case 'icicle':
      return 360
    case 'jump':
      return 140
    default:
      return 90
  }
}
