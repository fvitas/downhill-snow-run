import confetti from 'canvas-confetti'
import { looks, setLook } from '../game/looks.ts'
import { UI_THEME } from '../game/themes.ts'
import { ALL_LOOKS, isSpinLevel, lookName, spinTaken, takeSpin, winLook, type Look } from '../game/unlocks.ts'
import { applySolid, PRESS, withAlpha } from './glass.ts'
import { playHaptics } from './haptics.ts'
import { drawLookTile, sizedCanvas } from './look-tiles.ts'
import { createModal } from './modal.ts'
import { ownsLook } from './purchases.ts'
import { playClick, playSounds } from './sound.ts'

const TAU = Math.PI * 2
const WHEEL = 250
const SEGMENTS = 8
const TILE = 46
const SPIN_SECONDS = 4.2
const MIN_TURNS = 5
const ink = UI_THEME.ink
const ball = UI_THEME.ball

const shuffled = <T>(items: readonly T[]): T[] => {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    const a = out[i]
    const b = out[j]
    if (a === undefined || b === undefined) continue
    out[i] = b
    out[j] = a
  }
  return out
}

// Fast off the mark, then a long coast into the pointer.
const easeOut = (t: number): number => 1 - (1 - t) ** 4

const lockedLooks = (): Look[] => ALL_LOOKS.filter((look) => !ownsLook(look))

// The one spin a finish card holds: leaving the card without spinning throws it away.
let waiting: number | null = null

// A spin level's first finish brings one spin, and only while something is left to win.
export const grantSpin = (level: number): boolean => {
  if (!isSpinLevel(level) || spinTaken(level) || lockedLooks().length === 0) return false
  takeSpin(level)
  waiting = level
  return true
}

export const spinWaiting = (level: number): boolean => waiting === level

export const dropSpin = (): void => {
  waiting = null
}

export type Spinner = { root: HTMLElement; open: (level: number) => void }

export const createSpinner = (): Spinner => {
  const [wheel, ctx] = sizedCanvas(WHEEL, WHEEL)
  wheel.className = 'cursor-pointer'
  let segments: Look[] = []
  let tiles: HTMLCanvasElement[] = []
  let angle = 0
  let frame = 0
  let spinning = false
  let level = 0
  let winner: number | null = null

  const segment = TAU / SEGMENTS
  // The pointer is at the top, so segment i is under it when angle + its middle sits at -π/2.
  const underPointer = (at: number): number =>
    ((Math.floor((-Math.PI / 2 - at) / segment) % SEGMENTS) + SEGMENTS) % SEGMENTS

  const draw = (): void => {
    if (!ctx) return
    const c = WHEEL / 2
    const r = c - 8
    ctx.clearRect(0, 0, WHEEL, WHEEL)
    ctx.save()
    ctx.translate(c, c)
    ctx.rotate(angle)
    for (let i = 0; i < SEGMENTS; i += 1) {
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.arc(0, 0, r, i * segment, (i + 1) * segment)
      ctx.closePath()
      ctx.fillStyle = i % 2 === 0 ? '#ffffff' : withAlpha(ball, 0.22)
      ctx.fill()
      const tile = tiles[i]
      if (tile) {
        ctx.save()
        ctx.rotate((i + 0.5) * segment)
        ctx.translate(r * 0.64, 0)
        ctx.rotate(Math.PI / 2)
        ctx.drawImage(tile, -TILE / 2, -TILE / 2, TILE, TILE)
        ctx.restore()
      }
      // The prize stays lit and the rest fade, so the result shows on the wheel itself.
      if (winner !== null && i !== winner) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'
        ctx.fill()
      }
    }
    ctx.restore()

    ctx.lineWidth = 7
    ctx.strokeStyle = ink
    ctx.beginPath()
    ctx.arc(c, c, r, 0, TAU)
    ctx.stroke()
    for (let i = 0; i < SEGMENTS * 2; i += 1) {
      const a = angle + (i * segment) / 2
      ctx.fillStyle = i % 2 === 0 ? '#ffd166' : '#ffffff'
      ctx.beginPath()
      ctx.arc(c + Math.cos(a) * r, c + Math.sin(a) * r, 2.2, 0, TAU)
      ctx.fill()
    }

    ctx.fillStyle = ink
    ctx.beginPath()
    ctx.arc(c, c, 18, 0, TAU)
    ctx.fill()
    ctx.fillStyle = ball
    ctx.beginPath()
    ctx.arc(c, c, 9, 0, TAU)
    ctx.fill()

    ctx.fillStyle = ball
    ctx.strokeStyle = ink
    ctx.lineWidth = 3
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(c - 13, 1.5)
    ctx.lineTo(c + 13, 1.5)
    ctx.lineTo(c, 27)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
  }

  // One line and one button whose text changes in place, so nothing moves when the wheel stops.
  const caption = document.createElement('div')
  caption.className = 'flex h-7 items-center text-lg font-bold'

  let prize: Look | null = null
  const action = document.createElement('button')
  action.type = 'button'
  action.className = `${PRESS} flex-1 rounded-2xl border px-4 py-3 text-base font-bold`
  applySolid(action, ball, '#ffffff')
  // Shares the row with the main button once the prize is in, so the row's height never changes.
  const back = document.createElement('button')
  back.type = 'button'
  back.className = `${PRESS} flex-1 rounded-2xl border px-4 py-3 text-base font-semibold`
  back.textContent = 'Go back'
  back.style.background = UI_THEME.snow
  back.style.borderColor = 'transparent'
  back.style.color = ink
  back.style.boxShadow = `0 6px 16px ${withAlpha(ink, 0.16)}`
  back.addEventListener('click', () => {
    playClick()
    close()
  })
  const row = document.createElement('div')
  row.className = 'flex w-full gap-2'
  row.append(back, action)
  action.addEventListener('click', () => {
    playClick()
    if (!prize) spin()
    else {
      setLook(prize.kind === 'ball' ? { ball: prize.id } : { trail: prize.id })
      close()
    }
  })

  const show = (phase: 'ready' | 'spinning' | 'won'): void => {
    caption.textContent = prize ? `You won ${lookName(prize)}!` : 'Win a new ball or trail'
    action.textContent = phase === 'won' ? 'Use it' : 'Spin'
    back.style.display = phase === 'won' ? 'block' : 'none'
    action.disabled = phase === 'spinning'
    action.style.opacity = phase === 'spinning' ? '0.6' : '1'
  }

  const fill = (): void => {
    const locked = shuffled(lockedLooks())
    segments = locked.length === 0 ? [] : Array.from({ length: SEGMENTS }, (_, i) => locked[i % locked.length] as Look)
    tiles = segments.map((look) => {
      const [canvas, tileCtx] = sizedCanvas(TILE, TILE)
      if (tileCtx) drawLookTile(tileCtx, look, looks().ball, TILE)
      return canvas
    })
    draw()
  }

  const land = (index: number, won: Look): void => {
    spinning = false
    prize = won
    winner = index
    draw()
    playSounds(['pickup'])
    playHaptics(['finish'])
    void confetti({ particleCount: 110, spread: 80, startVelocity: 42, origin: { y: 0.55 }, zIndex: 40 })
    show('won')
  }

  const spin = (): void => {
    if (spinning || prize || waiting !== level) return
    const index = Math.floor(Math.random() * segments.length)
    const won = segments[index]
    if (!won) return
    // Won before the wheel moves, so closing the sheet mid-spin can't throw the prize back.
    waiting = null
    winLook(won)
    spinning = true
    show('spinning')
    const from = angle
    const jitter = (Math.random() - 0.5) * segment * 0.7
    const rest = -Math.PI / 2 - (index + 0.5) * segment + jitter
    const to = rest + Math.ceil((from - rest) / TAU + MIN_TURNS) * TAU
    const started = performance.now()
    let last = underPointer(from)
    const step = (now: number): void => {
      const t = Math.min(1, (now - started) / (SPIN_SECONDS * 1_000))
      angle = from + (to - from) * easeOut(t)
      const under = underPointer(angle)
      if (under !== last) {
        last = under
        playClick()
        playHaptics(['count'])
      }
      draw()
      if (t < 1) frame = requestAnimationFrame(step)
      else land(index, won)
    }
    frame = requestAnimationFrame(step)
  }

  const onShow = (): void => {
    prize = null
    winner = null
    fill()
    show('ready')
  }
  const onHide = (): void => {
    cancelAnimationFrame(frame)
    // A spin cut short still landed: its prize was claimed when it started.
    spinning = false
  }

  const modal = createModal('Spin to win', onShow, onHide)
  const close = (): void => {
    modal.root.style.display = 'none'
    onHide()
  }
  wheel.addEventListener('click', () => spin())

  modal.sheet.append(wheel, caption, row)

  return {
    root: modal.root,
    open: (spinLevel: number) => {
      level = spinLevel
      modal.open()
    },
  }
}
