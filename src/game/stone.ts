import { createRng, type Rng } from './rng.ts'

// A lumpy sphere seen from straight above, from mockups/obstacles.html. Rolling turns it about the
// flat axis at right angles to its travel, by distance over radius, so its marks slide the way it
// moves.

type Vec = readonly [number, number, number]
export type Mat = readonly [Vec, Vec, Vec]

export const IDENTITY: Mat = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
]

const row = (a: Vec, b: Mat): Vec => [
  a[0] * b[0][0] + a[1] * b[1][0] + a[2] * b[2][0],
  a[0] * b[0][1] + a[1] * b[1][1] + a[2] * b[2][1],
  a[0] * b[0][2] + a[1] * b[1][2] + a[2] * b[2][2],
]
const matMul = (a: Mat, b: Mat): Mat => [row(a[0], b), row(a[1], b), row(a[2], b)]
const apply = (m: Mat, v: Vec): Vec => [
  m[0][0] * v[0] + m[0][1] * v[1] + m[0][2] * v[2],
  m[1][0] * v[0] + m[1][1] * v[1] + m[1][2] * v[2],
  m[2][0] * v[0] + m[2][1] * v[1] + m[2][2] * v[2],
]

export const axisAngle = ([x, y, z]: Vec, a: number): Mat => {
  const c = Math.cos(a)
  const s = Math.sin(a)
  const t = 1 - c
  return [
    [t * x * x + c, t * x * y - s * z, t * x * z + s * y],
    [t * x * y + s * z, t * y * y + c, t * y * z - s * x],
    [t * x * z - s * y, t * y * z + s * x, t * z * z + c],
  ]
}

const unitVector = (rng: Rng): Vec => {
  const z = rng() * 2 - 1
  const a = rng() * Math.PI * 2
  const s = Math.sqrt(1 - z * z)
  return [s * Math.cos(a), s * Math.sin(a), z]
}

type Mark = { n: Vec; size: number; dark: boolean }
export type Stone = { shape: Vec[]; marks: Mark[]; pose: Mat }

const makeStone = (seed: number, lump: number): Stone => {
  const rng = createRng(seed)
  const shape = Array.from({ length: 46 }, (): Vec => {
    const [x, y, z] = unitVector(rng)
    const k = 1 - lump + rng() * lump
    return [x * k, y * k, z * k]
  })
  const marks = Array.from({ length: 11 }, (_, i): Mark => ({ n: unitVector(rng), size: 0.18 + rng() * 0.2, dark: i < 7 }))
  return { shape, marks, pose: axisAngle(unitVector(rng), rng() * Math.PI * 2) }
}

const stones = new Map<string, Stone>()

export const stoneFor = (seed: number, lump = 0.16): Stone => {
  const key = `${seed}:${lump}`
  const cached = stones.get(key)
  if (cached) return cached
  const stone = makeStone(seed, lump)
  stones.set(key, stone)
  return stone
}

type Point = [number, number]

const cross = (o: Point, a: Point, b: Point): number => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])

const halfHull = (points: Point[]): Point[] => {
  const out: Point[] = []
  for (const p of points) {
    while (out.length >= 2) {
      const a = out[out.length - 2]
      const b = out[out.length - 1]
      if (!a || !b || cross(a, b, p) > 0) break
      out.pop()
    }
    out.push(p)
  }
  out.pop()
  return out
}

const convexHull = (points: Point[]): Point[] => {
  const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1])
  return [...halfHull(sorted), ...halfHull([...sorted].reverse())]
}

export type StonePalette = { fill: string; dark: string; light: string; edge: string; shade: number }

export const ROCK_PALETTE: StonePalette = { fill: '#6b6660', dark: '#45413c', light: '#a39d95', edge: '#3a3733', shade: 0.3 }
export const SNOW_PALETTE: StonePalette = {
  fill: '#f4f7fb',
  dark: 'rgba(140, 164, 196, 0.7)',
  light: '#ffffff',
  edge: '#b9c6d6',
  shade: 0.16,
}

export const drawStone = (
  ctx: CanvasRenderingContext2D,
  stone: Stone,
  m: Mat,
  x: number,
  y: number,
  r: number,
  palette: StonePalette,
  shadow: string,
): void => {
  const pose = matMul(m, stone.pose)
  ctx.fillStyle = shadow
  ctx.beginPath()
  ctx.ellipse(x - r * 0.45, y + r * 0.4, r * 1.15, r * 0.62, 0, 0, Math.PI * 2)
  ctx.fill()

  const outline = convexHull(
    stone.shape.map((v): Point => {
      const p = apply(pose, v)
      return [x + p[0] * r, y + p[1] * r]
    }),
  )
  const trace = (): void => {
    ctx.beginPath()
    outline.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)))
    ctx.closePath()
  }
  trace()
  ctx.fillStyle = palette.fill
  ctx.fill()

  ctx.save()
  trace()
  ctx.clip()
  for (const mark of stone.marks) {
    const [px, py, pz] = apply(pose, mark.n)
    if (pz < 0.05) continue
    ctx.globalAlpha = Math.min(1, pz * 2.5)
    ctx.fillStyle = mark.dark ? palette.dark : palette.light
    ctx.beginPath()
    ctx.ellipse(x + px * r * 0.95, y + py * r * 0.95, mark.size * r * pz, mark.size * r, Math.atan2(py, px), 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1
  // Light stays put while the stone turns under it: sun from the upper right.
  const light = ctx.createLinearGradient(x + r * 0.6, y - r * 0.7, x - r * 0.6, y + r * 0.7)
  light.addColorStop(0, 'rgba(255, 255, 255, 0.24)')
  light.addColorStop(0.45, 'rgba(255, 255, 255, 0)')
  light.addColorStop(1, `rgba(0, 0, 0, ${palette.shade})`)
  ctx.fillStyle = light
  ctx.fillRect(x - r * 1.2, y - r * 1.2, r * 2.4, r * 2.4)
  ctx.restore()

  trace()
  ctx.strokeStyle = palette.edge
  ctx.lineWidth = 2
  ctx.stroke()
}
