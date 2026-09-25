import { TRUNK_HALF_SCALE, type Theme } from './state.ts'

// Tree shape, tuned in mockups/tree5.html. Every number is a multiple of the tree's radius.
type Tier = { base: number; height: number; spread: number }
const TIERS_2: Tier[] = [
  { base: 0.5, height: 1.34, spread: 0.82 },
  { base: 1.32, height: 1.35, spread: 0.7 },
]
const TIERS_3: Tier[] = [
  { base: 0.5, height: 1.02, spread: 0.82 },
  { base: 0.99, height: 1, spread: 0.71 },
  { base: 1.5, height: 0.98, spread: 0.56 },
]
// Big trees get the extra tier; small ones can't spare the pixels for it (radii run 10–19).
const THREE_TIER_RADIUS = 14.5
const tiersFor = (radius: number): Tier[] => (radius >= THREE_TIER_RADIUS ? TIERS_3 : TIERS_2)

const TRUNK_VISIBLE = 0.6
const TRUNK_OVERLAP = 0.3
// How much of each cone's round base the camera sees. The curve bulges down to `base`, so raising
// it never sinks a tier onto the trunk.
const CONE_DEPTH = 0.26
const CAST_X = -0.22
const CAST_Y = 0.1

// Shadows are a flattened copy of the pine sheared down-left, away from the sun on the right.
const SHADOW_SHEAR = 0.85
const SHADOW_FLATTEN = -0.4
// Blurring per tree per frame costs far too much, so the shape is blurred once at this radius and
// blitted scaled — which also makes a bigger tree's shadow proportionally softer.
const SHADOW_REF = 56
const SHADOW_BLUR = 18
const SHADOW_PAD = SHADOW_BLUR * 3

const tierPath = (
  ctx: CanvasRenderingContext2D,
  x: number,
  groundY: number,
  r: number,
  tier: Tier,
): void => {
  const rx = tier.spread * r
  const ry = rx * CONE_DEPTH
  const cy = groundY - tier.base * r - ry
  ctx.beginPath()
  ctx.moveTo(x, groundY - (tier.base + tier.height) * r)
  ctx.lineTo(x + rx, cy)
  ctx.ellipse(x, cy, rx, ry, 0, 0, Math.PI)
  ctx.closePath()
}

// Sun is off to the right, so the lit face is the cone's right half.
const tierLitPath = (
  ctx: CanvasRenderingContext2D,
  x: number,
  groundY: number,
  r: number,
  tier: Tier,
): void => {
  const rx = tier.spread * r
  const ry = rx * CONE_DEPTH
  const cy = groundY - tier.base * r - ry
  ctx.beginPath()
  ctx.moveTo(x, groundY - (tier.base + tier.height) * r)
  ctx.lineTo(x + rx, cy)
  ctx.ellipse(x, cy, rx, ry, 0, 0, Math.PI / 2)
  ctx.closePath()
}

const trunkRect = (
  ctx: CanvasRenderingContext2D,
  x: number,
  groundY: number,
  r: number,
): void => {
  const half = r * TRUNK_HALF_SCALE
  const top = groundY - (TRUNK_VISIBLE + TRUNK_OVERLAP) * r
  ctx.beginPath()
  ctx.rect(x - half, top, half * 2, groundY - top)
}

// The tier above dropped onto this tier's branches, thrown the same way as the snow shadow.
const drawCast = (
  ctx: CanvasRenderingContext2D,
  theme: Theme,
  x: number,
  groundY: number,
  r: number,
  tier: Tier,
  above: Tier,
): void => {
  const rx = above.spread * r
  const ry = rx * CONE_DEPTH
  ctx.save()
  tierPath(ctx, x, groundY, r, tier)
  ctx.clip()
  ctx.fillStyle = theme.cast
  ctx.beginPath()
  ctx.ellipse(x + CAST_X * rx, groundY - above.base * r - ry + CAST_Y * r, rx, ry, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

type ShadowSprite = { canvas: HTMLCanvasElement; originX: number; originY: number }

const createShadowSprite = (tiers: Tier[], colour: string): ShadowSprite => {
  const top = tiers[tiers.length - 1]
  const bottom = tiers[0]
  if (!top || !bottom) throw new Error('a tree needs at least one tier')

  const tip = (top.base + top.height) * SHADOW_REF
  const halfWidth = bottom.spread * SHADOW_REF
  const minX = -halfWidth - SHADOW_SHEAR * tip
  const maxY = -SHADOW_FLATTEN * tip

  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil(halfWidth - minX + SHADOW_PAD * 2)
  canvas.height = Math.ceil(maxY + SHADOW_PAD * 2)

  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('2D canvas context unavailable')

  const originX = -minX + SHADOW_PAD
  const originY = SHADOW_PAD
  ctx.filter = `blur(${SHADOW_BLUR}px)`
  ctx.translate(originX, originY)
  ctx.transform(1, 0, SHADOW_SHEAR, SHADOW_FLATTEN, 0, 0)
  ctx.fillStyle = colour
  trunkRect(ctx, 0, 0, SHADOW_REF)
  ctx.fill()
  for (const tier of tiers) {
    tierPath(ctx, 0, 0, SHADOW_REF, tier)
    ctx.fill()
  }

  return { canvas, originX, originY }
}

// One blurred sprite per tier-set per theme colour, built the first time that theme is played.
const shadowSprites = new Map<string, ShadowSprite>()

const shadowSprite = (tiers: Tier[], colour: string): ShadowSprite => {
  const key = `${tiers === TIERS_3 ? 3 : 2}:${colour}`
  const existing = shadowSprites.get(key)
  if (existing) return existing
  const sprite = createShadowSprite(tiers, colour)
  shadowSprites.set(key, sprite)
  return sprite
}

export const drawShadow = (
  ctx: CanvasRenderingContext2D,
  theme: Theme,
  x: number,
  groundY: number,
  radius: number,
): void => {
  const sprite = shadowSprite(tiersFor(radius), theme.shadow)
  const scale = radius / SHADOW_REF
  const { canvas, originX, originY } = sprite
  ctx.drawImage(
    canvas,
    x - originX * scale,
    groundY - originY * scale,
    canvas.width * scale,
    canvas.height * scale,
  )
}

export const drawPine = (
  ctx: CanvasRenderingContext2D,
  theme: Theme,
  x: number,
  groundY: number,
  radius: number,
): void => {
  const trunkHalf = radius * TRUNK_HALF_SCALE
  const trunkTop = groundY - (TRUNK_VISIBLE + TRUNK_OVERLAP) * radius
  ctx.fillStyle = theme.trunkDark
  ctx.fillRect(x - trunkHalf, trunkTop, trunkHalf * 2, groundY - trunkTop)
  ctx.fillStyle = theme.trunkLight
  ctx.fillRect(x, trunkTop, trunkHalf, groundY - trunkTop)

  const tiers = tiersFor(radius)
  tiers.forEach((tier, index) => {
    ctx.fillStyle = theme.treeDark
    tierPath(ctx, x, groundY, radius, tier)
    ctx.fill()
    ctx.fillStyle = theme.treeLight
    tierLitPath(ctx, x, groundY, radius, tier)
    ctx.fill()

    const above = tiers[index + 1]
    if (above) drawCast(ctx, theme, x, groundY, radius, tier, above)
  })
}
