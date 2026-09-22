// The map is one painted plate cut in two: a head that shows once (the mountain approach) and a
// body tile that repeats for the rest of the run. Both are traced pixel by pixel so the code knows
// where the piste is, and the body's bottom band is rebuilt so each repeat meets the next without
// a seam. Ported from mockups/artmap.html, which is where this was worked out.

// Row where the mountain approach ends; below it the plate repeats.
export const SPLIT = 1_690
// Clean flat snow at the plate's bottom, rebuilt to meet row SPLIT.
const BODY_BAND = 260
// The stitched plate leaves 3px of bare black canvas down both edges.
const MARGIN = 4
// The plate with those margins cut, so a coordinate in the paint tool is a coordinate here.
export const PLATE_W = 846
export const PLATE_H = 7_550

export type Edge = { l: number; r: number }

export type Plate = {
  w: number
  h: number
  rows: Edge[]
  step: number
  url: string
}

export type Plates = { head: Plate; body: Plate }

const smooth = (t: number): number => t * t * (3 - 2 * t)
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error(`map plate failed to load: ${src}`))
    image.src = src
  })

// Piste cream sits warm (r > b); snow and white highlights do not.
const isCream = (r: number, g: number, b: number): boolean =>
  r > 230 && g > 220 && b > 185 && r - b > 12 && r - b < 75

// `pick` holds the first and last fully-cream pixels; the real edge lies inside the antialiased
// pixel just outside each of them. Reading that pixel's coverage keeps the redrawn trail from
// landing a pixel inside the painted one.
const subpixel = (data: Uint8ClampedArray, w: number, y: number, pick: [number, number]): Edge => {
  const red = (x: number): number =>
    data[(y * w + Math.max(0, Math.min(w - 1, x))) * 4] ?? 0
  const inside = red(pick[0] + 6)
  const edge = (at: number, outside: number, dir: 1 | -1): number => {
    const span = inside - red(outside)
    if (Math.abs(span) < 12) return dir < 0 ? at : at + 1
    const f = Math.max(0, Math.min(1, (red(at + dir) - red(outside)) / span))
    return dir < 0 ? at - f : at + 1 + f
  }
  return { l: edge(pick[0], pick[0] - 6, -1), r: edge(pick[1], pick[1] + 6, 1) }
}

const traceRows = (data: Uint8ClampedArray, w: number, h: number, step: number): Edge[] => {
  const rows: (Edge | null)[] = []
  let prev: number | null = null

  for (let y = 0; y < h; y += step) {
    const runs: [number, number][] = []
    let start = -1
    const base = y * w * 4
    for (let x = 0; x < w; x += 1) {
      const i = base + x * 4
      if (isCream(data[i] ?? 0, data[i + 1] ?? 0, data[i + 2] ?? 0)) {
        if (start < 0) start = x
      } else if (start >= 0) {
        runs.push([start, x - 1])
        start = -1
      }
    }
    if (start >= 0) runs.push([start, w - 1])

    const merged: [number, number][] = []
    for (const run of runs) {
      const last = merged[merged.length - 1]
      if (last && run[0] - last[1] <= 10) last[1] = run[1]
      else merged.push([run[0], run[1]])
    }
    const wide = merged.filter((run) => run[1] - run[0] > 18)

    let pick: [number, number] | null = null
    const first = wide[0]
    if (wide.length === 1 && first) pick = first
    else if (wide.length > 1) {
      const reference: number | null = prev
      pick =
        reference === null
          ? wide.reduce((a, b) => (b[1] - b[0] > a[1] - a[0] ? b : a))
          : wide.reduce((a, b) =>
              Math.abs((b[0] + b[1]) / 2 - reference) < Math.abs((a[0] + a[1]) / 2 - reference)
                ? b
                : a,
            )
    }
    if (pick) prev = (pick[0] + pick[1]) / 2
    rows.push(pick ? subpixel(data, w, y, pick) : null)
  }

  // Rows above the first traced row (the mountains) inherit the first crossing.
  const firstHit = rows.findIndex((row) => row !== null)
  if (firstHit < 0) return rows.map(() => ({ l: w * 0.4, r: w * 0.6 }))
  const seed = rows[firstHit] ?? { l: w * 0.4, r: w * 0.6 }
  for (let i = 0; i < firstHit; i += 1) rows[i] = seed
  for (let i = firstHit + 1; i < rows.length; i += 1) rows[i] ??= rows[i - 1] ?? seed
  return rows.map((row) => row ?? seed)
}

export const rowAt = (rows: Edge[], step: number, y: number): Edge => {
  const t = y / step
  const i = Math.max(0, Math.min(rows.length - 2, Math.floor(t)))
  const f = Math.max(0, Math.min(1, t - i))
  const a = rows[i]
  const b = rows[i + 1]
  if (!a || !b) return a ?? b ?? { l: 0, r: 0 }
  return { l: lerp(a.l, b.l, f), r: lerp(a.r, b.r, f) }
}

type Seam = { snow: number[]; cream: number[] }
type Join = Edge & { sl: number; sr: number }

const rgb = (d: number[]): string => `rgb(${d[0] ?? 0},${d[1] ?? 0},${d[2] ?? 0})`

// The plate's bottom band is flat snow apart from the trail, so it can be rebuilt from scratch:
// every row is refilled with its own snow colour at full opacity — that wipes the old trail
// outright, so nothing of it shows through the rebuilt one — and the trail is then redrawn so it
// leaves the tile exactly where the next tile picks it up.
const weldBottom = (
  ctx: CanvasRenderingContext2D,
  rows: Edge[],
  step: number,
  w: number,
  h: number,
  band: number,
  join: Join,
  seam: Seam,
): void => {
  const y0 = h - band
  const jl = join.l * w
  const jr = join.r * w
  const column = ctx.getImageData(2, y0, 1, band).data

  for (let y = y0; y < h; y += 1) {
    const i = (y - y0) * 4
    const t = smooth((y - y0) / band)
    const r = Math.round(lerp(column[i] ?? 0, seam.snow[0] ?? 0, t))
    const g = Math.round(lerp(column[i + 1] ?? 0, seam.snow[1] ?? 0, t))
    const b = Math.round(lerp(column[i + 2] ?? 0, seam.snow[2] ?? 0, t))
    ctx.fillStyle = `rgb(${r},${g},${b})`
    ctx.fillRect(0, y, w, 1)
  }

  // The trail has to reach the seam at the next tile's entry *angle* as well as its position,
  // otherwise every seam shows a kink. Hermite: offset starts flat, ends on the entry slope.
  const lastY = (rows.length - 2) * step
  const end = rowAt(rows, step, lastY)
  const back = rowAt(rows, step, lastY - 60)
  const tail = { l: (end.l - back.l) / 60, r: (end.r - back.r) / 60 }
  const srcAt = (y: number): Edge =>
    y <= lastY
      ? rowAt(rows, step, y)
      : { l: end.l + tail.l * (y - lastY), r: end.r + tail.r * (y - lastY) }
  const tracedEnd = srcAt(h)
  const shift = { l: jl - tracedEnd.l, r: jr - tracedEnd.r }
  const bend = { l: join.sl - tail.l, r: join.sr - tail.r }

  const edgeAt = (y: number): Edge => {
    const u = Math.max(0, Math.min(1, (y - y0) / band))
    const reach = u * u * (3 - 2 * u)
    const angle = (u * u * u - u * u) * band
    const src = srcAt(y)
    return { l: src.l + shift.l * reach + bend.l * angle, r: src.r + shift.r * reach + bend.r * angle }
  }

  // Redraw a little above the wipe so the rebuilt trail meets the plate's own edges.
  const OVERLAP = 40
  const steps = 96
  const path: { y: number; l: number; r: number }[] = []
  for (let k = 0; k <= steps; k += 1) {
    const y = lerp(y0 - OVERLAP, h, k / steps)
    const edge = edgeAt(y)
    path.push({ y, l: edge.l, r: edge.r })
  }
  const head = path[0]
  if (!head) return

  ctx.beginPath()
  ctx.moveTo(head.l, head.y)
  for (const point of path) ctx.lineTo(point.l, point.y)
  // Overshoot the last pixel row, or the seam row renders as bare snow.
  ctx.lineTo(jl, h + 2)
  ctx.lineTo(jr, h + 2)
  for (let k = path.length - 1; k >= 0; k -= 1) {
    const point = path[k]
    if (point) ctx.lineTo(point.r, point.y)
  }
  ctx.closePath()
  ctx.fillStyle = rgb(seam.cream)
  ctx.fill()

  const welded = rows.map((row, i) => (i * step < y0 ? row : edgeAt(i * step)))
  for (let i = 0; i < rows.length; i += 1) {
    const row = welded[i]
    if (row) rows[i] = row
  }
}

type Slice = { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D; w: number; h: number }

const sliceOf = (image: HTMLImageElement, y0: number, y1: number): Slice => {
  const canvas = document.createElement('canvas')
  canvas.width = image.naturalWidth - MARGIN * 2
  canvas.height = y1 - y0
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('2D canvas context unavailable')
  ctx.drawImage(image, -MARGIN, -y0)
  return { canvas, ctx, w: canvas.width, h: canvas.height }
}

const toPlate = async (part: Slice, rows: Edge[], step: number): Promise<Plate> => {
  const url = await new Promise<string>((resolve) => {
    part.canvas.toBlob((blob) => resolve(blob ? URL.createObjectURL(blob) : ''), 'image/png')
  })
  return { w: part.w, h: part.h, rows, step, url }
}

// The head needs no weld at all — its last row is the body's first row, because both come from
// the same cut.
export const bakePlate = async (src: string): Promise<Plates> => {
  const image = await loadImage(src)
  const step = 2
  const headPart = sliceOf(image, 0, SPLIT)
  const bodyPart = sliceOf(image, SPLIT, image.naturalHeight)

  const headRows = traceRows(
    headPart.ctx.getImageData(0, 0, headPart.w, headPart.h).data,
    headPart.w,
    headPart.h,
    step,
  )
  const bodyRows = traceRows(
    bodyPart.ctx.getImageData(0, 0, bodyPart.w, bodyPart.h).data,
    bodyPart.w,
    bodyPart.h,
    step,
  )

  const top = bodyRows[0] ?? { l: bodyPart.w * 0.4, r: bodyPart.w * 0.6 }
  const entry = rowAt(bodyRows, step, 60)
  const join: Join = {
    l: top.l / bodyPart.w,
    r: top.r / bodyPart.w,
    sl: (entry.l - top.l) / 60,
    sr: (entry.r - top.r) / 60,
  }
  const seam: Seam = {
    snow: [...bodyPart.ctx.getImageData(2, 0, 1, 1).data],
    cream: [...bodyPart.ctx.getImageData(Math.round((top.l + top.r) / 2), 1, 1, 1).data],
  }
  weldBottom(bodyPart.ctx, bodyRows, step, bodyPart.w, bodyPart.h, BODY_BAND, join, seam)

  return {
    head: await toPlate(headPart, headRows, step),
    body: await toPlate(bodyPart, bodyRows, step),
  }
}
