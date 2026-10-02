import { babyDragon, bear, bee, bunny, axolotl, cow, dino, duckling, fox, giraffe, hamster, hedgehog, hippo, husky, koala, ladybug, mouse, otter, owl, penguin, pig, polarBear, reindeer, seal, shark, sheep, snowLeopard, tiger, unicorn, walrus, whale, wolf, yeti, zebra } from './balls/animals.ts'
import { ghost, jackOLantern, ninja, robot, santa, scaredy } from './balls/characters.ts'
import { circle, disc, gloss, hash, inside, local, polygon, rim, TAU } from './balls/kit.ts'
import { avocado, beachBall, button, cocoa, comet, crackedIce, cupcake, eightBall, giftBox, glacier, golf, goldCoin, hypno, kiwi, opal, paintedEgg, pinecone, pokerChip, ruby, shuttlecock, snowGlobe, stainedGlass, strawberry, supernova } from './balls/objects.ts'
import type { Theme } from './themes.ts'

export type SkinId =
  | 'classic'
  | 'snowball'
  | 'cherry'
  | 'lime'
  | 'ocean'
  | 'grape'
  | 'lemon'
  | 'midnight'
  | 'prism'
  | 'bubblegum'
  | 'silver'
  | 'pearl'
  | 'tennis'
  | 'basketball'
  | 'football'
  | 'baseball'
  | 'nine'
  | 'bullseye'
  | 'peppermint'
  | 'moon'
  | 'saturn'
  | 'watermelon'
  | 'donut'
  | 'snowflake'
  | 'yinyang'
  | 'disco'
  | 'snowman'
  | 'panda'
  | 'googly'
  | 'hazard'
  | 'compass'
  | 'mint'
  | 'coral'
  | 'sky'
  | 'teal'
  | 'lavender'
  | 'forest'
  | 'sand'
  | 'navy'
  | 'bowling'
  | 'smiley'
  | 'cool'
  | 'orange'
  | 'eyeball'
  | 'fireball'
  | 'chameleon'
  | 'eight'
  | 'snowglobe'
  | 'hotcocoa'
  | 'pinecone'
  | 'crackedice'
  | 'glacier'
  | 'comet'
  | 'giftbox'
  | 'paintedegg'
  | 'kiwi'
  | 'strawberry'
  | 'cupcake'
  | 'avocado'
  | 'golf'
  | 'beachball'
  | 'pokerchip'
  | 'stainedglass'
  | 'goldcoin'
  | 'ruby'
  | 'opal'
  | 'button'
  | 'shuttlecock'
  | 'robot'
  | 'ninja'
  | 'santa'
  | 'ghost'
  | 'scaredy'
  | 'pumpkin'
  | 'yeti'
  | 'ladybug'
  | 'bee'
  | 'owl'
  | 'pig'
  | 'hedgehog'
  | 'tiger'
  | 'cow'
  | 'koala'
  | 'penguin'
  | 'polarbear'
  | 'reindeer'
  | 'seal'
  | 'bunny'
  | 'mouse'
  | 'sheep'
  | 'axolotl'
  | 'walrus'
  | 'husky'
  | 'hamster'
  | 'duckling'
  | 'whale'
  | 'unicorn'
  | 'shark'
  | 'fox'
  | 'wolf'
  | 'bear'
  | 'giraffe'
  | 'zebra'
  | 'hippo'
  | 'otter'
  | 'hypno'
  | 'supernova'
  | 'babydragon'
  | 'snowleopard'
  | 'dino'

export type BallSpin = 'off' | 'roll' | 'turns'

// spin turns the patterned balls; heading is sideways travel, -1 (left) to 1 (right); t is seconds.
// heat climbs 0–1 with the near-miss combo; fright pulses 0–1 just after a near miss.
export type BallEnv = { theme: Theme; spin: number; heading: number; t: number; heat: number; fright: number }

export type Paint = (ctx: CanvasRenderingContext2D, x: number, y: number, r: number, env: BallEnv) => void

// A tint of null follows the world's own ball colour. Premium looks only come with Unlock all.
type Skin = { id: SkinId; name: string; tint: string | null; paint: Paint; premium?: true }

// Half a true roll: at full speed a real roll turns so fast it strobes.
const SPIN_PER_RADIUS = 0.5

const HEAT_COMBO = 10
const FRIGHT_SECONDS = 0.9

export const stillBall = (theme: Theme): BallEnv => ({ theme, spin: 0, heading: 0, t: 0, heat: 0, fright: 0 })

export const heatOf = (combo: number): number => Math.min(1, combo / HEAT_COMBO)

export const frightOf = (since: number): number => (since >= 0 && since < FRIGHT_SECONDS ? Math.sin((since / FRIGHT_SECONDS) * Math.PI) : 0)

// The Collection has no run, so it fakes one: the combo climbs over 8 s and a near miss lands every 4 s.
export const previewSignals = (t: number): Pick<BallEnv, 'heat' | 'fright'> => ({ heat: (t % 8) / 8, fright: frightOf(t % 4) })

export const spinStep = (mode: BallSpin, travelled: number, r: number, direction: number): number => {
  if (mode === 'off') return 0
  const turn = (travelled / r) * SPIN_PER_RADIUS
  return mode === 'turns' ? turn * Math.sign(direction || 1) : turn
}

const solid =
  (fill: string, edge: string): Paint =>
  (ctx, x, y, r) => {
    disc(ctx, x, y, r, fill)
    rim(ctx, x, y, r, edge)
  }

// Slices from twelve o'clock, so every ball of this kind sits the same way up.
const wedges =
  (colours: readonly string[], edge: string): Paint =>
  (ctx, x, y, r, { spin }) => {
    const step = TAU / colours.length
    colours.forEach((colour, i) => {
      ctx.fillStyle = colour
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.arc(x, y, r, spin - Math.PI / 2 + i * step, spin - Math.PI / 2 + (i + 1) * step)
      ctx.closePath()
      ctx.fill()
    })
    rim(ctx, x, y, r, edge)
  }

const paintClassic: Paint = (ctx, x, y, r, { theme }) => {
  disc(ctx, x, y, r, theme.ball)
  rim(ctx, x, y, r, theme.ballEdge)
}

const paintSilver: Paint = (ctx, x, y, r) => {
  const shade = ctx.createRadialGradient(x - r * 0.4, y - r * 0.4, r * 0.1, x, y, r)
  shade.addColorStop(0, '#f8fafc')
  shade.addColorStop(0.6, '#94a3b8')
  shade.addColorStop(1, '#475569')
  ctx.fillStyle = shade
  circle(ctx, x, y, r)
  ctx.fill()
  rim(ctx, x, y, r, '#334155', 0.18)
}

const paintPearl: Paint = (ctx, x, y, r) => {
  const shade = ctx.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.05, x, y, r)
  shade.addColorStop(0, '#ffffff')
  shade.addColorStop(0.7, '#fbe7f0')
  shade.addColorStop(1, '#d8c7e6')
  ctx.fillStyle = shade
  circle(ctx, x, y, r)
  ctx.fill()
  rim(ctx, x, y, r, '#b8a6c9', 0.18)
}

const paintTennis: Paint = (ctx, x, y, r, { spin }) => {
  disc(ctx, x, y, r, '#d4ec3a')
  inside(ctx, x, y, r, spin, (ctx) => {
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = r * 0.17
    ctx.beginPath()
    ctx.arc(-r * 1.25, 0, r * 0.95, -0.9, 0.9)
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(r * 1.25, 0, r * 0.95, Math.PI - 0.9, Math.PI + 0.9)
    ctx.stroke()
  })
  rim(ctx, x, y, r, '#9ab01c')
}

const paintBasketball: Paint = (ctx, x, y, r, { spin }) => {
  disc(ctx, x, y, r, '#f07c22')
  inside(ctx, x, y, r, spin, (ctx) => {
    ctx.strokeStyle = '#3b1d0a'
    ctx.lineWidth = Math.max(0.8, r * 0.09)
    ctx.beginPath()
    ctx.moveTo(0, -r)
    ctx.lineTo(0, r)
    ctx.moveTo(-r, 0)
    ctx.lineTo(r, 0)
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(-r * 1.35, 0, r * 1.05, -1, 1)
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(r * 1.35, 0, r * 1.05, Math.PI - 1, Math.PI + 1)
    ctx.stroke()
  })
  rim(ctx, x, y, r, '#3b1d0a', 0.14)
}

const paintFootball: Paint = (ctx, x, y, r, { spin }) => {
  disc(ctx, x, y, r, '#ffffff')
  inside(ctx, x, y, r, spin, (ctx) => {
    ctx.fillStyle = '#111827'
    polygon(ctx, 0, 0, r * 0.36, 5, -Math.PI / 2)
    ctx.fill()
    for (let i = 0; i < 5; i += 1) {
      const a = -Math.PI / 2 + Math.PI / 5 + (i / 5) * TAU
      polygon(ctx, Math.cos(a) * r * 1.02, Math.sin(a) * r * 1.02, r * 0.34, 5, a)
      ctx.fill()
    }
  })
  rim(ctx, x, y, r, '#1f2937', 0.16)
}

const paintBaseball: Paint = (ctx, x, y, r, { spin }) => {
  disc(ctx, x, y, r, '#f8fafc')
  inside(ctx, x, y, r, spin, (ctx) => {
    ctx.strokeStyle = '#dc2626'
    ctx.lineWidth = Math.max(0.7, r * 0.07)
    for (const side of [-1, 1]) {
      const cx = side * r * 1.3
      const base = side < 0 ? 0 : Math.PI
      ctx.beginPath()
      ctx.arc(cx, 0, r * 0.95, base - 0.85, base + 0.85)
      ctx.stroke()
      for (let a = -0.75; a <= 0.76; a += 0.25) {
        const angle = base + a
        const px = cx + Math.cos(angle) * r * 0.95
        const py = Math.sin(angle) * r * 0.95
        ctx.beginPath()
        ctx.moveTo(px - Math.cos(angle + 0.6) * r * 0.12, py - Math.sin(angle + 0.6) * r * 0.12)
        ctx.lineTo(px + Math.cos(angle + 0.6) * r * 0.12, py + Math.sin(angle + 0.6) * r * 0.12)
        ctx.stroke()
      }
    }
  })
  rim(ctx, x, y, r, '#cbd5e1', 0.16)
}

const paintNine: Paint = (ctx, x, y, r, { spin }) => {
  disc(ctx, x, y, r, '#ffffff')
  inside(ctx, x, y, r, spin, (ctx) => {
    ctx.fillStyle = '#facc15'
    ctx.fillRect(-r, -r * 0.52, r * 2, r * 1.04)
    disc(ctx, 0, 0, r * 0.38, '#ffffff')
    // Too small to read on the slope, so only the Collection's bigger ball carries the number.
    if (r > 12) {
      ctx.fillStyle = '#111827'
      ctx.font = `bold ${r * 0.48}px system-ui`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('9', 0, r * 0.03)
    }
  })
  gloss(ctx, x, y, r, 0.35)
  rim(ctx, x, y, r, '#a3a3a3', 0.14)
}

const paintBullseye: Paint = (ctx, x, y, r) => {
  disc(ctx, x, y, r, '#dc2626')
  disc(ctx, x, y, r * 0.7, '#ffffff')
  disc(ctx, x, y, r * 0.42, '#dc2626')
  disc(ctx, x, y, r * 0.15, '#ffffff')
  rim(ctx, x, y, r, '#991b1b', 0.16)
}

const paintPeppermint: Paint = (ctx, x, y, r, { spin }) => {
  disc(ctx, x, y, r, '#ffffff')
  inside(ctx, x, y, r, spin, (ctx) => {
    const step = TAU / 8
    ctx.fillStyle = '#e11d48'
    for (let i = 0; i < 8; i += 2) {
      const a0 = i * step
      const a1 = a0 + step
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.quadraticCurveTo(Math.cos(a0 + 0.7) * r * 0.55, Math.sin(a0 + 0.7) * r * 0.55, Math.cos(a0 + 1) * r * 1.1, Math.sin(a0 + 1) * r * 1.1)
      ctx.arc(0, 0, r * 1.1, a0 + 1, a1 + 1)
      ctx.quadraticCurveTo(Math.cos(a1 + 0.7) * r * 0.55, Math.sin(a1 + 0.7) * r * 0.55, 0, 0)
      ctx.fill()
    }
  })
  rim(ctx, x, y, r, '#e11d48', 0.16)
}

const paintMoon: Paint = (ctx, x, y, r, { spin }) => {
  disc(ctx, x, y, r, '#e2e8f0')
  inside(ctx, x, y, r, spin, (ctx) => {
    for (const [cx, cy, cr] of [
      [-0.35, -0.3, 0.25],
      [0.35, 0.1, 0.18],
      [-0.1, 0.45, 0.15],
      [0.3, -0.5, 0.1],
    ] as const) {
      disc(ctx, cx * r, cy * r, cr * r, '#cbd5e1')
      ctx.strokeStyle = '#b6c2d2'
      ctx.lineWidth = Math.max(0.5, r * 0.04)
      circle(ctx, cx * r, cy * r, cr * r)
      ctx.stroke()
    }
  })
  rim(ctx, x, y, r, '#94a3b8', 0.18)
}

// The ring's back half goes under the planet and its front half over it.
const paintSaturn: Paint = (ctx, x, y, r) => {
  const ring = (start: number, end: number): void => {
    ctx.strokeStyle = '#c8955a'
    ctx.lineWidth = Math.max(1, r * 0.2)
    ctx.beginPath()
    ctx.ellipse(x, y, r * 1.55, r * 0.45, -0.35, start, end)
    ctx.stroke()
  }
  ring(Math.PI, TAU)
  disc(ctx, x, y, r, '#eab676')
  inside(ctx, x, y, r, 0, (ctx) => {
    ctx.fillStyle = '#d99a52'
    ctx.fillRect(-r, -r * 0.2, r * 2, r * 0.18)
    ctx.fillRect(-r, r * 0.25, r * 2, r * 0.12)
  })
  rim(ctx, x, y, r, '#b0763a', 0.14)
  ring(0, Math.PI)
}

const paintWatermelon: Paint = (ctx, x, y, r, { spin }) => {
  disc(ctx, x, y, r, '#15803d')
  disc(ctx, x, y, r * 0.84, '#bbf7d0')
  disc(ctx, x, y, r * 0.74, '#ef4444')
  local(ctx, x, y, spin, (ctx) => {
    ctx.fillStyle = '#111827'
    for (let i = 0; i < 7; i += 1) {
      const a = (i / 7) * TAU
      ctx.beginPath()
      ctx.ellipse(Math.cos(a) * r * 0.42, Math.sin(a) * r * 0.42, r * 0.06, r * 0.1, a, 0, TAU)
      ctx.fill()
    }
  })
  rim(ctx, x, y, r, '#14532d', 0.14)
}

const SPRINKLES = ['#facc15', '#60a5fa', '#ffffff', '#34d399', '#a78bfa']

const paintDonut: Paint = (ctx, x, y, r, { spin, theme }) => {
  disc(ctx, x, y, r, '#d6a064')
  local(ctx, x, y, spin, (ctx) => {
    ctx.fillStyle = '#f472b6'
    ctx.beginPath()
    for (let i = 0; i <= 48; i += 1) {
      const a = (i / 48) * TAU
      const radius = r * (0.8 + Math.sin(a * 7) * 0.05)
      if (i === 0) ctx.moveTo(Math.cos(a) * radius, Math.sin(a) * radius)
      else ctx.lineTo(Math.cos(a) * radius, Math.sin(a) * radius)
    }
    ctx.fill()
    ctx.lineWidth = Math.max(0.6, r * 0.07)
    ctx.lineCap = 'round'
    for (let i = 0; i < 12; i += 1) {
      const a = (i / 12) * TAU + 0.2
      const d = r * (0.5 + hash(i) * 0.2)
      const px = Math.cos(a) * d
      const py = Math.sin(a) * d
      const tilt = hash(i, 3) * TAU
      ctx.strokeStyle = SPRINKLES[i % SPRINKLES.length] ?? '#ffffff'
      ctx.beginPath()
      ctx.moveTo(px - Math.cos(tilt) * r * 0.08, py - Math.sin(tilt) * r * 0.08)
      ctx.lineTo(px + Math.cos(tilt) * r * 0.08, py + Math.sin(tilt) * r * 0.08)
      ctx.stroke()
    }
  })
  disc(ctx, x, y, r * 0.26, theme.snow)
  rim(ctx, x, y, r, '#a16207', 0.12)
}

const paintSnowflake: Paint = (ctx, x, y, r, { spin }) => {
  disc(ctx, x, y, r, '#60a5fa')
  local(ctx, x, y, spin, (ctx) => {
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = Math.max(0.7, r * 0.1)
    ctx.lineCap = 'round'
    for (let i = 0; i < 6; i += 1) {
      const a = (i / 6) * TAU
      const bx = Math.cos(a) * r * 0.42
      const by = Math.sin(a) * r * 0.42
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.lineTo(Math.cos(a) * r * 0.7, Math.sin(a) * r * 0.7)
      ctx.moveTo(bx, by)
      ctx.lineTo(bx + Math.cos(a + 0.8) * r * 0.2, by + Math.sin(a + 0.8) * r * 0.2)
      ctx.moveTo(bx, by)
      ctx.lineTo(bx + Math.cos(a - 0.8) * r * 0.2, by + Math.sin(a - 0.8) * r * 0.2)
      ctx.stroke()
    }
  })
  rim(ctx, x, y, r, '#2563eb', 0.16)
}

const paintYinYang: Paint = (ctx, x, y, r, { spin }) => {
  disc(ctx, x, y, r, '#ffffff')
  local(ctx, x, y, spin, (ctx) => {
    ctx.fillStyle = '#111827'
    ctx.beginPath()
    ctx.arc(0, 0, r, -Math.PI / 2, Math.PI / 2)
    ctx.arc(0, r / 2, r / 2, Math.PI / 2, -Math.PI / 2, true)
    ctx.arc(0, -r / 2, r / 2, Math.PI / 2, Math.PI * 1.5)
    ctx.fill()
    disc(ctx, 0, -r / 2, r / 7, '#ffffff')
    disc(ctx, 0, r / 2, r / 7, '#111827')
  })
  rim(ctx, x, y, r, '#111827', 0.12)
}

const paintDisco: Paint = (ctx, x, y, r, { spin, t }) => {
  disc(ctx, x, y, r, '#94a3b8')
  inside(ctx, x, y, r, spin, (ctx) => {
    const size = r * 0.3
    for (let i = -4; i < 4; i += 1) {
      for (let j = -4; j < 4; j += 1) {
        const shade = 150 + Math.floor(hash(i, j) * 90)
        const flash = Math.sin(t * 5 + hash(j, i) * 40) > 0.85
        ctx.fillStyle = flash ? '#ffffff' : `rgb(${shade},${shade + 5},${shade + 15})`
        ctx.fillRect(i * size + 0.4, j * size + 0.4, size - 0.8, size - 0.8)
      }
    }
  })
  rim(ctx, x, y, r, '#475569', 0.14)
}

const paintSnowman: Paint = (ctx, x, y, r) => {
  disc(ctx, x, y, r, '#ffffff')
  rim(ctx, x, y, r, '#94a3b8', 0.18)
  disc(ctx, x - r * 0.3, y - r * 0.22, r * 0.1, '#111827')
  disc(ctx, x + r * 0.3, y - r * 0.22, r * 0.1, '#111827')
  ctx.fillStyle = '#f97316'
  ctx.beginPath()
  ctx.moveTo(x, y - r * 0.02)
  ctx.lineTo(x + r * 0.8, y + r * 0.12)
  ctx.lineTo(x, y + r * 0.22)
  ctx.fill()
  for (let i = 0; i < 4; i += 1) disc(ctx, x - r * 0.3 + i * r * 0.2, y + r * 0.48 + Math.sin(i) * r * 0.04, r * 0.05, '#111827')
}

const paintPanda: Paint = (ctx, x, y, r) => {
  disc(ctx, x - r * 0.68, y - r * 0.68, r * 0.32, '#111827')
  disc(ctx, x + r * 0.68, y - r * 0.68, r * 0.32, '#111827')
  disc(ctx, x, y, r, '#ffffff')
  ctx.fillStyle = '#111827'
  ctx.beginPath()
  ctx.ellipse(x - r * 0.35, y - r * 0.05, r * 0.2, r * 0.28, 0.5, 0, TAU)
  ctx.ellipse(x + r * 0.35, y - r * 0.05, r * 0.2, r * 0.28, -0.5, 0, TAU)
  ctx.fill()
  disc(ctx, x - r * 0.33, y - r * 0.08, r * 0.07, '#ffffff')
  disc(ctx, x + r * 0.33, y - r * 0.08, r * 0.07, '#ffffff')
  ctx.fillStyle = '#111827'
  ctx.beginPath()
  ctx.ellipse(x, y + r * 0.32, r * 0.13, r * 0.09, 0, 0, TAU)
  ctx.fill()
  rim(ctx, x, y, r, '#1f2937', 0.12)
}

// The pupils lag behind a turn and jiggle as it skis.
const paintGoogly: Paint = (ctx, x, y, r, { theme, heading, t }) => {
  disc(ctx, x, y, r, theme.ball)
  rim(ctx, x, y, r, theme.ballEdge)
  for (const side of [-1, 1]) {
    const ex = x + side * r * 0.4
    const ey = y - r * 0.15
    disc(ctx, ex, ey, r * 0.42, '#ffffff')
    ctx.strokeStyle = '#111827'
    ctx.lineWidth = Math.max(0.5, r * 0.05)
    circle(ctx, ex, ey, r * 0.42)
    ctx.stroke()
    const jx = -heading * r * 0.14 + Math.sin(t * 9 + side) * r * 0.07
    const jy = r * 0.14 + Math.cos(t * 7 + side * 2) * r * 0.05
    disc(ctx, ex + jx, ey + jy, r * 0.2, '#111827')
  }
}

const paintHazard: Paint = (ctx, x, y, r, { spin }) => {
  disc(ctx, x, y, r, '#facc15')
  local(ctx, x, y, spin, (ctx) => {
    ctx.fillStyle = '#111827'
    for (let i = 0; i < 3; i += 1) {
      const a = -Math.PI / 2 + (i / 3) * TAU
      ctx.beginPath()
      ctx.moveTo(Math.cos(a - 0.5) * r * 0.25, Math.sin(a - 0.5) * r * 0.25)
      ctx.arc(0, 0, r * 0.78, a - 0.5, a + 0.5)
      ctx.arc(0, 0, r * 0.25, a + 0.5, a - 0.5, true)
      ctx.fill()
    }
    disc(ctx, 0, 0, r * 0.14, '#111827')
  })
  rim(ctx, x, y, r, '#111827', 0.14)
}

// The needle points downhill, leaning into each turn with a little wobble.
const paintCompass: Paint = (ctx, x, y, r, { heading, t }) => {
  disc(ctx, x, y, r, '#0b2b5e')
  rim(ctx, x, y, r, '#e9b949', 0.2)
  local(ctx, x, y, Math.PI + heading * 0.4 + Math.sin(t * 6) * 0.12, (ctx) => {
    ctx.fillStyle = '#ef4444'
    ctx.beginPath()
    ctx.moveTo(0, -r * 0.75)
    ctx.lineTo(r * 0.2, 0)
    ctx.lineTo(-r * 0.2, 0)
    ctx.fill()
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.moveTo(0, r * 0.75)
    ctx.lineTo(r * 0.2, 0)
    ctx.lineTo(-r * 0.2, 0)
    ctx.fill()
  })
}

const paintBowling: Paint = (ctx, x, y, r, { spin }) => {
  const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r)
  g.addColorStop(0, '#6d28d9')
  g.addColorStop(1, '#1e1b4b')
  ctx.fillStyle = g
  circle(ctx, x, y, r)
  ctx.fill()
  inside(ctx, x, y, r, spin, (ctx) => {
    ctx.fillStyle = '#0b0a1f'
    for (const [hx, hy] of [
      [-0.12, -0.45],
      [0.22, -0.4],
      [0.04, -0.1],
    ] as const) {
      circle(ctx, hx * r, hy * r, r * 0.13)
      ctx.fill()
    }
  })
  gloss(ctx, x, y, r, 0.35)
  rim(ctx, x, y, r, '#0b0a1f', 0.14)
}

const paintSmiley: Paint = (ctx, x, y, r) => {
  disc(ctx, x, y, r, '#facc15')
  ctx.fillStyle = '#422006'
  ctx.beginPath()
  ctx.ellipse(x - r * 0.33, y - r * 0.2, r * 0.11, r * 0.18, 0, 0, TAU)
  ctx.ellipse(x + r * 0.33, y - r * 0.2, r * 0.11, r * 0.18, 0, 0, TAU)
  ctx.fill()
  ctx.strokeStyle = '#422006'
  ctx.lineWidth = Math.max(0.8, r * 0.1)
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.arc(x, y + r * 0.02, r * 0.5, 0.2 * Math.PI, 0.8 * Math.PI)
  ctx.stroke()
  rim(ctx, x, y, r, '#ca8a04', 0.16)
}

const paintCool: Paint = (ctx, x, y, r) => {
  disc(ctx, x, y, r, '#facc15')
  ctx.fillStyle = '#111827'
  ctx.beginPath()
  ctx.roundRect(x - r * 0.78, y - r * 0.32, r * 0.7, r * 0.42, r * 0.16)
  ctx.roundRect(x + r * 0.08, y - r * 0.32, r * 0.7, r * 0.42, r * 0.16)
  ctx.fill()
  ctx.fillRect(x - r * 0.2, y - r * 0.28, r * 0.4, r * 0.1)
  ctx.strokeStyle = '#422006'
  ctx.lineWidth = Math.max(0.8, r * 0.09)
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.arc(x + r * 0.1, y + r * 0.2, r * 0.3, 0.15 * Math.PI, 0.7 * Math.PI)
  ctx.stroke()
  rim(ctx, x, y, r, '#ca8a04', 0.16)
}

const paintOrange: Paint = (ctx, x, y, r, { spin }) => {
  disc(ctx, x, y, r, '#f97316')
  disc(ctx, x, y, r * 0.84, '#fff7ed')
  local(ctx, x, y, spin, (ctx) => {
    ctx.fillStyle = '#fb923c'
    const step = TAU / 8
    for (let i = 0; i < 8; i += 1) {
      ctx.beginPath()
      ctx.moveTo(Math.cos(i * step + step / 2) * r * 0.08, Math.sin(i * step + step / 2) * r * 0.08)
      ctx.arc(0, 0, r * 0.74, i * step + 0.08, (i + 1) * step - 0.08)
      ctx.closePath()
      ctx.fill()
    }
  })
  rim(ctx, x, y, r, '#c2410c', 0.14)
}

const paintEyeball: Paint = (ctx, x, y, r, { t, heading }) => {
  disc(ctx, x, y, r, '#ffffff')
  inside(ctx, x, y, r, 0, (ctx) => {
    ctx.strokeStyle = 'rgba(220,38,38,0.5)'
    ctx.lineWidth = Math.max(0.4, r * 0.03)
    for (let i = 0; i < 6; i += 1) {
      const a = (i / 6) * TAU + 0.3
      ctx.beginPath()
      ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r)
      ctx.quadraticCurveTo(Math.cos(a + 0.3) * r * 0.75, Math.sin(a + 0.3) * r * 0.75, Math.cos(a) * r * 0.55, Math.sin(a) * r * 0.55)
      ctx.stroke()
    }
    // Looks downhill and toward the turn.
    const ix = heading * r * 0.35
    const iy = r * 0.28
    disc(ctx, ix, iy, r * 0.42, '#2563eb')
    disc(ctx, ix, iy, r * 0.2, '#0b1020')
    disc(ctx, ix - r * 0.1, iy - r * 0.12, r * 0.08, '#ffffff')
    const blink = t % 3.2
    if (blink < 0.14) {
      const shut = 1 - Math.abs(blink / 0.07 - 1)
      ctx.fillStyle = '#f5c7a0'
      ctx.fillRect(-r, -r, r * 2, r * 2 * shut)
    }
  })
  rim(ctx, x, y, r, '#e5e7eb', 0.12)
}

// Flames trail up the screen, the way the ball has come.
const paintFireball: Paint = (ctx, x, y, r, { t }) => {
  for (let k = 0; k < 7; k += 1) {
    const off = (k - 3) * r * 0.26
    const h = r * (1.1 + 0.45 * Math.sin(t * 14 + k * 1.9)) * (1 - Math.abs(k - 3) * 0.16)
    ctx.fillStyle = k % 2 === 0 ? '#f97316' : '#fbbf24'
    ctx.beginPath()
    ctx.moveTo(x + off - r * 0.3, y)
    ctx.quadraticCurveTo(x + off - r * 0.1, y - h * 0.8, x + off, y - r * 0.5 - h)
    ctx.quadraticCurveTo(x + off + r * 0.1, y - h * 0.8, x + off + r * 0.3, y)
    ctx.fill()
  }
  const g = ctx.createRadialGradient(x, y + r * 0.1, 0, x, y, r)
  g.addColorStop(0, '#fef3c7')
  g.addColorStop(0.6, '#fbbf24')
  g.addColorStop(1, '#ea580c')
  ctx.fillStyle = g
  circle(ctx, x, y, r)
  ctx.fill()
}

const paintChameleon: Paint = (ctx, x, y, r, { t }) => {
  const hue = (t * 50) % 360
  disc(ctx, x, y, r, `hsl(${hue} 80% 58%)`)
  rim(ctx, x, y, r, `hsl(${hue} 80% 38%)`)
}

export const SKINS: readonly Skin[] = [
  { id: 'classic', name: 'Classic', tint: null, paint: paintClassic },
  { id: 'snowball', name: 'Snowball', tint: '#94a3b8', paint: solid('#ffffff', '#94a3b8') },
  { id: 'cherry', name: 'Cherry', tint: '#e11d48', paint: solid('#e11d48', '#9f1239') },
  { id: 'lime', name: 'Lime', tint: '#84cc16', paint: solid('#84cc16', '#4d7c0f') },
  { id: 'ocean', name: 'Ocean', tint: '#0ea5e9', paint: solid('#0ea5e9', '#0369a1') },
  { id: 'grape', name: 'Grape', tint: '#8b5cf6', paint: solid('#8b5cf6', '#6d28d9') },
  { id: 'lemon', name: 'Lemon', tint: '#facc15', paint: solid('#facc15', '#ca8a04') },
  { id: 'midnight', name: 'Midnight', tint: '#1e293b', paint: solid('#1e293b', '#020617') },
  {
    id: 'prism',
    name: 'Prism',
    tint: '#8b5cf6',
    paint: wedges(['#ef4444', '#f59e0b', '#facc15', '#22c55e', '#3b82f6', '#8b5cf6'], '#475569'),
  },
  { id: 'bubblegum', name: 'Bubblegum', tint: '#f472b6', paint: solid('#f472b6', '#db2777') },
  { id: 'silver', name: 'Silver', tint: '#94a3b8', paint: paintSilver },
  { id: 'pearl', name: 'Pearl', tint: '#e9d5ff', paint: paintPearl },
  { id: 'tennis', name: 'Tennis', tint: '#d4ec3a', paint: paintTennis },
  { id: 'basketball', name: 'Basketball', tint: '#f07c22', paint: paintBasketball },
  { id: 'football', name: 'Football', tint: '#111827', paint: paintFootball },
  { id: 'baseball', name: 'Baseball', tint: '#dc2626', paint: paintBaseball },
  { id: 'nine', name: '9-ball', tint: '#facc15', paint: paintNine },
  { id: 'bullseye', name: 'Bullseye', tint: '#dc2626', paint: paintBullseye },
  { id: 'peppermint', name: 'Peppermint', tint: '#e11d48', paint: paintPeppermint },
  { id: 'moon', name: 'Moon', tint: '#94a3b8', paint: paintMoon },
  { id: 'saturn', name: 'Saturn', tint: '#c8955a', paint: paintSaturn },
  { id: 'watermelon', name: 'Watermelon', tint: '#ef4444', paint: paintWatermelon },
  { id: 'donut', name: 'Donut', tint: '#f472b6', paint: paintDonut },
  { id: 'snowflake', name: 'Snowflake', tint: '#60a5fa', paint: paintSnowflake },
  { id: 'yinyang', name: 'Yin-yang', tint: '#111827', paint: paintYinYang },
  { id: 'disco', name: 'Disco', tint: '#94a3b8', paint: paintDisco },
  { id: 'snowman', name: 'Snowman', tint: '#f97316', paint: paintSnowman },
  { id: 'panda', name: 'Panda', tint: '#111827', paint: paintPanda },
  { id: 'googly', name: 'Googly', tint: null, paint: paintGoogly },
  { id: 'hazard', name: 'Hazard', tint: '#facc15', paint: paintHazard },
  { id: 'compass', name: 'Compass', tint: '#0b2b5e', paint: paintCompass },
  { id: 'mint', name: 'Mint', tint: '#34d399', paint: solid('#34d399', '#059669') },
  { id: 'coral', name: 'Coral', tint: '#fb7185', paint: solid('#fb7185', '#e11d48') },
  { id: 'sky', name: 'Sky', tint: '#7dd3fc', paint: solid('#7dd3fc', '#0284c7') },
  { id: 'teal', name: 'Teal', tint: '#14b8a6', paint: solid('#14b8a6', '#0f766e') },
  { id: 'lavender', name: 'Lavender', tint: '#c4b5fd', paint: solid('#c4b5fd', '#7c3aed') },
  { id: 'forest', name: 'Forest', tint: '#16a34a', paint: solid('#16a34a', '#14532d') },
  { id: 'sand', name: 'Sand', tint: '#d6b48a', paint: solid('#e7c9a0', '#b08250') },
  { id: 'navy', name: 'Navy', tint: '#0b2b5e', paint: solid('#1e40af', '#0b2b5e') },
  { id: 'chameleon', name: 'Chameleon', tint: '#22c55e', paint: paintChameleon },
  { id: 'eight', name: '8-ball', tint: '#111827', paint: eightBall },
  { id: 'bowling', name: 'Bowling', tint: '#6d28d9', paint: paintBowling },
  { id: 'golf', name: 'Golf', tint: '#94a3b8', paint: golf },
  { id: 'beachball', name: 'Beach ball', tint: '#ef4444', paint: beachBall },
  { id: 'shuttlecock', name: 'Shuttlecock', tint: '#ef4444', paint: shuttlecock },
  { id: 'pokerchip', name: 'Poker chip', tint: '#dc2626', paint: pokerChip },
  { id: 'goldcoin', name: 'Gold coin', tint: '#ca8a04', paint: goldCoin },
  { id: 'button', name: 'Button', tint: '#14b8a6', paint: button },
  { id: 'ruby', name: 'Ruby', tint: '#e11d48', paint: ruby },
  { id: 'opal', name: 'Opal', tint: '#7dd3fc', paint: opal },
  { id: 'stainedglass', name: 'Stained glass', tint: '#2563eb', paint: stainedGlass },
  { id: 'orange', name: 'Orange slice', tint: '#f97316', paint: paintOrange },
  { id: 'kiwi', name: 'Kiwi', tint: '#65a30d', paint: kiwi },
  { id: 'strawberry', name: 'Strawberry', tint: '#e11d48', paint: strawberry },
  { id: 'cupcake', name: 'Cupcake', tint: '#f9a8d4', paint: cupcake },
  { id: 'avocado', name: 'Avocado', tint: '#84cc16', paint: avocado },
  { id: 'smiley', name: 'Smiley', tint: '#facc15', paint: paintSmiley },
  { id: 'cool', name: 'Cool', tint: '#facc15', paint: paintCool },
  { id: 'scaredy', name: 'Scaredy', tint: '#0891b2', paint: scaredy },
  { id: 'eyeball', name: 'Eyeball', tint: '#2563eb', paint: paintEyeball },
  { id: 'fireball', name: 'Fireball', tint: '#f97316', paint: paintFireball },
  { id: 'comet', name: 'Comet', tint: '#38bdf8', paint: comet },
  { id: 'snowglobe', name: 'Snow globe', tint: '#7dd3fc', paint: snowGlobe },
  { id: 'hotcocoa', name: 'Hot cocoa', tint: '#92400e', paint: cocoa },
  { id: 'pinecone', name: 'Pinecone', tint: '#78350f', paint: pinecone },
  { id: 'crackedice', name: 'Cracked ice', tint: '#93c5fd', paint: crackedIce },
  { id: 'glacier', name: 'Glacier', tint: '#0284c7', paint: glacier },
  { id: 'santa', name: 'Santa', tint: '#dc2626', paint: santa },
  { id: 'giftbox', name: 'Gift box', tint: '#dc2626', paint: giftBox },
  { id: 'pumpkin', name: "Jack-o'-lantern", tint: '#ea580c', paint: jackOLantern },
  { id: 'ghost', name: 'Ghost', tint: '#94a3b8', paint: ghost },
  { id: 'paintedegg', name: 'Painted egg', tint: '#a78bfa', paint: paintedEgg },
  { id: 'robot', name: 'Robot', tint: '#64748b', paint: robot },
  { id: 'ninja', name: 'Ninja', tint: '#dc2626', paint: ninja },
  { id: 'yeti', name: 'Yeti', tint: '#7dd3fc', paint: yeti },
  { id: 'penguin', name: 'Penguin', tint: '#0f172a', paint: penguin },
  { id: 'polarbear', name: 'Polar bear', tint: '#cbd5e1', paint: polarBear },
  { id: 'seal', name: 'Seal', tint: '#94a3b8', paint: seal },
  { id: 'walrus', name: 'Walrus', tint: '#8b6a4a', paint: walrus },
  { id: 'husky', name: 'Husky', tint: '#475569', paint: husky },
  { id: 'reindeer', name: 'Reindeer', tint: '#78350f', paint: reindeer },
  { id: 'fox', name: 'Fox', tint: '#ea580c', paint: fox },
  { id: 'wolf', name: 'Wolf', tint: '#374151', paint: wolf },
  { id: 'bear', name: 'Bear', tint: '#78350f', paint: bear },
  { id: 'owl', name: 'Owl', tint: '#92400e', paint: owl },
  { id: 'hedgehog', name: 'Hedgehog', tint: '#57534e', paint: hedgehog },
  { id: 'bunny', name: 'Bunny', tint: '#f9a8d4', paint: bunny },
  { id: 'mouse', name: 'Mouse', tint: '#9ca3af', paint: mouse },
  { id: 'hamster', name: 'Hamster', tint: '#ea8a2a', paint: hamster },
  { id: 'otter', name: 'Otter', tint: '#92400e', paint: otter },
  { id: 'dino', name: 'Dino', tint: '#16a34a', paint: dino },
  { id: 'pig', name: 'Pig', tint: '#f472b6', paint: pig },
  { id: 'cow', name: 'Cow', tint: '#1f2937', paint: cow },
  { id: 'sheep', name: 'Sheep', tint: '#334155', paint: sheep },
  { id: 'duckling', name: 'Duckling', tint: '#facc15', paint: duckling },
  { id: 'ladybug', name: 'Ladybug', tint: '#dc2626', paint: ladybug },
  { id: 'bee', name: 'Bee', tint: '#eab308', paint: bee },
  { id: 'koala', name: 'Koala', tint: '#9ca3af', paint: koala },
  { id: 'tiger', name: 'Tiger', tint: '#ea580c', paint: tiger },
  { id: 'zebra', name: 'Zebra', tint: '#111827', paint: zebra },
  { id: 'giraffe', name: 'Giraffe', tint: '#f59e0b', paint: giraffe },
  { id: 'hippo', name: 'Hippo', tint: '#6d6491', paint: hippo },
  { id: 'axolotl', name: 'Axolotl', tint: '#fb7185', paint: axolotl },
  { id: 'whale', name: 'Whale', tint: '#1d4ed8', paint: whale },
  { id: 'shark', name: 'Shark', tint: '#475569', paint: shark },
  { id: 'unicorn', name: 'Unicorn', tint: '#c4b5fd', paint: unicorn },
  { id: 'hypno', name: 'Hypno', tint: '#7c3aed', paint: hypno, premium: true },
  { id: 'babydragon', name: 'Baby dragon', tint: '#7c3aed', paint: babyDragon, premium: true },
  { id: 'snowleopard', name: 'Snow leopard', tint: '#94a3b8', paint: snowLeopard, premium: true },
  { id: 'supernova', name: 'Supernova', tint: '#f59e0b', paint: supernova, premium: true },
]

const skinOf = (id: SkinId): Skin | undefined => SKINS.find((entry) => entry.id === id) ?? SKINS[0]

export const isPremiumSkin = (id: SkinId): boolean => skinOf(id)?.premium === true

export const tintOf = (id: SkinId, theme: Theme): string => skinOf(id)?.tint ?? theme.ball

export const paintBall = (
  ctx: CanvasRenderingContext2D,
  id: SkinId,
  x: number,
  y: number,
  r: number,
  env: BallEnv,
): void => {
  skinOf(id)?.paint(ctx, x, y, r, env)
}
