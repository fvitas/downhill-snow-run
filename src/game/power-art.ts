import { helmetBreakProgress, POWER_SECONDS } from './hazards.ts'
import type { GameState, Pickup, PowerKind } from './state.ts'
import { viewHeight } from './viewport.ts'

type Icon = (ctx: CanvasRenderingContext2D, x: number, y: number, s: number) => void

const drawHelmetIcon: Icon = (ctx, x, y, s) => {
  ctx.fillStyle = '#262b33'
  ctx.beginPath()
  ctx.arc(x, y + 3 * s, 9 * s, Math.PI, 0)
  ctx.lineTo(x + 9 * s, y + 5 * s)
  ctx.lineTo(x - 9 * s, y + 5 * s)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = '#1e293b'
  ctx.fillRect(x - 9 * s, y + 3 * s, 18 * s, 3 * s)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)'
  ctx.lineWidth = 1.6 * s
  ctx.beginPath()
  ctx.arc(x, y + 3 * s, 6 * s, Math.PI * 1.15, Math.PI * 1.55)
  ctx.stroke()
}

const drawGhostIcon: Icon = (ctx, x, y, s) => {
  ctx.fillStyle = '#ffffff'
  ctx.strokeStyle = '#7c3aed'
  ctx.lineWidth = 1.6 * s
  ctx.beginPath()
  ctx.arc(x, y - 2 * s, 8 * s, Math.PI, 0)
  ctx.lineTo(x + 8 * s, y + 8 * s)
  for (let i = 0; i < 3; i += 1) {
    const cx = x + 8 * s - (i * 16 * s) / 3 - (8 * s) / 3
    ctx.quadraticCurveTo(cx + (8 * s) / 3, y + 4 * s, cx, y + 8 * s)
    ctx.quadraticCurveTo(cx - (8 * s) / 3, y + 12 * s, cx - (8 * s) / 3, y + 8 * s)
  }
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = '#1e1b4b'
  for (const dx of [-3, 3]) {
    ctx.beginPath()
    ctx.ellipse(x + dx * s, y - 2 * s, 1.6 * s, 2.2 * s, 0, 0, Math.PI * 2)
    ctx.fill()
  }
}

const drawDoubleIcon: Icon = (ctx, x, y, s) => {
  ctx.fillStyle = '#b45309'
  ctx.font = `800 ${16 * s}px system-ui, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('×2', x, y + s)
  ctx.textBaseline = 'alphabetic'
}

const POWERS: Record<PowerKind, { colour: string; icon: Icon }> = {
  helmet: { colour: '#3b4350', icon: drawHelmetIcon },
  ghost: { colour: '#7c3aed', icon: drawGhostIcon },
  double: { colour: '#d97706', icon: drawDoubleIcon },
}

export const drawPickup = (ctx: CanvasRenderingContext2D, state: GameState, pickup: Pickup, camY: number): void => {
  const power = POWERS[pickup.kind]
  const x = pickup.x
  const y = pickup.y - camY
  const bob = Math.sin(state.elapsed * 4) * 3
  ctx.fillStyle = state.theme.shadow
  ctx.beginPath()
  ctx.ellipse(x - 5, y + 18, 18 - bob, 6, 0, 0, Math.PI * 2)
  ctx.fill()
  const cy = y - 8 + bob
  const glow = ctx.createRadialGradient(x, cy, 13, x, cy, 38)
  glow.addColorStop(0, `${power.colour}55`)
  glow.addColorStop(1, `${power.colour}00`)
  ctx.fillStyle = glow
  ctx.beginPath()
  ctx.arc(x, cy, 38, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#ffffff'
  ctx.strokeStyle = power.colour
  ctx.lineWidth = 3.5
  ctx.beginPath()
  ctx.arc(x, cy, 22, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  power.icon(ctx, x, cy, 1.3)
}

const GHOST_TRAIL = 4
const GHOST_TRAIL_GAP = 16

// Faint copies left behind along the line of travel, so a see-through ball still reads as moving.
export const drawGhostTrail = (ctx: CanvasRenderingContext2D, state: GameState, x: number, y: number): void => {
  const r = state.tuning.ballRadius
  const slope = Math.tan(state.angle)
  for (let k = GHOST_TRAIL; k >= 1; k -= 1) {
    ctx.fillStyle = `rgba(167, 139, 250, ${0.09 * (5 - k)})`
    ctx.beginPath()
    ctx.arc(x - slope * k * GHOST_TRAIL_GAP, y - k * GHOST_TRAIL_GAP, r * (1 - 0.1 * k), 0, Math.PI * 2)
    ctx.fill()
  }
}

// See-through while it lasts; in the last 0.6 s it flickers back towards solid as a warning.
export const ghostAlpha = (state: GameState): number => {
  if (state.ghost <= 0) return 1
  if (state.ghost < 0.6 && Math.sin(state.elapsed * 30) > 0) return 0.8
  return 0.4
}

export const drawHelmetOn = (ctx: CanvasRenderingContext2D, state: GameState, x: number, y: number, r: number): void => {
  ctx.save()
  ctx.globalAlpha = 0.55
  ctx.strokeStyle = state.theme.ink
  ctx.lineWidth = 2.5
  ctx.beginPath()
  ctx.arc(x, y, r + 6, 0, Math.PI * 2)
  ctx.stroke()
  ctx.restore()
  drawHelmetIcon(ctx, x, y - 3, 0.6)
}

export const drawShards = (ctx: CanvasRenderingContext2D, state: GameState, camY: number): void => {
  const smash = state.helmetBreak
  if (!smash) return
  const k = helmetBreakProgress(state)
  const x = smash.x
  const y = smash.y - camY
  ctx.save()
  ctx.globalAlpha = 1 - k
  ctx.fillStyle = state.theme.ink
  for (let i = 0; i < 7; i += 1) {
    const a = (i / 7) * Math.PI * 2 + 0.4
    const d = 8 + k * 46
    ctx.save()
    ctx.translate(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.7 - Math.sin(k * Math.PI) * 14)
    ctx.rotate(a + k * 6)
    ctx.fillRect(-4, -2, 8, 4)
    ctx.restore()
  }
  ctx.restore()
}

const CHIP = { x: 20, w: 150, h: 44, gap: 8, bottom: 40 }

// The live power-ups, stacked up from the bottom-left corner; `left` runs from 1 down to 0.
const drawChip = (ctx: CanvasRenderingContext2D, kind: PowerKind, left: number, label: string, y: number): void => {
  const power = POWERS[kind]
  const { x, w, h } = CHIP
  ctx.fillStyle = 'rgba(15, 23, 42, 0.72)'
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, h / 2)
  ctx.fill()
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.arc(x + 22, y + 22, 16, 0, Math.PI * 2)
  ctx.fill()
  power.icon(ctx, x + 22, y + 22, 0.9)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.18)'
  ctx.beginPath()
  ctx.roundRect(x + 46, y + 29, 90, 6, 3)
  ctx.fill()
  ctx.fillStyle = power.colour
  ctx.beginPath()
  ctx.roundRect(x + 46, y + 29, 90 * left, 6, 3)
  ctx.fill()
  ctx.fillStyle = '#f8fafc'
  ctx.font = '700 15px system-ui, sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText(label, x + 46, y + 22)
}

export const drawChips = (ctx: CanvasRenderingContext2D, state: GameState): void => {
  const chips: [PowerKind, number, string][] = []
  if (state.helmet) chips.push(['helmet', 1, '1 hit'])
  if (state.ghost > 0) chips.push(['ghost', state.ghost / POWER_SECONDS, `${state.ghost.toFixed(1)} s`])
  if (state.double > 0) chips.push(['double', state.double / POWER_SECONDS, `${state.double.toFixed(1)} s`])
  chips.forEach(([kind, left, label], i) => {
    drawChip(ctx, kind, left, label, viewHeight() - CHIP.bottom - CHIP.h - i * (CHIP.h + CHIP.gap))
  })
}
