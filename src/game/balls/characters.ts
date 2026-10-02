import { blob, cheeks, circle, cuteEyes, disc, face, gloss, inside, rim, shaded, smile, stroke, TAU, tri, width } from './kit.ts'
import type { Paint } from '../skins.ts'

export const robot: Paint = (ctx, x, y, r, { t, heading }) => {
  stroke(ctx, '#64748b', width(r, 0.07))
  ctx.beginPath()
  ctx.moveTo(x, y - r * 0.9)
  ctx.lineTo(x, y - r * 1.3)
  ctx.stroke()
  disc(ctx, x, y - r * 1.35, r * 0.13, (t % 1) < 0.5 ? '#ef4444' : '#7f1d1d')
  shaded(ctx, x, y, r, '#e2e8f0', '#64748b')
  face(ctx, x, y, r, heading, (ctx) => {
    ctx.fillStyle = '#0f172a'
    ctx.beginPath()
    ctx.roundRect(-r * 0.62, -r * 0.4, r * 1.24, r * 0.55, r * 0.15)
    ctx.fill()
    const scan = Math.sin(t * 2) * r * 0.06
    const blink = (t % 3) < 0.12 ? 0.03 : 0.16
    for (const side of [-1, 1]) {
      ctx.fillStyle = '#22d3ee'
      ctx.fillRect(side * r * 0.3 - r * 0.1 + scan, -r * 0.12 - r * blink * 0.5, r * 0.2, r * blink)
    }
    stroke(ctx, '#475569', width(r, 0.04))
    for (let k = -2; k <= 2; k += 1) {
      ctx.beginPath()
      ctx.moveTo(k * r * 0.12, r * 0.35)
      ctx.lineTo(k * r * 0.12, r * 0.55)
      ctx.stroke()
    }
  })
  for (const side of [-1, 1]) disc(ctx, x + side * r * 0.8, y + r * 0.35, r * 0.06, '#475569')
  gloss(ctx, x, y, r, 0.4)
}

export const ghost: Paint = (ctx, x, y, r, { t, heading }) => {
  const bob = Math.sin(t * 3) * r * 0.06
  ctx.globalAlpha = 0.95
  shaded(ctx, x, y + bob, r, '#ffffff', '#cbd5e1')
  ctx.globalAlpha = 1
  face(ctx, x, y + bob, r, heading, (ctx) => {
    blob(ctx, -r * 0.28, -r * 0.15, r * 0.13, r * 0.2, '#1e293b')
    blob(ctx, r * 0.28, -r * 0.15, r * 0.13, r * 0.2, '#1e293b')
    disc(ctx, -r * 0.31, -r * 0.22, r * 0.04, '#ffffff')
    disc(ctx, r * 0.25, -r * 0.22, r * 0.04, '#ffffff')
    blob(ctx, 0, r * 0.32, r * 0.12, r * 0.16, '#1e293b')
    cheeks(ctx, r, 0.5, 0.12)
  })
}

export const ninja: Paint = (ctx, x, y, r, { t, heading }) => {
  const flow = Math.sin(t * 9) * 0.2
  for (const k of [0, 1]) blob(ctx, x - Math.sign(heading || 1) * r * 1.05, y - r * (0.5 - k * 0.15), r * 0.35, r * 0.08, '#dc2626', Math.sign(heading || 1) * (0.25 + k * 0.35) + flow * (k ? -1 : 1))
  shaded(ctx, x, y, r, '#374151', '#030712')
  inside(ctx, x, y, r, 0, (ctx) => {
    ctx.fillStyle = '#dc2626'
    ctx.fillRect(-r, -r * 0.62, r * 2, r * 0.16)
  })
  face(ctx, x, y, r, heading, (ctx) => {
    ctx.fillStyle = '#fde0c2'
    ctx.beginPath()
    ctx.roundRect(-r * 0.7, -r * 0.35, r * 1.4, r * 0.38, r * 0.15)
    ctx.fill()
    for (const side of [-1, 1]) {
      disc(ctx, side * r * 0.3, -r * 0.14, r * 0.09, '#111827')
      stroke(ctx, '#111827', width(r, 0.06))
      ctx.beginPath()
      ctx.moveTo(side * r * 0.12, -r * 0.24)
      ctx.lineTo(side * r * 0.48, -r * 0.32)
      ctx.stroke()
    }
  })
  gloss(ctx, x, y, r, 0.25)
}

export const scaredy: Paint = (ctx, x, y, r, { t, heading, fright }) => {
  const sx = x + Math.sin(t * 70) * r * 0.05 * fright
  shaded(ctx, sx, y, r, '#a5f3fc', '#0891b2')
  face(ctx, sx, y, r, heading, (ctx) => {
    if (fright > 0.3) {
      for (const side of [-1, 1]) {
        disc(ctx, side * r * 0.3, -r * 0.15, r * (0.12 + fright * 0.1), '#ffffff')
        disc(ctx, side * r * 0.3, -r * 0.15, r * 0.06, '#111827')
      }
      blob(ctx, 0, r * 0.35, r * 0.12, r * 0.12 + fright * r * 0.08, '#164e63')
      blob(ctx, r * 0.6, -r * 0.5, r * 0.08, r * 0.12, '#38bdf8')
    } else {
      cuteEyes(ctx, r, 0.3, 0.15, 0.1)
      smile(ctx, 0, r * 0.15, r * 0.25, '#164e63', width(r, 0.06))
    }
  })
  gloss(ctx, sx, y, r, 0.35)
}

export const jackOLantern: Paint = (ctx, x, y, r, { t, heading }) => {
  stroke(ctx, '#4d7c0f', width(r, 0.16))
  ctx.beginPath()
  ctx.moveTo(x, y - r * 0.85)
  ctx.quadraticCurveTo(x + r * 0.05, y - r * 1.15, x + r * 0.25, y - r * 1.2)
  ctx.stroke()
  shaded(ctx, x, y, r, '#fdba74', '#c2410c')
  stroke(ctx, 'rgba(154,52,18,0.45)', width(r, 0.05))
  for (const k of [-0.55, 0, 0.55]) {
    ctx.beginPath()
    ctx.ellipse(x, y, r * Math.abs(k) + r * 0.08, r * 0.98, 0, 0, TAU)
    ctx.stroke()
  }
  const glow = `rgba(253,224,71,${0.75 + 0.25 * Math.sin(t * 17) * Math.sin(t * 7)})`
  face(ctx, x, y, r, heading, (ctx) => {
    for (const side of [-1, 1]) tri(ctx, side * r * 0.45, -r * 0.0, side * r * 0.15, -r * 0.0, side * r * 0.3, -r * 0.32, glow)
    ctx.fillStyle = glow
    ctx.beginPath()
    ctx.moveTo(-r * 0.55, r * 0.22)
    for (let k = 0; k <= 6; k += 1) ctx.lineTo(-r * 0.55 + k * r * 0.183, r * (k % 2 === 0 ? 0.22 : 0.34))
    ctx.quadraticCurveTo(0, r * 0.85, -r * 0.55, r * 0.22)
    ctx.fill()
  })
}

export const santa: Paint = (ctx, x, y, r, { heading }) => {
  shaded(ctx, x, y, r, '#fde4cc', '#e8a97a')
  inside(ctx, x, y, r, 0, (ctx) => {
    ctx.translate(heading * r * 0.1, 0)
    const hat = ctx.createLinearGradient(0, -r, 0, -r * 0.35)
    hat.addColorStop(0, '#ef4444')
    hat.addColorStop(1, '#b91c1c')
    ctx.fillStyle = hat
    ctx.fillRect(-r * 1.2, -r * 1.2, r * 2.4, r * 0.8)
    const beard = ctx.createRadialGradient(-r * 0.25, r * 0.2, r * 0.1, 0, r * 0.5, r * 1.1)
    beard.addColorStop(0, '#ffffff')
    beard.addColorStop(1, '#d5dde8')
    ctx.fillStyle = beard
    ctx.beginPath()
    ctx.ellipse(0, r * 0.72, r * 1.25, r * 0.62, 0, 0, TAU)
    ctx.fill()
    for (const side of [-1, 1]) {
      circle(ctx, side * r * 0.88, -r * 0.18, r * 0.25)
      ctx.fill()
      circle(ctx, side * r * 0.74, r * 0.14, r * 0.26)
      ctx.fill()
    }
    cuteEyes(ctx, r, 0.27, 0.12, 0.085)
    cheeks(ctx, r, 0.45, 0.04, 'rgba(244,63,94,0.3)')
    for (const side of [-1, 1]) {
      blob(ctx, side * r * 0.18, r * 0.2, r * 0.21, r * 0.11, '#ffffff', -side * 0.3)
      ctx.strokeStyle = 'rgba(148,163,184,0.6)'
      ctx.lineWidth = width(r, 0.025)
      ctx.stroke()
    }
    shaded(ctx, 0, r * 0.07, r * 0.11, '#fca5a5', '#e11d48')
    stroke(ctx, '#e2e8f0', r * 0.24)
    ctx.beginPath()
    ctx.moveTo(-r * 1.1, -r * 0.44)
    ctx.quadraticCurveTo(0, -r * 0.3, r * 1.1, -r * 0.44)
    ctx.stroke()
    stroke(ctx, '#ffffff', r * 0.18)
    ctx.beginPath()
    ctx.moveTo(-r * 1.1, -r * 0.47)
    ctx.quadraticCurveTo(0, -r * 0.33, r * 1.1, -r * 0.47)
    ctx.stroke()
  })
  rim(ctx, x, y, r, 'rgba(100,116,139,0.45)', 0.05)
  const tip = ctx.createLinearGradient(x, y - r * 1.2, x + r, y - r * 0.7)
  tip.addColorStop(0, '#ef4444')
  tip.addColorStop(1, '#c81e1e')
  ctx.fillStyle = tip
  ctx.beginPath()
  ctx.moveTo(x - r * 0.35, y - r * 0.92)
  ctx.quadraticCurveTo(x + r * 0.55, y - r * 1.35, x + r * 1.08, y - r * 0.72)
  ctx.quadraticCurveTo(x + r * 0.62, y - r * 0.9, x + r * 0.6, y - r * 0.78)
  ctx.closePath()
  ctx.fill()
  shaded(ctx, x + r * 1.08, y - r * 0.68, r * 0.2, '#ffffff', '#cbd5e1')
}
