export const TAU = Math.PI * 2

export const circle = (ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void => {
  ctx.beginPath()
  ctx.arc(x, y, r, 0, TAU)
}

export const disc = (ctx: CanvasRenderingContext2D, x: number, y: number, r: number, colour: string): void => {
  ctx.fillStyle = colour
  circle(ctx, x, y, r)
  ctx.fill()
}

// The game's ball is 7 px with a 2 px rim; previews draw bigger and keep the same proportion.
export const rim = (ctx: CanvasRenderingContext2D, x: number, y: number, r: number, colour: string, k = 0.28): void => {
  ctx.strokeStyle = colour
  ctx.lineWidth = Math.max(1, r * k)
  circle(ctx, x, y, r)
  ctx.stroke()
}

// Draws about the ball's centre, turned by spin.
export const local = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  spin: number,
  draw: (ctx: CanvasRenderingContext2D) => void,
): void => {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(spin)
  draw(ctx)
  ctx.restore()
}

// The same, clipped to the ball, for patterns that run off its edge.
export const inside = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  spin: number,
  draw: (ctx: CanvasRenderingContext2D) => void,
): void => {
  ctx.save()
  circle(ctx, x, y, r)
  ctx.clip()
  local(ctx, x, y, spin, draw)
  ctx.restore()
}

export const gloss = (ctx: CanvasRenderingContext2D, x: number, y: number, r: number, alpha: number): void => {
  const shine = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, 0, x - r * 0.35, y - r * 0.4, r * 0.95)
  shine.addColorStop(0, `rgba(255,255,255,${alpha})`)
  shine.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = shine
  circle(ctx, x, y, r)
  ctx.fill()
}

// A fixed scatter, so sprinkles and mirror tiles keep their places frame to frame.
export const hash = (a: number, b = 0): number => {
  const s = Math.sin(a * 127.1 + b * 311.7) * 43_758.545_3
  return s - Math.floor(s)
}

export const polygon = (ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, sides: number, rotation: number): void => {
  ctx.beginPath()
  for (let i = 0; i < sides; i += 1) {
    const a = rotation + (i / sides) * TAU
    if (i === 0) ctx.moveTo(x + Math.cos(a) * radius, y + Math.sin(a) * radius)
    else ctx.lineTo(x + Math.cos(a) * radius, y + Math.sin(a) * radius)
  }
  ctx.closePath()
}

export const star = (ctx: CanvasRenderingContext2D, x: number, y: number, outer: number, rotation: number, points = 5, depth = 0.45): void => {
  ctx.beginPath()
  for (let i = 0; i < points * 2; i += 1) {
    const a = rotation - Math.PI / 2 + (i / (points * 2)) * TAU
    const radius = i % 2 === 0 ? outer : outer * depth
    if (i === 0) ctx.moveTo(x + Math.cos(a) * radius, y + Math.sin(a) * radius)
    else ctx.lineTo(x + Math.cos(a) * radius, y + Math.sin(a) * radius)
  }
  ctx.closePath()
}

export const hsl = (hue: number, saturation = 90, lightness = 60, alpha = 1): string =>
  `hsla(${((hue % 360) + 360) % 360}, ${saturation}%, ${lightness}%, ${alpha})`

export const width = (r: number, k: number): number => Math.max(0.6, r * k)

export const ring = (ctx: CanvasRenderingContext2D, x: number, y: number, r: number, colour: string, lineWidth: number): void => {
  ctx.strokeStyle = colour
  ctx.lineWidth = lineWidth
  circle(ctx, x, y, r)
  ctx.stroke()
}

export const shaded = (ctx: CanvasRenderingContext2D, x: number, y: number, r: number, light: string, dark: string): void => {
  const fill = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r)
  fill.addColorStop(0, light)
  fill.addColorStop(1, dark)
  ctx.fillStyle = fill
  circle(ctx, x, y, r)
  ctx.fill()
}

export const cuteEyes = (ctx: CanvasRenderingContext2D, r: number, gap: number, high: number, size: number): void => {
  for (const side of [-1, 1]) {
    disc(ctx, side * r * gap, -r * high, r * size, '#111827')
    disc(ctx, side * r * gap - r * size * 0.3, -r * high - r * size * 0.35, r * size * 0.38, '#ffffff')
  }
}

export const face = (ctx: CanvasRenderingContext2D, x: number, y: number, r: number, heading: number, draw: (ctx: CanvasRenderingContext2D) => void): void =>
  local(ctx, x + heading * r * 0.1, y, 0, draw)

export const blob = (ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, colour: string, tilt = 0): void => {
  ctx.fillStyle = colour
  ctx.beginPath()
  ctx.ellipse(x, y, rx, ry, tilt, 0, TAU)
  ctx.fill()
}

export const tri = (ctx: CanvasRenderingContext2D, ax: number, ay: number, bx: number, by: number, cx: number, cy: number, colour: string): void => {
  ctx.fillStyle = colour
  ctx.beginPath()
  ctx.moveTo(ax, ay)
  ctx.lineTo(bx, by)
  ctx.lineTo(cx, cy)
  ctx.fill()
}

export const smile = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, colour: string, lineWidth: number): void => {
  ctx.strokeStyle = colour
  ctx.lineWidth = lineWidth
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.arc(x, y, size, 0.2 * Math.PI, 0.8 * Math.PI)
  ctx.stroke()
}

export const cheeks = (ctx: CanvasRenderingContext2D, r: number, gap: number, high: number, colour = 'rgba(244,114,182,0.45)'): void => {
  disc(ctx, -r * gap, r * high, r * 0.11, colour)
  disc(ctx, r * gap, r * high, r * 0.11, colour)
}

export const stroke = (ctx: CanvasRenderingContext2D, colour: string, lineWidth: number): void => {
  ctx.strokeStyle = colour
  ctx.lineWidth = lineWidth
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
}
