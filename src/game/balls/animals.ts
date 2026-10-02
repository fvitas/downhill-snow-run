import { blob, cheeks, circle, cuteEyes, disc, face, gloss, hash, inside, local, polygon, rim, ring, shaded, smile, stroke, TAU, tri, width } from './kit.ts'
import type { Paint } from '../skins.ts'

const eyes = (ctx: CanvasRenderingContext2D, r: number, gap: number, high: number, size: number, look = 0): void => {
  for (const side of [-1, 1]) {
    disc(ctx, side * r * gap, -r * high, r * size, '#ffffff')
    disc(ctx, side * r * gap + look * r * size * 0.35, -r * high, r * size * 0.55, '#111827')
  }
}

export const yeti: Paint = (ctx, x, y, r, { heading }) => {
  ctx.fillStyle = '#f8fafc'
  ctx.beginPath()
  for (let i = 0; i <= 28; i += 1) {
    const a = (i / 28) * TAU
    const d = r * (i % 2 === 0 ? 1.06 : 0.9)
    if (i === 0) ctx.moveTo(x + Math.cos(a) * d, y + Math.sin(a) * d)
    else ctx.lineTo(x + Math.cos(a) * d, y + Math.sin(a) * d)
  }
  ctx.fill()
  ctx.strokeStyle = '#cbd5e1'
  ctx.lineWidth = width(r, 0.04)
  ctx.stroke()
  local(ctx, x + heading * r * 0.1, y, 0, (ctx) => {
    ctx.fillStyle = '#7dd3fc'
    ctx.beginPath()
    ctx.ellipse(0, r * 0.12, r * 0.6, r * 0.5, 0, 0, TAU)
    ctx.fill()
    eyes(ctx, r, 0.24, 0.02, 0.15, heading)
    ctx.fillStyle = '#0c4a6e'
    ctx.beginPath()
    ctx.ellipse(0, r * 0.38, r * 0.22, r * 0.1, 0, 0, Math.PI)
    ctx.fill()
    disc(ctx, -r * 0.08, r * 0.37, r * 0.05, '#ffffff')
    disc(ctx, r * 0.08, r * 0.37, r * 0.05, '#ffffff')
  })
}

export const ladybug: Paint = (ctx, x, y, r, { heading }) => {
  ctx.strokeStyle = '#111827'
  ctx.lineWidth = width(r, 0.07)
  ctx.lineCap = 'round'
  for (const side of [-1, 1]) {
    ctx.beginPath()
    ctx.moveTo(x + side * r * 0.2, y - r * 0.85)
    ctx.quadraticCurveTo(x + side * r * 0.3, y - r * 1.35, x + side * r * 0.6, y - r * 1.3)
    ctx.stroke()
    disc(ctx, x + side * r * 0.6, y - r * 1.3, r * 0.1, '#111827')
  }
  shaded(ctx, x, y, r, '#f87171', '#b91c1c')
  inside(ctx, x, y, r, 0, (ctx) => {
    ctx.fillStyle = '#111827'
    ctx.beginPath()
    ctx.ellipse(0, -r, r * 0.75, r * 0.5, 0, 0, TAU)
    ctx.fill()
    ctx.strokeStyle = '#111827'
    ctx.lineWidth = width(r, 0.07)
    ctx.beginPath()
    ctx.moveTo(0, -r * 0.5)
    ctx.lineTo(0, r)
    ctx.stroke()
    for (const [sx, sy, s] of [[-0.45, -0.1, 0.16], [0.45, -0.1, 0.16], [-0.35, 0.45, 0.14], [0.35, 0.45, 0.14], [-0.75, 0.2, 0.1], [0.75, 0.2, 0.1]] as const) {
      disc(ctx, sx * r, sy * r, s * r, '#111827')
    }
    disc(ctx, -r * 0.25 + heading * r * 0.06, -r * 0.7, r * 0.09, '#ffffff')
    disc(ctx, r * 0.25 + heading * r * 0.06, -r * 0.7, r * 0.09, '#ffffff')
  })
  gloss(ctx, x, y, r, 0.55)
}

export const bee: Paint = (ctx, x, y, r) => {
  for (const side of [-1, 1]) {
    ctx.fillStyle = 'rgba(224,242,254,0.85)'
    ctx.strokeStyle = 'rgba(14,116,144,0.5)'
    ctx.lineWidth = width(r, 0.04)
    ctx.beginPath()
    ctx.ellipse(x + side * r * 0.45, y - r * 0.85, r * 0.42, r * 0.24, side * 0.6, 0, TAU)
    ctx.fill()
    ctx.stroke()
  }
  shaded(ctx, x, y, r, '#fde047', '#eab308')
  inside(ctx, x, y, r, 0, (ctx) => {
    ctx.fillStyle = '#1f2937'
    for (const band of [-0.15, 0.4]) ctx.fillRect(-r, band * r, r * 2, r * 0.26)
    ctx.fillRect(-r, r * 0.88, r * 2, r * 0.3)
  })
  local(ctx, x, y, 0, (ctx) => eyes(ctx, r, 0.3, 0.42, 0.13))
  gloss(ctx, x, y, r, 0.45)
}

export const owl: Paint = (ctx, x, y, r, { t, heading }) => {
  ctx.fillStyle = '#92400e'
  for (const side of [-1, 1]) {
    ctx.beginPath()
    ctx.moveTo(x + side * r * 0.75, y - r * 0.5)
    ctx.lineTo(x + side * r * 0.65, y - r * 1.15)
    ctx.lineTo(x + side * r * 0.3, y - r * 0.8)
    ctx.fill()
  }
  shaded(ctx, x, y, r, '#b45309', '#78350f')
  local(ctx, x, y, 0, (ctx) => {
    ctx.fillStyle = '#fde68a'
    ctx.beginPath()
    ctx.ellipse(0, r * 0.35, r * 0.5, r * 0.5, 0, 0, TAU)
    ctx.fill()
    const blink = (t % 3.2) < 0.12
    for (const side of [-1, 1]) {
      disc(ctx, side * r * 0.36, -r * 0.2, r * 0.32, '#ffffff')
      if (blink) {
        ctx.fillStyle = '#92400e'
        ctx.fillRect(side * r * 0.36 - r * 0.32, -r * 0.22, r * 0.64, r * 0.06)
      } else {
        disc(ctx, side * r * 0.36 + heading * r * 0.08, -r * 0.2, r * 0.17, '#f59e0b')
        disc(ctx, side * r * 0.36 + heading * r * 0.08, -r * 0.2, r * 0.09, '#111827')
      }
    }
    ctx.fillStyle = '#f97316'
    ctx.beginPath()
    ctx.moveTo(-r * 0.1, r * 0.05)
    ctx.lineTo(r * 0.1, r * 0.05)
    ctx.lineTo(0, r * 0.28)
    ctx.fill()
  })
}

export const pig: Paint = (ctx, x, y, r, { heading }) => {
  ctx.fillStyle = '#f9a8d4'
  for (const side of [-1, 1]) {
    ctx.beginPath()
    ctx.moveTo(x + side * r * 0.3, y - r * 0.85)
    ctx.lineTo(x + side * r * 0.95, y - r * 0.95)
    ctx.lineTo(x + side * r * 0.8, y - r * 0.35)
    ctx.fill()
  }
  shaded(ctx, x, y, r, '#fbcfe8', '#f472b6')
  local(ctx, x + heading * r * 0.08, y, 0, (ctx) => {
    disc(ctx, -r * 0.32, -r * 0.2, r * 0.1, '#111827')
    disc(ctx, r * 0.32, -r * 0.2, r * 0.1, '#111827')
    ctx.fillStyle = '#f472b6'
    ctx.beginPath()
    ctx.ellipse(0, r * 0.25, r * 0.34, r * 0.25, 0, 0, TAU)
    ctx.fill()
    disc(ctx, -r * 0.12, r * 0.25, r * 0.07, '#9d174d')
    disc(ctx, r * 0.12, r * 0.25, r * 0.07, '#9d174d')
  })
  gloss(ctx, x, y, r, 0.35)
}

export const hedgehog: Paint = (ctx, x, y, r, { heading }) => {
  ctx.fillStyle = '#57534e'
  ctx.beginPath()
  for (let i = 0; i <= 30; i += 1) {
    const a = Math.PI * 0.85 + (i / 30) * Math.PI * 1.3
    const d = r * (i % 2 === 0 ? 1.25 : 0.95)
    if (i === 0) ctx.moveTo(x + Math.cos(a) * d, y + Math.sin(a) * d)
    else ctx.lineTo(x + Math.cos(a) * d, y + Math.sin(a) * d)
  }
  ctx.fill()
  shaded(ctx, x, y, r, '#78716c', '#44403c')
  local(ctx, x + heading * r * 0.12, y, 0, (ctx) => {
    ctx.fillStyle = '#fde4c8'
    ctx.beginPath()
    ctx.ellipse(0, r * 0.25, r * 0.62, r * 0.55, 0, 0, TAU)
    ctx.fill()
    disc(ctx, -r * 0.24, r * 0.1, r * 0.09, '#111827')
    disc(ctx, r * 0.24, r * 0.1, r * 0.09, '#111827')
    disc(ctx, 0, r * 0.42, r * 0.12, '#111827')
  })
}

export const cow: Paint = (ctx, x, y, r, { heading }) => {
  ctx.strokeStyle = '#e7e5e4'
  ctx.lineWidth = width(r, 0.14)
  ctx.lineCap = 'round'
  for (const side of [-1, 1]) {
    ctx.beginPath()
    ctx.moveTo(x + side * r * 0.35, y - r * 0.8)
    ctx.quadraticCurveTo(x + side * r * 0.5, y - r * 1.25, x + side * r * 0.25, y - r * 1.3)
    ctx.stroke()
    blob(ctx, x + side * r * 0.95, y - r * 0.4, r * 0.34, r * 0.17, '#f5f5f4', side * 0.35)
    blob(ctx, x + side * r * 0.98, y - r * 0.4, r * 0.2, r * 0.09, '#f9a8d4', side * 0.35)
  }
  shaded(ctx, x, y, r, '#ffffff', '#d6d3d1')
  inside(ctx, x, y, r, 0, (ctx) => {
    ctx.translate(heading * r * 0.1, 0)
    ctx.fillStyle = '#1c1917'
    for (const [px, py, s] of [[-0.42, -0.35, 0.36], [0.62, -0.75, 0.3]] as const) {
      ctx.beginPath()
      for (let i = 0; i <= 12; i += 1) {
        const a = (i / 12) * TAU
        const d = s * r * (0.8 + hash(px + i, py) * 0.4)
        if (i === 0) ctx.moveTo(px * r + Math.cos(a) * d, py * r + Math.sin(a) * d)
        else ctx.lineTo(px * r + Math.cos(a) * d, py * r + Math.sin(a) * d)
      }
      ctx.fill()
    }
    blob(ctx, 0, r * 0.5, r * 0.66, r * 0.42, '#f9a8d4')
    blob(ctx, -r * 0.22, r * 0.5, r * 0.08, r * 0.12, '#9d174d', 0.3)
    blob(ctx, r * 0.22, r * 0.5, r * 0.08, r * 0.12, '#9d174d', -0.3)
    cuteEyes(ctx, r, 0.32, 0.18, 0.11)
  })
  gloss(ctx, x, y, r, 0.3)
}

export const koala: Paint = (ctx, x, y, r, { heading }) => {
  for (const side of [-1, 1]) {
    disc(ctx, x + side * r * 0.8, y - r * 0.55, r * 0.45, '#9ca3af')
    disc(ctx, x + side * r * 0.8, y - r * 0.55, r * 0.25, '#f5d0e6')
  }
  shaded(ctx, x, y, r, '#d1d5db', '#9ca3af')
  local(ctx, x + heading * r * 0.08, y, 0, (ctx) => {
    disc(ctx, -r * 0.33, -r * 0.12, r * 0.09, '#111827')
    disc(ctx, r * 0.33, -r * 0.12, r * 0.09, '#111827')
    ctx.fillStyle = '#1f2937'
    ctx.beginPath()
    ctx.ellipse(0, r * 0.18, r * 0.2, r * 0.3, 0, 0, TAU)
    ctx.fill()
  })
}

const whiskers = (ctx: CanvasRenderingContext2D, r: number, high: number, colour: string): void => {
  ctx.strokeStyle = colour
  ctx.lineWidth = width(r, 0.03)
  ctx.lineCap = 'round'
  for (const side of [-1, 1]) {
    for (const tilt of [-0.12, 0.08]) {
      ctx.beginPath()
      ctx.moveTo(side * r * 0.25, r * high)
      ctx.lineTo(side * r * 0.85, r * (high + tilt))
      ctx.stroke()
    }
  }
}

export const penguin: Paint = (ctx, x, y, r, { heading }) => {
  shaded(ctx, x, y, r, '#475569', '#0f172a')
  inside(ctx, x, y, r, 0, (ctx) => {
    ctx.translate(heading * r * 0.1, 0)
    const belly = ctx.createRadialGradient(-r * 0.2, -r * 0.1, r * 0.1, 0, r * 0.2, r * 1.1)
    belly.addColorStop(0, '#ffffff')
    belly.addColorStop(1, '#e2e8f0')
    ctx.fillStyle = belly
    circle(ctx, -r * 0.3, -r * 0.2, r * 0.48)
    ctx.fill()
    circle(ctx, r * 0.3, -r * 0.2, r * 0.48)
    ctx.fill()
    ctx.beginPath()
    ctx.ellipse(0, r * 0.45, r * 0.85, r * 0.8, 0, 0, TAU)
    ctx.fill()
    cuteEyes(ctx, r, 0.28, 0.2, 0.12)
    disc(ctx, -r * 0.5, r * 0.08, r * 0.11, 'rgba(244,114,182,0.45)')
    disc(ctx, r * 0.5, r * 0.08, r * 0.11, 'rgba(244,114,182,0.45)')
    ctx.fillStyle = '#f59e0b'
    ctx.beginPath()
    ctx.moveTo(-r * 0.14, -r * 0.02)
    ctx.quadraticCurveTo(0, -r * 0.1, r * 0.14, -r * 0.02)
    ctx.quadraticCurveTo(0, r * 0.26, -r * 0.14, -r * 0.02)
    ctx.fill()
  })
  rim(ctx, x, y, r, 'rgba(15,23,42,0.5)', 0.05)
  gloss(ctx, x, y, r, 0.35)
}

export const polarBear: Paint = (ctx, x, y, r, { heading }) => {
  for (const side of [-1, 1]) {
    disc(ctx, x + side * r * 0.66, y - r * 0.66, r * 0.3, '#e2e8f0')
    disc(ctx, x + side * r * 0.66, y - r * 0.66, r * 0.16, '#cbd5e1')
  }
  shaded(ctx, x, y, r, '#ffffff', '#cbd5e1')
  face(ctx, x, y, r, heading, (ctx) => {
    cuteEyes(ctx, r, 0.32, 0.12, 0.09)
    blob(ctx, 0, r * 0.3, r * 0.36, r * 0.27, '#f8fafc')
    blob(ctx, 0, r * 0.2, r * 0.13, r * 0.09, '#111827')
    ctx.strokeStyle = '#111827'
    ctx.lineWidth = width(r, 0.04)
    ctx.beginPath()
    ctx.moveTo(0, r * 0.28)
    ctx.lineTo(0, r * 0.4)
    ctx.stroke()
  })
}

export const reindeer: Paint = (ctx, x, y, r, { t, heading }) => {
  ctx.strokeStyle = '#c08a4f'
  ctx.lineCap = 'round'
  for (const side of [-1, 1]) {
    ctx.lineWidth = width(r, 0.15)
    ctx.beginPath()
    ctx.moveTo(x + side * r * 0.3, y - r * 0.8)
    ctx.quadraticCurveTo(x + side * r * 0.4, y - r * 1.45, x + side * r * 1.05, y - r * 1.55)
    ctx.stroke()
    ctx.lineWidth = width(r, 0.11)
    ctx.beginPath()
    ctx.moveTo(x + side * r * 0.4, y - r * 1.2)
    ctx.lineTo(x + side * r * 0.18, y - r * 1.62)
    ctx.moveTo(x + side * r * 0.7, y - r * 1.48)
    ctx.lineTo(x + side * r * 0.6, y - r * 1.88)
    ctx.moveTo(x + side * r * 0.92, y - r * 1.54)
    ctx.lineTo(x + side * r * 1.0, y - r * 1.85)
    ctx.stroke()
    blob(ctx, x + side * r * 0.95, y - r * 0.35, r * 0.36, r * 0.16, '#92400e', side * 0.45)
    blob(ctx, x + side * r * 0.98, y - r * 0.35, r * 0.22, r * 0.08, '#fbcfe8', side * 0.45)
  }
  shaded(ctx, x, y, r, '#c2742f', '#7c4a1e')
  face(ctx, x, y, r, heading, (ctx) => {
    for (const [fx, fy] of [[-0.12, -0.92], [0.06, -0.98], [0.18, -0.88]] as const) disc(ctx, fx * r, fy * r, r * 0.13, '#fde4c3')
    blob(ctx, 0, r * 0.45, r * 0.55, r * 0.42, '#fde4c3')
    cuteEyes(ctx, r, 0.3, 0.18, 0.12)
    ctx.strokeStyle = '#3f2a14'
    ctx.lineWidth = width(r, 0.035)
    for (const side of [-1, 1]) {
      ctx.beginPath()
      ctx.moveTo(side * r * 0.4, -r * 0.27)
      ctx.lineTo(side * r * 0.5, -r * 0.35)
      ctx.stroke()
    }
    disc(ctx, -r * 0.5, r * 0.15, r * 0.1, 'rgba(244,114,182,0.4)')
    disc(ctx, r * 0.5, r * 0.15, r * 0.1, 'rgba(244,114,182,0.4)')
    const glow = 0.5 + 0.5 * Math.sin(t * 5)
    disc(ctx, 0, r * 0.25, r * (0.28 + 0.06 * glow), `rgba(239,68,68,${0.15 + 0.2 * glow})`)
    disc(ctx, 0, r * 0.25, r * 0.2, '#dc2626')
    disc(ctx, -r * 0.06, r * 0.19, r * 0.07, 'rgba(255,255,255,0.85)')
    ctx.strokeStyle = '#7c4a1e'
    ctx.lineWidth = width(r, 0.04)
    ctx.beginPath()
    ctx.arc(0, r * 0.5, r * 0.14, 0.2 * Math.PI, 0.8 * Math.PI)
    ctx.stroke()
  })
  gloss(ctx, x, y, r, 0.25)
}

export const bunny: Paint = (ctx, x, y, r, { t, heading }) => {
  const flop = Math.sin(t * 3) * 0.06
  for (const side of [-1, 1]) {
    blob(ctx, x + side * r * 0.45, y - r * 1.3, r * 0.44, r * 0.88, '#f1f5f9', side * (0.25 + flop))
    ctx.strokeStyle = '#cbd5e1'
    ctx.lineWidth = width(r, 0.05)
    ctx.stroke()
    blob(ctx, x + side * r * 0.46, y - r * 1.25, r * 0.26, r * 0.66, '#f9a8d4', side * (0.25 + flop))
  }
  shaded(ctx, x, y, r, '#ffffff', '#e2e8f0')
  face(ctx, x, y, r, heading, (ctx) => {
    cuteEyes(ctx, r, 0.3, 0.12, 0.11)
    disc(ctx, -r * 0.48, r * 0.18, r * 0.11, 'rgba(244,114,182,0.45)')
    disc(ctx, r * 0.48, r * 0.18, r * 0.11, 'rgba(244,114,182,0.45)')
    whiskers(ctx, r, 0.22, 'rgba(100,116,139,0.6)')
    blob(ctx, 0, r * 0.15, r * 0.09, r * 0.06, '#ec4899')
    ctx.fillStyle = '#ffffff'
    ctx.strokeStyle = '#cbd5e1'
    ctx.lineWidth = width(r, 0.025)
    ctx.fillRect(-r * 0.09, r * 0.28, r * 0.18, r * 0.14)
    ctx.strokeRect(-r * 0.09, r * 0.28, r * 0.18, r * 0.14)
  })
}

export const mouse: Paint = (ctx, x, y, r, { heading }) => {
  for (const side of [-1, 1]) {
    disc(ctx, x + side * r * 0.75, y - r * 0.75, r * 0.48, '#9ca3af')
    disc(ctx, x + side * r * 0.75, y - r * 0.75, r * 0.3, '#f9a8d4')
  }
  shaded(ctx, x, y, r, '#d1d5db', '#9ca3af')
  face(ctx, x, y, r, heading, (ctx) => {
    cuteEyes(ctx, r, 0.28, 0.08, 0.11)
    whiskers(ctx, r, 0.3, 'rgba(55,65,81,0.6)')
    disc(ctx, 0, r * 0.28, r * 0.1, '#ec4899')
  })
}

export const seal: Paint = (ctx, x, y, r, { t, heading }) => {
  shaded(ctx, x, y, r, '#ffffff', '#cbd5e1')
  face(ctx, x, y, r, heading, (ctx) => {
    const blink = (t % 4) < 0.12
    for (const side of [-1, 1]) {
      if (blink) blob(ctx, side * r * 0.32, -r * 0.05, r * 0.14, r * 0.03, '#111827')
      else {
        disc(ctx, side * r * 0.32, -r * 0.05, r * 0.17, '#111827')
        disc(ctx, side * r * 0.32 - r * 0.05, -r * 0.11, r * 0.06, '#ffffff')
      }
    }
    disc(ctx, -r * 0.1, r * 0.3, r * 0.14, '#f1f5f9')
    disc(ctx, r * 0.1, r * 0.3, r * 0.14, '#f1f5f9')
    for (const side of [-1, 1]) for (let k = 0; k < 3; k += 1) disc(ctx, side * r * (0.08 + (k % 2) * 0.08), r * (0.27 + k * 0.05), r * 0.02, '#94a3b8')
    whiskers(ctx, r, 0.3, 'rgba(100,116,139,0.55)')
    blob(ctx, 0, r * 0.16, r * 0.1, r * 0.07, '#111827')
  })
  gloss(ctx, x, y, r, 0.4)
}

export const sheep: Paint = (ctx, x, y, r, { heading }) => {
  for (let i = 0; i < 12; i += 1) {
    const a = (i / 12) * TAU
    disc(ctx, x + Math.cos(a) * r * 0.8, y + Math.sin(a) * r * 0.8, r * 0.32, '#f8fafc')
  }
  disc(ctx, x, y, r * 0.85, '#f8fafc')
  for (let i = 0; i < 12; i += 1) {
    const a = (i / 12) * TAU
    ctx.strokeStyle = '#e2e8f0'
    ctx.lineWidth = width(r, 0.04)
    ctx.beginPath()
    ctx.arc(x + Math.cos(a) * r * 0.8, y + Math.sin(a) * r * 0.8, r * 0.32, a - 1.2, a + 1.2)
    ctx.stroke()
  }
  face(ctx, x, y, r, heading, (ctx) => {
    for (const side of [-1, 1]) blob(ctx, side * r * 0.52, -r * 0.05, r * 0.22, r * 0.1, '#334155', side * 0.4)
    blob(ctx, 0, r * 0.1, r * 0.4, r * 0.5, '#334155')
    cuteEyes(ctx, r, 0.17, 0.05, 0.08)
    for (const side of [-1, 1]) disc(ctx, side * r * 0.17, -r * 0.05, r * 0.08, '#ffffff')
    for (const side of [-1, 1]) disc(ctx, side * r * 0.17, -r * 0.05, r * 0.05, '#111827')
    disc(ctx, -r * 0.08, r * 0.35, r * 0.03, '#94a3b8')
    disc(ctx, r * 0.08, r * 0.35, r * 0.03, '#94a3b8')
    disc(ctx, 0, -r * 0.4, r * 0.22, '#f8fafc')
  })
}

export const axolotl: Paint = (ctx, x, y, r, { t, heading }) => {
  for (const side of [-1, 1]) {
    for (let k = 0; k < 3; k += 1) {
      const a = side * (0.35 + k * 0.35) - Math.PI / 2 + side * Math.sin(t * 5 + k) * 0.08
      blob(ctx, x + Math.cos(a) * r * 1.1 + side * r * 0.2, y + Math.sin(a) * r * 1.0 + r * 0.25, r * 0.36, r * 0.11, '#e11d48', a)
    }
  }
  shaded(ctx, x, y, r, '#fecdd3', '#fb7185')
  face(ctx, x, y, r, heading, (ctx) => {
    cuteEyes(ctx, r, 0.42, 0.02, 0.09)
    disc(ctx, -r * 0.55, r * 0.22, r * 0.1, 'rgba(225,29,72,0.35)')
    disc(ctx, r * 0.55, r * 0.22, r * 0.1, 'rgba(225,29,72,0.35)')
    ctx.strokeStyle = '#9f1239'
    ctx.lineWidth = width(r, 0.04)
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.arc(0, r * 0.05, r * 0.3, 0.2 * Math.PI, 0.8 * Math.PI)
    ctx.stroke()
  })
  gloss(ctx, x, y, r, 0.4)
}

export const tiger: Paint = (ctx, x, y, r, { heading }) => {
  for (const side of [-1, 1]) {
    ctx.fillStyle = '#ea580c'
    ctx.beginPath()
    ctx.moveTo(x + side * r * 0.35, y - r * 0.85)
    ctx.lineTo(x + side * r * 0.92, y - r * 1.05)
    ctx.lineTo(x + side * r * 0.9, y - r * 0.4)
    ctx.fill()
    ctx.fillStyle = '#1c1917'
    ctx.beginPath()
    ctx.moveTo(x + side * r * 0.55, y - r * 0.82)
    ctx.lineTo(x + side * r * 0.86, y - r * 0.95)
    ctx.lineTo(x + side * r * 0.84, y - r * 0.6)
    ctx.fill()
  }
  shaded(ctx, x, y, r, '#fdba74', '#ea580c')
  inside(ctx, x, y, r, 0, (ctx) => {
    ctx.translate(heading * r * 0.1, 0)
    ctx.fillStyle = '#1c1917'
    for (const [sx, top, w, h] of [[0, -1, 0.09, 0.5], [-0.22, -1, 0.07, 0.36], [0.22, -1, 0.07, 0.36]] as const) {
      ctx.beginPath()
      ctx.moveTo((sx - w) * r, top * r)
      ctx.lineTo(sx * r, (top + h) * r)
      ctx.lineTo((sx + w) * r, top * r)
      ctx.fill()
    }
    for (const side of [-1, 1]) {
      for (const [sy, length] of [[-0.02, 0.36], [0.24, 0.3]] as const) {
        ctx.beginPath()
        ctx.moveTo(side * r, (sy - 0.07) * r)
        ctx.lineTo(side * r * (1 - length), sy * r)
        ctx.lineTo(side * r, (sy + 0.07) * r)
        ctx.fill()
      }
    }
    for (const side of [-1, 1]) {
      disc(ctx, side * r * 0.3, -r * 0.08, r * 0.15, '#facc15')
      blob(ctx, side * r * 0.3, -r * 0.08, r * 0.035, r * 0.11, '#111827')
      ctx.fillStyle = '#f97316'
      ctx.beginPath()
      ctx.moveTo(side * r * 0.1, -r * 0.3)
      ctx.lineTo(side * r * 0.5, -r * 0.3)
      ctx.lineTo(side * r * 0.5, -r * 0.14)
      ctx.lineTo(side * r * 0.1, -r * 0.03)
      ctx.fill()
      ctx.strokeStyle = '#1c1917'
      ctx.lineWidth = width(r, 0.08)
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(side * r * 0.1, -r * 0.03)
      ctx.lineTo(side * r * 0.5, -r * 0.17)
      ctx.stroke()
    }
    blob(ctx, -r * 0.2, r * 0.36, r * 0.24, r * 0.17, '#fff7ed')
    blob(ctx, r * 0.2, r * 0.36, r * 0.24, r * 0.17, '#fff7ed')
    blob(ctx, 0, r * 0.6, r * 0.26, r * 0.17, '#7f1d1d')
    ctx.fillStyle = '#ffffff'
    for (const side of [-1, 1]) {
      ctx.beginPath()
      ctx.moveTo(side * r * 0.2, r * 0.46)
      ctx.lineTo(side * r * 0.08, r * 0.46)
      ctx.lineTo(side * r * 0.14, r * 0.68)
      ctx.fill()
    }
    ctx.fillStyle = '#9d174d'
    ctx.beginPath()
    ctx.moveTo(-r * 0.13, r * 0.14)
    ctx.lineTo(r * 0.13, r * 0.14)
    ctx.lineTo(0, r * 0.3)
    ctx.fill()
  })
  gloss(ctx, x, y, r, 0.25)
}

export const walrus: Paint = (ctx, x, y, r, { heading }) => {
  shaded(ctx, x, y, r, '#c4a07a', '#8b6a4a')
  face(ctx, x, y, r, heading, (ctx) => {
    ctx.fillStyle = '#fffbeb'
    ctx.strokeStyle = '#d6d3d1'
    ctx.lineWidth = width(r, 0.03)
    for (const side of [-1, 1]) {
      ctx.beginPath()
      ctx.moveTo(side * r * 0.12, r * 0.4)
      ctx.lineTo(side * r * 0.28, r * 0.4)
      ctx.lineTo(side * r * 0.22, r * 1.15)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
    }
    disc(ctx, -r * 0.2, r * 0.3, r * 0.26, '#e7d3b8')
    disc(ctx, r * 0.2, r * 0.3, r * 0.26, '#e7d3b8')
    for (const side of [-1, 1]) for (let k = 0; k < 4; k += 1) disc(ctx, side * r * (0.12 + (k % 2) * 0.14), r * (0.24 + Math.floor(k / 2) * 0.12), r * 0.025, '#78350f')
    blob(ctx, 0, r * 0.08, r * 0.12, r * 0.08, '#3f2a14')
    cuteEyes(ctx, r, 0.3, 0.28, 0.08)
  })
  gloss(ctx, x, y, r, 0.25)
}

export const husky: Paint = (ctx, x, y, r, { heading }) => {
  for (const side of [-1, 1]) {
    ctx.fillStyle = '#475569'
    ctx.beginPath()
    ctx.moveTo(x + side * r * 0.2, y - r * 0.9)
    ctx.lineTo(x + side * r * 0.7, y - r * 1.35)
    ctx.lineTo(x + side * r * 0.85, y - r * 0.55)
    ctx.fill()
    ctx.fillStyle = '#f1f5f9'
    ctx.beginPath()
    ctx.moveTo(x + side * r * 0.38, y - r * 0.85)
    ctx.lineTo(x + side * r * 0.68, y - r * 1.12)
    ctx.lineTo(x + side * r * 0.75, y - r * 0.65)
    ctx.fill()
  }
  shaded(ctx, x, y, r, '#94a3b8', '#475569')
  inside(ctx, x, y, r, 0, (ctx) => {
    ctx.translate(heading * r * 0.1, 0)
    blob(ctx, 0, r * 0.55, r * 0.85, r * 0.7, '#f8fafc')
    blob(ctx, 0, -r * 0.35, r * 0.12, r * 0.45, '#f8fafc')
    for (const side of [-1, 1]) {
      blob(ctx, side * r * 0.32, -r * 0.08, r * 0.24, r * 0.2, '#f8fafc')
      disc(ctx, side * r * 0.32, -r * 0.08, r * 0.12, '#38bdf8')
      disc(ctx, side * r * 0.32, -r * 0.08, r * 0.06, '#0f172a')
      disc(ctx, side * r * 0.32 - r * 0.04, -r * 0.12, r * 0.03, '#ffffff')
    }
    blob(ctx, 0, r * 0.25, r * 0.14, r * 0.1, '#111827')
    ctx.strokeStyle = '#334155'
    ctx.lineWidth = width(r, 0.04)
    ctx.beginPath()
    ctx.moveTo(0, r * 0.33)
    ctx.lineTo(0, r * 0.42)
    ctx.stroke()
  })
  gloss(ctx, x, y, r, 0.25)
}

export const hamster: Paint = (ctx, x, y, r, { heading }) => {
  for (const side of [-1, 1]) {
    disc(ctx, x + side * r * 0.62, y - r * 0.78, r * 0.24, '#f59e0b')
    disc(ctx, x + side * r * 0.62, y - r * 0.78, r * 0.13, '#fbcfe8')
  }
  shaded(ctx, x, y, r, '#fdba74', '#ea8a2a')
  inside(ctx, x, y, r, 0, (ctx) => {
    ctx.translate(heading * r * 0.1, 0)
    blob(ctx, 0, r * 0.75, r * 0.9, r * 0.6, '#fff7ed')
    disc(ctx, -r * 0.45, r * 0.3, r * 0.34, '#fff7ed')
    disc(ctx, r * 0.45, r * 0.3, r * 0.34, '#fff7ed')
    cuteEyes(ctx, r, 0.3, 0.12, 0.11)
    disc(ctx, -r * 0.48, r * 0.2, r * 0.1, 'rgba(244,114,182,0.45)')
    disc(ctx, r * 0.48, r * 0.2, r * 0.1, 'rgba(244,114,182,0.45)')
    blob(ctx, 0, r * 0.12, r * 0.07, r * 0.05, '#ec4899')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(-r * 0.07, r * 0.2, r * 0.14, r * 0.12)
  })
}

export const duckling: Paint = (ctx, x, y, r, { heading }) => {
  ctx.strokeStyle = '#eab308'
  ctx.lineWidth = width(r, 0.07)
  ctx.lineCap = 'round'
  for (const lean of [-0.25, 0, 0.25]) {
    ctx.beginPath()
    ctx.moveTo(x + lean * r * 0.4, y - r * 0.95)
    ctx.quadraticCurveTo(x + lean * r * 1.2, y - r * 1.3, x + lean * r * 0.6 + r * 0.15, y - r * 1.35)
    ctx.stroke()
  }
  shaded(ctx, x, y, r, '#fef08a', '#facc15')
  face(ctx, x, y, r, heading, (ctx) => {
    cuteEyes(ctx, r, 0.3, 0.15, 0.11)
    disc(ctx, -r * 0.52, r * 0.15, r * 0.1, 'rgba(249,115,22,0.35)')
    disc(ctx, r * 0.52, r * 0.15, r * 0.1, 'rgba(249,115,22,0.35)')
    blob(ctx, 0, r * 0.22, r * 0.36, r * 0.13, '#f97316')
    blob(ctx, 0, r * 0.3, r * 0.3, r * 0.08, '#ea580c')
  })
  gloss(ctx, x, y, r, 0.35)
}

export const whale: Paint = (ctx, x, y, r, { t, heading }) => {
  const puff = (t * 1.2) % 1
  for (let i = 0; i < 5; i += 1) {
    const a = -Math.PI / 2 + (i - 2) * 0.35
    const d = r * (1.05 + puff * 0.7)
    disc(ctx, x + Math.cos(a) * d * 0.8, y - r * 0.75 + Math.sin(a) * d * 0.6, r * 0.11 * (1 - puff * 0.6), `rgba(56,189,248,${0.8 * (1 - puff)})`)
  }
  shaded(ctx, x, y, r, '#60a5fa', '#1d4ed8')
  inside(ctx, x, y, r, 0, (ctx) => {
    ctx.translate(heading * r * 0.1, 0)
    blob(ctx, 0, r * 0.95, r * 0.95, r * 0.55, '#dbeafe')
    ctx.strokeStyle = '#93c5fd'
    ctx.lineWidth = width(r, 0.04)
    for (let k = -2; k <= 2; k += 1) {
      ctx.beginPath()
      ctx.moveTo(k * r * 0.18, r * 0.5)
      ctx.lineTo(k * r * 0.2, r)
      ctx.stroke()
    }
    cuteEyes(ctx, r, 0.38, 0.05, 0.1)
    disc(ctx, -r * 0.55, r * 0.2, r * 0.1, 'rgba(244,114,182,0.45)')
    disc(ctx, r * 0.55, r * 0.2, r * 0.1, 'rgba(244,114,182,0.45)')
    ctx.strokeStyle = '#1e3a8a'
    ctx.lineWidth = width(r, 0.045)
    ctx.beginPath()
    ctx.arc(0, r * 0.05, r * 0.25, 0.2 * Math.PI, 0.8 * Math.PI)
    ctx.stroke()
  })
  gloss(ctx, x, y, r, 0.4)
}

export const unicorn: Paint = (ctx, x, y, r, { heading }) => {
  for (const side of [-1, 1]) {
    ctx.fillStyle = '#f1f5f9'
    ctx.beginPath()
    ctx.moveTo(x + side * r * 0.35, y - r * 0.85)
    ctx.lineTo(x + side * r * 0.75, y - r * 1.2)
    ctx.lineTo(x + side * r * 0.8, y - r * 0.6)
    ctx.fill()
  }
  const mane = ['#f9a8d4', '#c4b5fd', '#93c5fd', '#86efac', '#fde68a']
  mane.forEach((colour, i) => {
    const a = -Math.PI * 0.55 - i * 0.38
    disc(ctx, x + Math.cos(a) * r * 0.95, y + Math.sin(a) * r * 0.95, r * 0.3, colour)
  })
  shaded(ctx, x, y, r, '#ffffff', '#e2e8f0')
  ctx.fillStyle = '#facc15'
  ctx.beginPath()
  ctx.moveTo(x - r * 0.16, y - r * 0.82)
  ctx.lineTo(x + r * 0.16, y - r * 0.82)
  ctx.lineTo(x, y - r * 1.6)
  ctx.fill()
  ctx.strokeStyle = '#ca8a04'
  ctx.lineWidth = width(r, 0.04)
  for (let k = 1; k <= 3; k += 1) {
    const h = y - r * (0.82 + k * 0.18)
    const w = r * 0.16 * (1 - k * 0.22)
    ctx.beginPath()
    ctx.moveTo(x - w, h + r * 0.04)
    ctx.lineTo(x + w, h - r * 0.04)
    ctx.stroke()
  }
  face(ctx, x, y, r, heading, (ctx) => {
    cuteEyes(ctx, r, 0.3, 0.05, 0.13)
    ctx.strokeStyle = '#111827'
    ctx.lineWidth = width(r, 0.045)
    ctx.lineCap = 'round'
    for (const side of [-1, 1]) {
      for (const [from, to] of [[[0.38, -0.13], [0.5, -0.22]], [[0.42, -0.06], [0.55, -0.1]]] as const) {
        ctx.beginPath()
        ctx.moveTo(side * r * from[0], r * from[1])
        ctx.lineTo(side * r * to[0], r * to[1])
        ctx.stroke()
      }
    }
    disc(ctx, -r * 0.48, r * 0.22, r * 0.12, 'rgba(244,114,182,0.5)')
    disc(ctx, r * 0.48, r * 0.22, r * 0.12, 'rgba(244,114,182,0.5)')
    disc(ctx, -r * 0.1, r * 0.42, r * 0.04, '#f472b6')
    disc(ctx, r * 0.1, r * 0.42, r * 0.04, '#f472b6')
  })
}

export const shark: Paint = (ctx, x, y, r, { heading }) => {
  ctx.fillStyle = '#475569'
  ctx.beginPath()
  ctx.moveTo(x - r * 0.3, y - r * 0.85)
  ctx.quadraticCurveTo(x + r * 0.05, y - r * 1.35, x + r * 0.35, y - r * 1.55)
  ctx.quadraticCurveTo(x + r * 0.25, y - r * 1.1, x + r * 0.35, y - r * 0.85)
  ctx.fill()
  shaded(ctx, x, y, r, '#94a3b8', '#475569')
  inside(ctx, x, y, r, 0, (ctx) => {
    ctx.translate(heading * r * 0.1, 0)
    blob(ctx, 0, r * 0.85, r * 0.95, r * 0.6, '#f1f5f9')
    for (const side of [-1, 1]) {
      disc(ctx, side * r * 0.38, -r * 0.12, r * 0.1, '#0f172a')
      disc(ctx, side * r * 0.38 - r * 0.03, -r * 0.15, r * 0.035, '#ffffff')
    }
    blob(ctx, 0, r * 0.42, r * 0.5, r * 0.22, '#7f1d1d')
    ctx.fillStyle = '#ffffff'
    for (let k = -3; k <= 3; k += 1) {
      const tx = k * r * 0.13
      ctx.beginPath()
      ctx.moveTo(tx - r * 0.06, r * 0.3)
      ctx.lineTo(tx + r * 0.06, r * 0.3)
      ctx.lineTo(tx, r * 0.42)
      ctx.fill()
    }
    for (const side of [-1, 1]) {
      ctx.strokeStyle = '#334155'
      ctx.lineWidth = width(r, 0.035)
      for (let k = 0; k < 3; k += 1) {
        ctx.beginPath()
        ctx.moveTo(side * r * (0.72 + k * 0.08), r * 0.0)
        ctx.lineTo(side * r * (0.68 + k * 0.08), r * 0.25)
        ctx.stroke()
      }
    }
  })
  gloss(ctx, x, y, r, 0.3)
}

const spikes = (ctx: CanvasRenderingContext2D, x: number, y: number, r: number, from: number, to: number, count: number, out: number, colour: string): void => {
  ctx.fillStyle = colour
  ctx.beginPath()
  for (let i = 0; i <= count * 2; i += 1) {
    const a = from + (i / (count * 2)) * (to - from)
    const d = r * (i % 2 === 1 ? out : 0.95)
    if (i === 0) ctx.moveTo(x + Math.cos(a) * d, y + Math.sin(a) * d)
    else ctx.lineTo(x + Math.cos(a) * d, y + Math.sin(a) * d)
  }
  ctx.fill()
}

export const fox: Paint = (ctx, x, y, r, { heading }) => {
  for (const side of [-1, 1]) {
    tri(ctx, x + side * r * 0.2, y - r * 0.85, x + side * r * 0.8, y - r * 1.35, x + side * r * 0.92, y - r * 0.45, '#ea580c')
    tri(ctx, x + side * r * 0.42, y - r * 0.82, x + side * r * 0.76, y - r * 1.12, x + side * r * 0.82, y - r * 0.62, '#292524')
  }
  shaded(ctx, x, y, r, '#fb923c', '#c2410c')
  inside(ctx, x, y, r, 0, (ctx) => {
    ctx.translate(heading * r * 0.1, 0)
    ctx.fillStyle = '#fff7ed'
    ctx.beginPath()
    ctx.moveTo(-r * 1.1, -r * 0.05)
    ctx.quadraticCurveTo(-r * 0.3, r * 0.05, 0, r * 0.75)
    ctx.quadraticCurveTo(r * 0.3, r * 0.05, r * 1.1, -r * 0.05)
    ctx.lineTo(r * 1.1, r * 1.1)
    ctx.lineTo(-r * 1.1, r * 1.1)
    ctx.fill()
    cuteEyes(ctx, r, 0.32, 0.18, 0.1)
    blob(ctx, 0, r * 0.3, r * 0.12, r * 0.08, '#111827')
  })
  gloss(ctx, x, y, r, 0.25)
}

export const wolf: Paint = (ctx, x, y, r, { heading }) => {
  for (const side of [-1, 1]) {
    tri(ctx, x + side * r * 0.2, y - r * 0.9, x + side * r * 0.7, y - r * 1.4, x + side * r * 0.85, y - r * 0.55, '#374151')
    tri(ctx, x + side * r * 0.38, y - r * 0.86, x + side * r * 0.68, y - r * 1.15, x + side * r * 0.75, y - r * 0.65, '#9ca3af')
  }
  shaded(ctx, x, y, r, '#6b7280', '#1f2937')
  inside(ctx, x, y, r, 0, (ctx) => {
    ctx.translate(heading * r * 0.1, 0)
    ctx.fillStyle = '#d1d5db'
    ctx.beginPath()
    ctx.moveTo(-r * 0.6, r * 0.05)
    ctx.quadraticCurveTo(0, -r * 0.1, r * 0.6, r * 0.05)
    ctx.quadraticCurveTo(r * 0.4, r * 0.9, 0, r * 0.95)
    ctx.quadraticCurveTo(-r * 0.4, r * 0.9, -r * 0.6, r * 0.05)
    ctx.fill()
    for (const side of [-1, 1]) {
      disc(ctx, side * r * 0.32, -r * 0.18, r * 0.12, '#f59e0b')
      disc(ctx, side * r * 0.32, -r * 0.18, r * 0.06, '#111827')
      ctx.strokeStyle = '#111827'
      ctx.lineWidth = width(r, 0.05)
      ctx.beginPath()
      ctx.moveTo(side * r * 0.15, -r * 0.3)
      ctx.lineTo(side * r * 0.48, -r * 0.36)
      ctx.stroke()
    }
    blob(ctx, 0, r * 0.22, r * 0.13, r * 0.09, '#111827')
  })
  gloss(ctx, x, y, r, 0.2)
}

export const bear: Paint = (ctx, x, y, r, { heading }) => {
  for (const side of [-1, 1]) {
    disc(ctx, x + side * r * 0.68, y - r * 0.68, r * 0.3, '#78350f')
    disc(ctx, x + side * r * 0.68, y - r * 0.68, r * 0.16, '#d6a77a')
  }
  shaded(ctx, x, y, r, '#a16207', '#5b3a12')
  face(ctx, x, y, r, heading, (ctx) => {
    blob(ctx, 0, r * 0.32, r * 0.38, r * 0.28, '#d6a77a')
    cuteEyes(ctx, r, 0.32, 0.12, 0.1)
    blob(ctx, 0, r * 0.2, r * 0.13, r * 0.09, '#1c1917')
    smile(ctx, 0, r * 0.3, r * 0.1, '#1c1917', width(r, 0.035))
  })
  gloss(ctx, x, y, r, 0.25)
}

export const giraffe: Paint = (ctx, x, y, r, { heading }) => {
  ctx.strokeStyle = '#d97706'
  ctx.lineWidth = width(r, 0.1)
  ctx.lineCap = 'round'
  for (const side of [-1, 1]) {
    ctx.beginPath()
    ctx.moveTo(x + side * r * 0.25, y - r * 0.8)
    ctx.lineTo(x + side * r * 0.3, y - r * 1.3)
    ctx.stroke()
    disc(ctx, x + side * r * 0.3, y - r * 1.33, r * 0.12, '#78350f')
    blob(ctx, x + side * r * 0.95, y - r * 0.45, r * 0.3, r * 0.13, '#fbbf24', side * 0.4)
  }
  shaded(ctx, x, y, r, '#fde68a', '#f59e0b')
  inside(ctx, x, y, r, 0, (ctx) => {
    ctx.translate(heading * r * 0.1, 0)
    ctx.fillStyle = '#b45309'
    for (const [px, py, s] of [[-0.6, -0.55, 0.2], [0.55, -0.6, 0.18], [0, -0.85, 0.15], [-0.8, 0.2, 0.17], [0.82, 0.15, 0.18]] as const) {
      polygon(ctx, px * r, py * r, s * r, 5, hash(px, py) * 3)
      ctx.fill()
    }
    blob(ctx, 0, r * 0.55, r * 0.45, r * 0.35, '#fef3c7')
    disc(ctx, -r * 0.12, r * 0.5, r * 0.05, '#92400e')
    disc(ctx, r * 0.12, r * 0.5, r * 0.05, '#92400e')
    cuteEyes(ctx, r, 0.3, 0.12, 0.11)
    ctx.strokeStyle = '#111827'
    ctx.lineWidth = width(r, 0.035)
    for (const side of [-1, 1]) {
      ctx.beginPath()
      ctx.moveTo(side * r * 0.4, -r * 0.2)
      ctx.lineTo(side * r * 0.5, -r * 0.28)
      ctx.stroke()
    }
  })
  gloss(ctx, x, y, r, 0.25)
}

export const zebra: Paint = (ctx, x, y, r, { heading }) => {
  spikes(ctx, x, y, r, -Math.PI * 0.7, -Math.PI * 0.3, 5, 1.25, '#111827')
  for (const side of [-1, 1]) {
    tri(ctx, x + side * r * 0.45, y - r * 0.8, x + side * r * 1.0, y - r * 1.05, x + side * r * 0.85, y - r * 0.45, '#f8fafc')
    tri(ctx, x + side * r * 0.8, y - r * 0.95, x + side * r * 1.0, y - r * 1.05, x + side * r * 0.92, y - r * 0.8, '#111827')
  }
  shaded(ctx, x, y, r, '#ffffff', '#d1d5db')
  inside(ctx, x, y, r, 0, (ctx) => {
    ctx.translate(heading * r * 0.1, 0)
    ctx.strokeStyle = '#111827'
    ctx.lineCap = 'round'
    for (let i = -3; i <= 3; i += 1) {
      ctx.lineWidth = width(r, 0.12)
      ctx.beginPath()
      ctx.moveTo(-r * 1.1, i * r * 0.28 - r * 0.2)
      ctx.quadraticCurveTo(-r * 0.6, i * r * 0.28, -r * 0.35, i * r * 0.28 - r * 0.1)
      ctx.moveTo(r * 1.1, i * r * 0.28 - r * 0.2)
      ctx.quadraticCurveTo(r * 0.6, i * r * 0.28, r * 0.35, i * r * 0.28 - r * 0.1)
      ctx.stroke()
    }
    blob(ctx, 0, r * 0.6, r * 0.45, r * 0.32, '#374151')
    disc(ctx, -r * 0.15, r * 0.55, r * 0.06, '#111827')
    disc(ctx, r * 0.15, r * 0.55, r * 0.06, '#111827')
    for (const side of [-1, 1]) disc(ctx, side * r * 0.3, -r * 0.1, r * 0.16, '#ffffff')
    cuteEyes(ctx, r, 0.3, 0.1, 0.1)
  })
}

export const hippo: Paint = (ctx, x, y, r, { heading }) => {
  for (const side of [-1, 1]) {
    disc(ctx, x + side * r * 0.55, y - r * 0.85, r * 0.18, '#7c6fa6')
    disc(ctx, x + side * r * 0.55, y - r * 0.85, r * 0.09, '#f9a8d4')
  }
  shaded(ctx, x, y, r, '#b8afd6', '#6d6491')
  face(ctx, x, y, r, heading, (ctx) => {
    blob(ctx, 0, r * 0.4, r * 0.75, r * 0.45, '#d4cdeb')
    blob(ctx, -r * 0.25, r * 0.25, r * 0.08, r * 0.1, '#4c4373')
    blob(ctx, r * 0.25, r * 0.25, r * 0.08, r * 0.1, '#4c4373')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(-r * 0.22, r * 0.68, r * 0.1, r * 0.12)
    ctx.fillRect(r * 0.12, r * 0.68, r * 0.1, r * 0.12)
    cuteEyes(ctx, r, 0.3, 0.38, 0.09)
    cheeks(ctx, r, 0.6, 0.0)
  })
  gloss(ctx, x, y, r, 0.3)
}

export const otter: Paint = (ctx, x, y, r, { heading }) => {
  for (const side of [-1, 1]) disc(ctx, x + side * r * 0.75, y - r * 0.55, r * 0.18, '#78350f')
  shaded(ctx, x, y, r, '#92400e', '#57300c')
  face(ctx, x, y, r, heading, (ctx) => {
    blob(ctx, 0, r * 0.35, r * 0.6, r * 0.45, '#f5deb3')
    disc(ctx, -r * 0.14, r * 0.38, r * 0.17, '#fdf4e3')
    disc(ctx, r * 0.14, r * 0.38, r * 0.17, '#fdf4e3')
    cuteEyes(ctx, r, 0.3, 0.15, 0.1)
    blob(ctx, 0, r * 0.22, r * 0.12, r * 0.08, '#292524')
    for (const side of [-1, 1]) for (let k = 0; k < 3; k += 1) disc(ctx, side * r * (0.12 + (k % 2) * 0.08), r * (0.36 + k * 0.05), r * 0.02, '#92400e')
  })
  gloss(ctx, x, y, r, 0.25)
}

export const babyDragon: Paint = (ctx, x, y, r, { t, heading }) => {
  for (const side of [-1, 1]) {
    ctx.fillStyle = '#7c3aed'
    ctx.beginPath()
    ctx.moveTo(x + side * r * 0.6, y - r * 0.2)
    ctx.lineTo(x + side * r * 1.5, y - r * 0.9)
    ctx.lineTo(x + side * r * 1.35, y - r * 0.3)
    ctx.lineTo(x + side * r * 1.55, y)
    ctx.lineTo(x + side * r * 0.8, y + r * 0.3)
    ctx.fill()
    tri(ctx, x + side * r * 0.3, y - r * 0.85, x + side * r * 0.55, y - r * 1.35, x + side * r * 0.62, y - r * 0.75, '#fbbf24')
  }
  shaded(ctx, x, y, r, '#c4b5fd', '#6d28d9')
  face(ctx, x, y, r, heading, (ctx) => {
    blob(ctx, 0, r * 0.6, r * 0.55, r * 0.35, '#ddd6fe')
    cuteEyes(ctx, r, 0.3, 0.15, 0.13)
    cheeks(ctx, r, 0.55, 0.15)
    disc(ctx, -r * 0.1, r * 0.35, r * 0.03, '#4c1d95')
    disc(ctx, r * 0.1, r * 0.35, r * 0.03, '#4c1d95')
    smile(ctx, 0, r * 0.4, r * 0.15, '#4c1d95', width(r, 0.04))
  })
  const breath = (t * 0.7) % 1
  if (breath < 0.4) {
    const u = breath / 0.4
    for (let k = 0; k < 4; k += 1) {
      const d = r * (1 + u * 1.2 + k * 0.15)
      disc(ctx, x + heading * r * 0.3, y + d, r * (0.25 - k * 0.04) * (1 - u * 0.5), ['#facc15', '#fb923c', '#f97316', '#ef4444'][k] ?? '#f97316')
    }
  }
}

export const dino: Paint = (ctx, x, y, r, { heading }) => {
  for (const [angle, height] of [[-0.61, 0.26], [-0.5, 0.36], [-0.39, 0.26]] as const) {
    const a = angle * Math.PI
    const spread = 0.17
    const tipX = x + Math.cos(a) * r * (0.95 + height)
    const tipY = y + Math.sin(a) * r * (0.95 + height)
    const leftX = x + Math.cos(a - spread) * r * 0.9
    const leftY = y + Math.sin(a - spread) * r * 0.9
    const rightX = x + Math.cos(a + spread) * r * 0.9
    const rightY = y + Math.sin(a + spread) * r * 0.9
    const plate = ctx.createLinearGradient(x + Math.cos(a) * r, y + Math.sin(a) * r, tipX, tipY)
    plate.addColorStop(0, '#f59e0b')
    plate.addColorStop(1, '#fde047')
    ctx.fillStyle = plate
    ctx.beginPath()
    ctx.moveTo(leftX, leftY)
    ctx.lineTo(leftX + (tipX - leftX) * 0.75, leftY + (tipY - leftY) * 0.75)
    ctx.quadraticCurveTo(tipX, tipY, rightX + (tipX - rightX) * 0.75, rightY + (tipY - rightY) * 0.75)
    ctx.lineTo(rightX, rightY)
    ctx.fill()
  }
  shaded(ctx, x, y, r, '#86efac', '#15803d')
  inside(ctx, x, y, r, 0, (ctx) => {
    ctx.translate(heading * r * 0.1, 0)
    blob(ctx, -r * 0.62, -r * 0.48, r * 0.13, r * 0.1, 'rgba(20,83,45,0.3)', -0.5)
    blob(ctx, -r * 0.4, -r * 0.7, r * 0.08, r * 0.06, 'rgba(20,83,45,0.3)', -0.3)
    blob(ctx, r * 0.68, -r * 0.38, r * 0.1, r * 0.08, 'rgba(20,83,45,0.3)', 0.5)
    const snout = ctx.createRadialGradient(-r * 0.1, r * 0.25, r * 0.05, 0, r * 0.4, r * 0.6)
    snout.addColorStop(0, '#fefce8')
    snout.addColorStop(1, '#d9f99d')
    ctx.fillStyle = snout
    ctx.beginPath()
    ctx.ellipse(0, r * 0.42, r * 0.62, r * 0.4, 0, 0, TAU)
    ctx.fill()
    cuteEyes(ctx, r, 0.32, 0.18, 0.12)
    cheeks(ctx, r, 0.44, 0.36, 'rgba(251,113,133,0.45)')
    blob(ctx, -r * 0.13, r * 0.24, r * 0.05, r * 0.035, '#365314')
    blob(ctx, r * 0.13, r * 0.24, r * 0.05, r * 0.035, '#365314')
    smile(ctx, 0, r * 0.3, r * 0.26, '#365314', width(r, 0.05))
    tri(ctx, r * 0.06, r * 0.53, r * 0.17, r * 0.5, r * 0.12, r * 0.61, '#ffffff')
  })
  rim(ctx, x, y, r, 'rgba(20,83,45,0.45)', 0.05)
  gloss(ctx, x, y, r, 0.25)
}

export const snowLeopard: Paint = (ctx, x, y, r, { t, heading }) => {
  for (const side of [-1, 1]) {
    disc(ctx, x + side * r * 0.62, y - r * 0.72, r * 0.25, '#cbd5e1')
    disc(ctx, x + side * r * 0.62, y - r * 0.7, r * 0.13, '#94a3b8')
  }
  shaded(ctx, x, y, r, '#f8fafc', '#cbd5e1')
  inside(ctx, x, y, r, 0, (ctx) => {
    ctx.translate(heading * r * 0.1, 0)
    for (let i = 0; i < 12; i += 1) {
      const sx = (hash(i) - 0.5) * r * 1.9
      const sy = (hash(i, 1) - 0.5) * r * 1.9
      if (Math.hypot(sx, sy * 1.4) < r * 0.6) continue
      ring(ctx, sx, sy, r * 0.12, '#475569', width(r, 0.05))
      disc(ctx, sx, sy, r * 0.05, '#94a3b8')
    }
    const blink = (t % 4) < 0.12
    for (const side of [-1, 1]) {
      if (blink) blob(ctx, side * r * 0.3, -r * 0.1, r * 0.13, r * 0.03, '#334155')
      else {
        blob(ctx, side * r * 0.3, -r * 0.1, r * 0.14, r * 0.12, '#7dd3fc')
        blob(ctx, side * r * 0.3, -r * 0.1, r * 0.04, r * 0.1, '#0f172a')
        disc(ctx, side * r * 0.3 - r * 0.05, -r * 0.14, r * 0.03, '#ffffff')
      }
    }
    tri(ctx, -r * 0.1, r * 0.12, r * 0.1, r * 0.12, 0, r * 0.24, '#f9a8d4')
    stroke(ctx, '#475569', width(r, 0.035))
    ctx.beginPath()
    ctx.arc(-r * 0.08, r * 0.28, r * 0.08, 0, Math.PI)
    ctx.arc(r * 0.08, r * 0.28, r * 0.08, Math.PI, 0, true)
    ctx.stroke()
  })
  gloss(ctx, x, y, r, 0.3)
}
