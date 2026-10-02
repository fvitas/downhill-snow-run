import { blob, circle, disc, gloss, hash, hsl, inside, local, polygon, rim, ring, shaded, star, stroke, TAU, tri, width } from './kit.ts'
import type { Paint } from '../skins.ts'

export const snowGlobe: Paint = (ctx, x, y, r, { t }) => {
  shaded(ctx, x, y, r, '#e0f2fe', '#7dd3fc')
  inside(ctx, x, y, r, 0, (ctx) => {
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.ellipse(0, r * 0.75, r * 1.1, r * 0.45, 0, 0, TAU)
    ctx.fill()
    ctx.fillStyle = '#166534'
    for (let k = 0; k < 3; k += 1) {
      const top = -r * 0.5 + k * r * 0.28
      ctx.beginPath()
      ctx.moveTo(0, top)
      ctx.lineTo(r * (0.2 + k * 0.1), top + r * 0.35)
      ctx.lineTo(-r * (0.2 + k * 0.1), top + r * 0.35)
      ctx.fill()
    }
    disc(ctx, 0, -r * 0.52, r * 0.07, '#facc15')
    for (let i = 0; i < 14; i += 1) {
      const fall = (hash(i) + t * (0.12 + hash(i, 2) * 0.1)) % 1
      const fx = (hash(i, 1) - 0.5) * r * 1.7 + Math.sin(t * 2 + i) * r * 0.06
      disc(ctx, fx, -r + fall * r * 1.8, Math.max(0.5, r * 0.045), '#ffffff')
    }
  })
  rim(ctx, x, y, r, 'rgba(14,116,144,0.45)', 0.08)
  gloss(ctx, x, y, r, 0.8)
}

export const cocoa: Paint = (ctx, x, y, r, { spin }) => {
  disc(ctx, x, y, r, '#f8fafc')
  shaded(ctx, x, y, r * 0.8, '#a16207', '#5b3417')
  inside(ctx, x, y, r * 0.8, spin * 0.3, (ctx) => {
    for (const [mx, my, a] of [[-0.3, -0.2, 0.4], [0.25, -0.1, -0.3], [0, 0.3, 0.9]] as const) {
      ctx.save()
      ctx.translate(mx * r, my * r)
      ctx.rotate(a)
      ctx.fillStyle = '#fff7ed'
      ctx.beginPath()
      ctx.roundRect(-r * 0.15, -r * 0.15, r * 0.3, r * 0.3, r * 0.08)
      ctx.fill()
      ctx.restore()
    }
  })
  rim(ctx, x, y, r, '#cbd5e1', 0.08)
  gloss(ctx, x, y, r, 0.35)
}

export const pinecone: Paint = (ctx, x, y, r, { spin }) => {
  disc(ctx, x, y, r, '#78350f')
  inside(ctx, x, y, r, spin, (ctx) => {
    ctx.fillStyle = '#a16207'
    ctx.strokeStyle = '#451a03'
    ctx.lineWidth = width(r, 0.05)
    for (let row = -3; row <= 3; row += 1) {
      for (let col = -3; col <= 3; col += 1) {
        const sx = (col + (row % 2 === 0 ? 0 : 0.5)) * r * 0.42
        const sy = row * r * 0.3
        ctx.beginPath()
        ctx.ellipse(sx, sy, r * 0.22, r * 0.17, 0, 0, Math.PI)
        ctx.fill()
        ctx.stroke()
      }
    }
  })
  rim(ctx, x, y, r, '#451a03', 0.1)
  gloss(ctx, x, y, r, 0.2)
}

export const crackedIce: Paint = (ctx, x, y, r, { spin }) => {
  shaded(ctx, x, y, r, '#f0f9ff', '#93c5fd')
  inside(ctx, x, y, r, spin, (ctx) => {
    ctx.strokeStyle = 'rgba(255,255,255,0.95)'
    ctx.lineWidth = width(r, 0.05)
    ctx.lineJoin = 'round'
    for (let k = 0; k < 5; k += 1) {
      let a = (k / 5) * TAU + hash(k) * 0.6
      let px = r * 0.08
      let py = 0
      ctx.beginPath()
      ctx.moveTo(0, 0)
      for (let step = 0; step < 4; step += 1) {
        a += (hash(k, step) - 0.5) * 0.9
        px += Math.cos(a) * r * 0.32
        py += Math.sin(a) * r * 0.32
        ctx.lineTo(px, py)
      }
      ctx.stroke()
    }
    ctx.strokeStyle = 'rgba(30,64,175,0.25)'
    ctx.lineWidth = width(r, 0.025)
    ctx.stroke()
  })
  rim(ctx, x, y, r, '#60a5fa', 0.1)
  gloss(ctx, x, y, r, 0.9)
}

export const kiwi: Paint = (ctx, x, y, r, { spin }) => {
  disc(ctx, x, y, r, '#78350f')
  disc(ctx, x, y, r * 0.88, '#65a30d')
  local(ctx, x, y, spin, (ctx) => {
    for (let i = 0; i < 24; i += 1) {
      const a = (i / 24) * TAU
      ctx.strokeStyle = 'rgba(217,249,157,0.6)'
      ctx.lineWidth = width(r, 0.04)
      ctx.beginPath()
      ctx.moveTo(Math.cos(a) * r * 0.3, Math.sin(a) * r * 0.3)
      ctx.lineTo(Math.cos(a) * r * 0.8, Math.sin(a) * r * 0.8)
      ctx.stroke()
    }
    disc(ctx, 0, 0, r * 0.3, '#ecfccb')
    for (let i = 0; i < 14; i += 1) {
      const a = (i / 14) * TAU
      ctx.fillStyle = '#111827'
      ctx.beginPath()
      ctx.ellipse(Math.cos(a) * r * 0.42, Math.sin(a) * r * 0.42, r * 0.06, r * 0.03, a, 0, TAU)
      ctx.fill()
    }
  })
  gloss(ctx, x, y, r, 0.35)
}

export const strawberry: Paint = (ctx, x, y, r) => {
  shaded(ctx, x, y, r, '#fb7185', '#be123c')
  inside(ctx, x, y, r, 0, (ctx) => {
    ctx.fillStyle = '#fde68a'
    for (let row = -4; row <= 4; row += 1) {
      for (let col = -4; col <= 4; col += 1) {
        const sx = (col + (row % 2 === 0 ? 0 : 0.5)) * r * 0.42
        const sy = row * r * 0.36
        ctx.beginPath()
        ctx.ellipse(sx, sy, r * 0.05, r * 0.08, 0, 0, TAU)
        ctx.fill()
      }
    }
  })
  local(ctx, x, y, 0, (ctx) => {
    ctx.fillStyle = '#16a34a'
    for (let i = 0; i < 5; i += 1) {
      const a = -Math.PI / 2 + (i - 2) * 0.55
      ctx.beginPath()
      ctx.ellipse(Math.cos(a) * r * 0.9, Math.sin(a) * r * 0.9, r * 0.32, r * 0.13, a, 0, TAU)
      ctx.fill()
    }
  })
  gloss(ctx, x, y, r, 0.5)
}

export const avocado: Paint = (ctx, x, y, r, { spin }) => {
  disc(ctx, x, y, r, '#365314')
  shaded(ctx, x, y, r * 0.86, '#ecfccb', '#a3e635')
  local(ctx, x, y, spin, (ctx) => {
    shaded(ctx, r * 0.05, r * 0.1, r * 0.4, '#b45309', '#78350f')
    disc(ctx, -r * 0.06, -r * 0.02, r * 0.1, 'rgba(255,255,255,0.35)')
  })
}

export const cupcake: Paint = (ctx, x, y, r) => {
  disc(ctx, x, y, r, '#d97706')
  local(ctx, x, y, 0, (ctx) => {
    for (let k = 0; k < 4; k += 1) disc(ctx, 0, 0, r * (0.9 - k * 0.2), k % 2 === 0 ? '#f9a8d4' : '#fbcfe8')
    for (let i = 0; i < 14; i += 1) {
      const a = hash(i) * TAU
      const d = r * (0.25 + hash(i, 1) * 0.6)
      ctx.save()
      ctx.translate(Math.cos(a) * d, Math.sin(a) * d)
      ctx.rotate(hash(i, 2) * TAU)
      ctx.fillStyle = ['#ef4444', '#3b82f6', '#22c55e', '#facc15', '#a855f7'][i % 5] ?? '#ef4444'
      ctx.fillRect(-r * 0.08, -r * 0.025, r * 0.16, r * 0.05)
      ctx.restore()
    }
  })
  disc(ctx, x, y, r * 0.2, '#dc2626')
  disc(ctx, x - r * 0.06, y - r * 0.06, r * 0.06, 'rgba(255,255,255,0.7)')
}

export const golf: Paint = (ctx, x, y, r, { spin }) => {
  shaded(ctx, x, y, r, '#ffffff', '#e2e8f0')
  inside(ctx, x, y, r, spin, (ctx) => {
    ctx.fillStyle = 'rgba(100,116,139,0.28)'
    for (let row = -5; row <= 5; row += 1) {
      for (let col = -5; col <= 5; col += 1) {
        const sx = (col + (row % 2 === 0 ? 0 : 0.5)) * r * 0.3
        const sy = row * r * 0.26
        const edge = Math.hypot(sx, sy) / r
        if (edge > 1) continue
        ctx.beginPath()
        ctx.ellipse(sx, sy, r * 0.08 * (1 - edge * 0.4), r * 0.08 * (1 - edge * 0.4), 0, 0, TAU)
        ctx.fill()
      }
    }
  })
  rim(ctx, x, y, r, '#cbd5e1', 0.06)
  gloss(ctx, x, y, r, 0.6)
}

export const beachBall: Paint = (ctx, x, y, r, { spin }) => {
  const colours = ['#ef4444', '#ffffff', '#facc15', '#ffffff', '#3b82f6', '#ffffff']
  local(ctx, x, y, spin, (ctx) => {
    colours.forEach((colour, i) => {
      ctx.fillStyle = colour
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.arc(0, 0, r, (i / colours.length) * TAU, ((i + 1) / colours.length) * TAU)
      ctx.fill()
    })
    disc(ctx, 0, 0, r * 0.2, '#ffffff')
  })
  rim(ctx, x, y, r, 'rgba(15,23,42,0.18)', 0.06)
  gloss(ctx, x, y, r, 0.5)
}

export const pokerChip: Paint = (ctx, x, y, r, { spin }) => {
  disc(ctx, x, y, r, '#dc2626')
  local(ctx, x, y, spin, (ctx) => {
    ctx.fillStyle = '#ffffff'
    for (let i = 0; i < 8; i += 1) {
      ctx.save()
      ctx.rotate((i / 8) * TAU)
      ctx.fillRect(r * 0.72, -r * 0.13, r * 0.3, r * 0.26)
      ctx.restore()
    }
    ring(ctx, 0, 0, r * 0.6, '#ffffff', width(r, 0.05))
    ctx.setLineDash([r * 0.12, r * 0.1])
    ring(ctx, 0, 0, r * 0.48, 'rgba(255,255,255,0.7)', width(r, 0.04))
    ctx.setLineDash([])
  })
  rim(ctx, x, y, r, '#991b1b', 0.06)
  gloss(ctx, x, y, r, 0.3)
}

export const goldCoin: Paint = (ctx, x, y, r, { spin }) => {
  shaded(ctx, x, y, r, '#fef08a', '#ca8a04')
  local(ctx, x, y, spin, (ctx) => {
    ring(ctx, 0, 0, r * 0.78, '#a16207', width(r, 0.06))
    ctx.fillStyle = '#eab308'
    star(ctx, 0, 0, r * 0.45, 0, 5, 0.45)
    ctx.fill()
    ctx.strokeStyle = '#a16207'
    ctx.lineWidth = width(r, 0.04)
    ctx.stroke()
  })
  rim(ctx, x, y, r, '#a16207', 0.08)
  gloss(ctx, x, y, r, 0.6)
}

export const stainedGlass: Paint = (ctx, x, y, r, { spin }) => {
  local(ctx, x, y, spin, (ctx) => {
    const colours = ['#dc2626', '#2563eb', '#facc15', '#16a34a', '#9333ea', '#0891b2']
    for (let ringIndex = 0; ringIndex < 3; ringIndex += 1) {
      const count = [1, 6, 10][ringIndex] ?? 1
      const inner = [0, 0.32, 0.66][ringIndex] ?? 0
      const outer = [0.32, 0.66, 1][ringIndex] ?? 1
      for (let i = 0; i < count; i += 1) {
        const a0 = (i / count) * TAU + ringIndex * 0.3
        const a1 = ((i + 1) / count) * TAU + ringIndex * 0.3
        ctx.fillStyle = colours[(i + ringIndex * 2) % colours.length] ?? '#dc2626'
        ctx.beginPath()
        ctx.arc(0, 0, r * outer, a0, a1)
        ctx.arc(0, 0, r * inner, a1, a0, true)
        ctx.closePath()
        ctx.fill()
        ctx.strokeStyle = '#1f2937'
        ctx.lineWidth = width(r, 0.07)
        ctx.stroke()
      }
    }
  })
  rim(ctx, x, y, r, '#1f2937', 0.1)
  gloss(ctx, x, y, r, 0.45)
}

export const ruby: Paint = (ctx, x, y, r, { spin }) => {
  disc(ctx, x, y, r, '#9f1239')
  local(ctx, x, y, spin, (ctx) => {
    for (let i = 0; i < 8; i += 1) {
      const a0 = (i / 8) * TAU
      const a1 = ((i + 1) / 8) * TAU
      ctx.fillStyle = i % 2 === 0 ? '#e11d48' : '#be123c'
      ctx.beginPath()
      ctx.moveTo(Math.cos(a0) * r * 0.5, Math.sin(a0) * r * 0.5)
      ctx.lineTo(Math.cos(a0) * r, Math.sin(a0) * r)
      ctx.lineTo(Math.cos(a1) * r, Math.sin(a1) * r)
      ctx.lineTo(Math.cos(a1) * r * 0.5, Math.sin(a1) * r * 0.5)
      ctx.fill()
    }
    ctx.fillStyle = '#fb7185'
    polygon(ctx, 0, 0, r * 0.5, 8, 0)
    ctx.fill()
  })
  gloss(ctx, x, y, r, 0.55)
}

export const opal: Paint = (ctx, x, y, r, { t, spin }) => {
  disc(ctx, x, y, r, '#e0f2fe')
  inside(ctx, x, y, r, spin, (ctx) => {
    for (let i = 0; i < 9; i += 1) {
      const px = (hash(i, 1) - 0.5) * r * 1.6
      const py = (hash(i, 2) - 0.5) * r * 1.6
      const fill = ctx.createRadialGradient(px, py, 0, px, py, r * 0.6)
      fill.addColorStop(0, hsl(hash(i) * 360 + t * 40, 90, 70, 0.7))
      fill.addColorStop(1, hsl(hash(i) * 360 + t * 40, 90, 70, 0))
      ctx.fillStyle = fill
      ctx.fillRect(-r, -r, r * 2, r * 2)
    }
  })
  rim(ctx, x, y, r, 'rgba(148,163,184,0.5)', 0.06)
  gloss(ctx, x, y, r, 0.7)
}

export const button: Paint = (ctx, x, y, r, { spin }) => {
  shaded(ctx, x, y, r, '#5eead4', '#0f766e')
  local(ctx, x, y, spin, (ctx) => {
    ring(ctx, 0, 0, r * 0.72, 'rgba(15,118,110,0.6)', width(r, 0.08))
    for (const [hx, hy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) disc(ctx, hx * r * 0.2, hy * r * 0.2, r * 0.1, '#134e4a')
    ctx.strokeStyle = '#fef3c7'
    ctx.lineWidth = width(r, 0.06)
    ctx.beginPath()
    ctx.moveTo(-r * 0.2, -r * 0.2)
    ctx.lineTo(r * 0.2, r * 0.2)
    ctx.moveTo(r * 0.2, -r * 0.2)
    ctx.lineTo(-r * 0.2, r * 0.2)
    ctx.stroke()
  })
  gloss(ctx, x, y, r, 0.35)
}

export const hypno: Paint = (ctx, x, y, r, { t }) => {
  disc(ctx, x, y, r, '#ffffff')
  inside(ctx, x, y, r, -t * 4, (ctx) => {
    ctx.fillStyle = '#7c3aed'
    for (let arm = 0; arm < 2; arm += 1) {
      ctx.beginPath()
      for (let i = 0; i <= 60; i += 1) {
        const a = (i / 60) * TAU * 2.5 + arm * Math.PI
        const d = r * 1.3 * (i / 60)
        if (i === 0) ctx.moveTo(0, 0)
        else ctx.lineTo(Math.cos(a) * d, Math.sin(a) * d)
      }
      for (let i = 60; i >= 0; i -= 1) {
        const a = (i / 60) * TAU * 2.5 + arm * Math.PI + 1.2
        const d = r * 1.3 * (i / 60)
        ctx.lineTo(Math.cos(a) * d, Math.sin(a) * d)
      }
      ctx.fill()
    }
  })
  rim(ctx, x, y, r, '#5b21b6', 0.08)
  gloss(ctx, x, y, r, 0.35)
}

export const supernova: Paint = (ctx, x, y, r, { t }) => {
  const pulse = 0.5 + 0.5 * Math.sin(t * 4)
  local(ctx, x, y, t * 0.6, (ctx) => {
    for (let i = 0; i < 12; i += 1) {
      const long = r * (1.3 + 0.35 * Math.sin(t * 5 + i * 1.7))
      ctx.fillStyle = hsl(20 + (i % 4) * 12, 100, 55, 0.75)
      ctx.beginPath()
      ctx.moveTo(Math.cos((i / 12) * TAU - 0.12) * r * 0.6, Math.sin((i / 12) * TAU - 0.12) * r * 0.6)
      ctx.lineTo(Math.cos((i / 12) * TAU) * long, Math.sin((i / 12) * TAU) * long)
      ctx.lineTo(Math.cos((i / 12) * TAU + 0.12) * r * 0.6, Math.sin((i / 12) * TAU + 0.12) * r * 0.6)
      ctx.fill()
    }
  })
  const core = ctx.createRadialGradient(x, y, 0, x, y, r)
  core.addColorStop(0, '#ffffff')
  core.addColorStop(0.45 + 0.15 * pulse, '#fde047')
  core.addColorStop(1, '#f97316')
  ctx.fillStyle = core
  circle(ctx, x, y, r)
  ctx.fill()
}

export const eightBall: Paint = (ctx, x, y, r, { spin }) => {
  shaded(ctx, x, y, r, '#374151', '#030712')
  local(ctx, x, y, spin, (ctx) => {
    disc(ctx, 0, -r * 0.1, r * 0.45, '#ffffff')
    ctx.fillStyle = '#111827'
    ctx.font = `900 ${r * 0.6}px system-ui, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('8', 0, -r * 0.06)
  })
  gloss(ctx, x, y, r, 0.6)
}

export const shuttlecock: Paint = (ctx, x, y, r, { spin }) => {
  local(ctx, x, y, spin, (ctx) => {
    for (let i = 0; i < 16; i += 1) {
      const a = (i / 16) * TAU
      ctx.save()
      ctx.rotate(a)
      blob(ctx, r * 0.62, 0, r * 0.4, r * 0.18, '#f8fafc')
      ctx.strokeStyle = '#cbd5e1'
      ctx.lineWidth = width(r, 0.03)
      ctx.stroke()
      ctx.restore()
    }
  })
  ring(ctx, x, y, r * 0.55, '#ef4444', width(r, 0.08))
  shaded(ctx, x, y, r * 0.4, '#ffffff', '#d6d3d1')
}

export const comet: Paint = (ctx, x, y, r, { t, spin }) => {
  const pulse = 0.5 + 0.5 * Math.sin(t * 4)
  disc(ctx, x, y, r * (1.3 + pulse * 0.1), 'rgba(125,211,252,0.22)')
  disc(ctx, x, y, r * 1.12, 'rgba(186,230,253,0.4)')
  shaded(ctx, x, y, r, '#f0f9ff', '#7dd3fc')
  local(ctx, x, y, spin, (ctx) => {
    for (const [cx, cy, s] of [[-0.35, -0.2, 0.2], [0.3, 0.3, 0.16], [0.25, -0.45, 0.1]] as const) {
      disc(ctx, cx * r, cy * r, s * r, 'rgba(14,116,144,0.35)')
    }
  })
  gloss(ctx, x, y, r, 0.6)
}

export const glacier: Paint = (ctx, x, y, r, { spin }) => {
  disc(ctx, x, y, r, '#bae6fd')
  inside(ctx, x, y, r, spin, (ctx) => {
    for (let i = 0; i < 9; i += 1) {
      const a = (i / 9) * TAU
      tri(ctx, 0, 0, Math.cos(a) * r * 1.3, Math.sin(a) * r * 1.3, Math.cos(a + TAU / 9) * r * 1.3, Math.sin(a + TAU / 9) * r * 1.3, hsl(195 + hash(i) * 20, 85, 70 + hash(i, 1) * 20))
    }
    stroke(ctx, 'rgba(255,255,255,0.85)', width(r, 0.04))
    for (let i = 0; i < 9; i += 1) {
      const a = (i / 9) * TAU
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.lineTo(Math.cos(a) * r * 1.3, Math.sin(a) * r * 1.3)
      ctx.stroke()
    }
  })
  rim(ctx, x, y, r, '#0284c7', 0.06)
  gloss(ctx, x, y, r, 0.55)
}

export const giftBox: Paint = (ctx, x, y, r, { spin }) => {
  shaded(ctx, x, y, r, '#f87171', '#b91c1c')
  local(ctx, x, y, spin, (ctx) => {
    inside(ctx, 0, 0, r, 0, (ctx) => {
      ctx.fillStyle = '#facc15'
      ctx.fillRect(-r * 0.14, -r, r * 0.28, r * 2)
      ctx.fillRect(-r, -r * 0.14, r * 2, r * 0.28)
      for (let i = 0; i < 10; i += 1) disc(ctx, (hash(i) - 0.5) * r * 1.6, (hash(i, 1) - 0.5) * r * 1.6, r * 0.06, 'rgba(255,255,255,0.5)')
    })
    for (const side of [-1, 1]) blob(ctx, side * r * 0.25, 0, r * 0.25, r * 0.15, '#fde047', side * 0.4)
    disc(ctx, 0, 0, r * 0.12, '#eab308')
  })
  gloss(ctx, x, y, r, 0.35)
}

export const paintedEgg: Paint = (ctx, x, y, r, { spin }) => {
  disc(ctx, x, y, r, '#c4b5fd')
  inside(ctx, x, y, r, spin, (ctx) => {
    ctx.fillStyle = '#fbcfe8'
    ctx.fillRect(-r, -r * 0.55, r * 2, r * 0.35)
    ctx.fillStyle = '#a7f3d0'
    ctx.fillRect(-r, r * 0.25, r * 2, r * 0.35)
    stroke(ctx, '#fde047', width(r, 0.08))
    ctx.beginPath()
    for (let k = 0; k <= 12; k += 1) {
      const px = -r + (k / 12) * r * 2
      const py = (k % 2 === 0 ? -0.1 : 0.1) * r
      if (k === 0) ctx.moveTo(px, py)
      else ctx.lineTo(px, py)
    }
    ctx.stroke()
    for (let k = -3; k <= 3; k += 1) {
      disc(ctx, k * r * 0.3, -r * 0.37, r * 0.06, '#ffffff')
      disc(ctx, k * r * 0.3 + r * 0.15, r * 0.42, r * 0.06, '#ffffff')
    }
  })
  gloss(ctx, x, y, r, 0.4)
}
