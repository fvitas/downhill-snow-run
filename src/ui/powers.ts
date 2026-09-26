import { createElement, Ghost, type IconNode } from 'lucide'
import { POWER_SECONDS } from '../game/hazards.ts'
import { drawPowerIcon, powerColour } from '../game/power-art.ts'
import type { GameState, PowerKind } from '../game/state.ts'

// Under this many seconds the badge blinks, so running out is never a surprise.
const WARN_SECONDS = 1.5

type Badge = { root: HTMLElement; text: HTMLElement }

// The same helmet as the pickup on the slope, so the badge reads as the thing just collected.
const helmetIcon = (): HTMLCanvasElement => {
  const [w, h] = [22, 16]
  const dpr = window.devicePixelRatio || 1
  const canvas = document.createElement('canvas')
  canvas.width = w * dpr
  canvas.height = h * dpr
  canvas.style.width = `${w}px`
  canvas.style.height = `${h}px`
  const ctx = canvas.getContext('2d')
  ctx?.scale(dpr, dpr)
  if (ctx) drawPowerIcon(ctx, 'helmet', w / 2, h / 2, 1.1)
  return canvas
}

const createBadge = (kind: PowerKind, icon: IconNode | HTMLCanvasElement | null): Badge => {
  const colour = powerColour(kind)
  const root = document.createElement('div')
  root.className =
    'flex h-[52px] w-[52px] items-center justify-center rounded-full ' +
    'shadow-[0_8px_22px_rgba(11,43,94,0.25)]'
  const inner = document.createElement('div')
  inner.className =
    'flex h-[42px] w-[42px] flex-col items-center justify-center gap-px rounded-full bg-white'
  inner.style.color = colour
  if (icon instanceof HTMLCanvasElement) {
    inner.append(icon)
  } else if (icon) {
    inner.append(createElement(icon, { width: 19, height: 19, 'stroke-width': 2.5, 'aria-hidden': 'true' }))
  } else {
    const glyph = document.createElement('div')
    glyph.className = 'text-[15px] font-black leading-none'
    glyph.textContent = '×2'
    inner.append(glyph)
  }
  const text = document.createElement('div')
  text.className = 'text-[10px] font-extrabold leading-none tabular-nums'
  inner.append(text)
  root.append(inner)
  return { root, text }
}

export type PowerBadges = { root: HTMLElement; update: (visible: boolean) => void }

// The live power-ups down the right edge, the helmet first and centred on the score beside it.
export const createPowerBadges = (state: GameState): PowerBadges => {
  const root = document.createElement('div')
  root.className = 'absolute right-0 top-[calc(50%-26px)] flex flex-col items-center gap-2'
  const double = createBadge('double', null)
  const ghost = createBadge('ghost', Ghost)
  const helmet = createBadge('helmet', helmetIcon())
  root.append(helmet.root, ghost.root, double.root)

  const show = (badge: Badge, kind: PowerKind, seconds: number | null): void => {
    const on = seconds === null ? state.helmet : seconds > 0
    badge.root.style.display = on ? 'flex' : 'none'
    if (!on) return
    const left = seconds === null ? 1 : seconds / POWER_SECONDS
    badge.root.style.background =
      `conic-gradient(${powerColour(kind)} ${left * 360}deg, rgba(255, 255, 255, 0.55) 0)`
    badge.text.textContent = seconds === null ? '1×' : seconds.toFixed(1)
    const warn = seconds !== null && seconds < WARN_SECONDS && Math.sin(state.elapsed * 18) > 0
    badge.root.style.opacity = warn ? '0.35' : '1'
  }

  return {
    root,
    update: (visible) => {
      root.style.display = visible ? 'flex' : 'none'
      if (!visible) return
      show(double, 'double', state.double)
      show(ghost, 'ghost', state.ghost)
      show(helmet, 'helmet', null)
    },
  }
}
