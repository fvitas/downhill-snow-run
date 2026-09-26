import { createElement, Ghost, Pointer, TreePine, type IconNode } from 'lucide'
import { treeHitExtents } from '../game/scoring.ts'
import { cameraY, runActive, runOver, type GameState } from '../game/state.ts'
import { UI_THEME } from '../game/themes.ts'
import { LOGICAL_WIDTH } from '../game/viewport.ts'
import { applyGlass, applySolid, GLASS, PRESS, withAlpha } from './glass.ts'
import { playClick } from './sound.ts'

const LESSONS = 2
// A trunk or the edge this close on the current heading slows the run and asks for the tap.
const DANGER_AHEAD_PX = 260
const SLOW_MOTION = 0.2
// The next lesson waits this far down the slope, so a flip into more trouble isn't another stall.
const LESSON_GAP_PX = 150
const TOAST_MS = 1_400

const TIPS: readonly [IconNode, string, string][] = [
  [Pointer, 'Tap anywhere', 'to switch direction'],
  [TreePine, 'Skim past trees', 'the closer, the more points'],
  [Ghost, 'Grab power-ups', 'and keep off the edges'],
]

const ink = UI_THEME.ink

const icon = (node: IconNode, size: number): SVGElement =>
  createElement(node, { width: size, height: size, 'stroke-width': 2.25, 'aria-hidden': 'true' })

const div = (className: string, text = ''): HTMLDivElement => {
  const element = document.createElement('div')
  element.className = className
  element.textContent = text
  return element
}

const PILL =
  'absolute left-1/2 flex -translate-x-1/2 items-center gap-2.5 whitespace-nowrap rounded-full ' +
  'px-5 py-3 text-[1.05rem] font-bold text-white shadow-[0_12px_30px_rgba(11,43,94,0.3)]'

// Where the ball is steering, not where it points mid-turn: that is what the tap changes.
const headingIntoTrouble = (state: GameState): boolean => {
  const slope = Math.tan((state.direction * state.tuning.turnAngleDeg * Math.PI) / 180)
  const r = state.tuning.ballRadius
  const toWall = slope > 0 ? (LOGICAL_WIDTH - r - state.x) / slope : (state.x - r) / -slope
  if (toWall < DANGER_AHEAD_PX) return true
  if (state.ghost > 0) return false
  for (let i = state.treeFrom; i < state.treeTo; i += 1) {
    const tree = state.trees[i]
    if (!tree) continue
    const dy = tree.y - state.y
    if (dy <= 0 || dy >= DANGER_AHEAD_PX) continue
    if (Math.abs(state.x + slope * dy - tree.x) < treeHitExtents(state, tree).rx) return true
  }
  return false
}

const createCard = (onClose: () => void): HTMLElement => {
  const root = div(
    'pointer-events-auto absolute inset-0 flex items-center justify-center bg-slate-900/35 ' +
      'backdrop-blur-[3px]',
  )
  root.dataset.ui = ''

  const card = div(`${GLASS} relative flex w-[80%] flex-col gap-3.5 rounded-[2rem] px-5 pb-5 pt-6`)
  applyGlass(card, UI_THEME, { alpha: 0.9, elevated: true })
  card.style.color = ink
  card.append(div('mb-1 text-center text-[1.4rem] font-extrabold', 'How to ski'))

  for (const [node, title, detail] of TIPS) {
    const row = div('flex items-center gap-3.5')
    const badge = div('flex h-11 w-11 shrink-0 items-center justify-center rounded-[0.9rem]')
    badge.style.background = withAlpha(ink, 0.08)
    badge.append(icon(node, 24))
    const text = div('flex flex-col')
    text.append(
      div('text-base font-extrabold', title),
      div('text-[0.95rem] font-semibold opacity-65', detail),
    )
    row.append(badge, text)
    card.append(row)
  }

  const go = document.createElement('button')
  go.type = 'button'
  go.className = `${PRESS} mt-2 rounded-2xl border py-3.5 text-base font-extrabold`
  go.textContent = 'Let’s ski'
  applySolid(go, ink, '#ffffff')
  go.addEventListener('click', () => {
    playClick()
    onClose()
  })
  card.append(go)
  root.append(card)
  root.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, easing: 'ease-out' })
  return root
}

export type Tutorial = {
  root: HTMLElement
  // Every level start calls this; only level 1 passes `active`.
  start: (active: boolean) => void
  // The tips card keeps the countdown from starting until it is dismissed.
  holding: () => boolean
  timeScale: () => number
  update: () => void
}

export const createTutorial = (state: GameState, canvas: HTMLCanvasElement): Tutorial => {
  const root = div('pointer-events-none absolute inset-0 z-[15] overflow-hidden')

  const vignette = div('absolute inset-0 transition-opacity duration-150')
  const ring = div('absolute h-16 w-16 -translate-x-1/2 -translate-y-1/2')
  const ringPulse = div('absolute inset-0 animate-ping rounded-full bg-white/60')
  const ringEdge = div(
    'absolute inset-0 rounded-full border-[3px] border-white shadow-[0_0_0_3px_rgba(11,43,94,0.5)]',
  )
  ring.append(ringPulse, ringEdge)
  const tap = div(PILL)
  tap.style.background = withAlpha(ink, 0.9)
  const hand = div('flex animate-bounce')
  hand.append(icon(Pointer, 24))
  tap.append(hand, document.createTextNode('Tap!'))
  const toast = div(`${PILL} bottom-[24%]`)
  toast.style.background = withAlpha(ink, 0.9)
  root.append(vignette, ring, tap, toast)

  let active = false
  let card: HTMLElement | null = null
  let lessons = 0
  let slow = false
  let slowDirection = state.direction
  let lastLessonY = -Infinity
  let toastTimer = 0

  const showCoach = (on: boolean): void => {
    vignette.style.opacity = on ? '1' : '0'
    ring.style.display = on ? '' : 'none'
    tap.style.display = on ? '' : 'none'
  }

  const say = (text: string): void => {
    toast.textContent = text
    toast.style.display = ''
    toast.animate(
      [
        { opacity: 0, transform: 'translateY(8px)' },
        { opacity: 1, transform: 'none' },
      ],
      { duration: 200, easing: 'ease-out' },
    )
    clearTimeout(toastTimer)
    toastTimer = window.setTimeout(() => {
      toast.style.display = 'none'
    }, TOAST_MS)
  }

  const closeCard = (): void => {
    card?.remove()
    card = null
  }

  showCoach(false)
  toast.style.display = 'none'

  return {
    root,
    start: (next) => {
      active = next
      lessons = 0
      slow = false
      lastLessonY = -Infinity
      clearTimeout(toastTimer)
      toast.style.display = 'none'
      showCoach(false)
      closeCard()
      if (active) {
        card = createCard(closeCard)
        root.append(card)
      }
    },
    holding: () => card !== null,
    timeScale: () => (slow ? SLOW_MOTION : 1),
    update: () => {
      if (!active || state.screen !== 'run') {
        showCoach(false)
        return
      }
      if (slow && runOver(state)) {
        slow = false
      } else if (slow && state.direction !== slowDirection) {
        slow = false
        lessons += 1
        lastLessonY = state.y
        say(lessons >= LESSONS ? 'You’ve got it!' : 'Nice!')
      } else if (
        !slow &&
        lessons < LESSONS &&
        runActive(state) &&
        state.y - lastLessonY > LESSON_GAP_PX &&
        headingIntoTrouble(state)
      ) {
        slow = true
        slowDirection = state.direction
      }

      showCoach(slow)
      if (!slow) return
      const scale = canvas.clientWidth / LOGICAL_WIDTH
      const x = state.x * scale
      const y = (state.y - cameraY(state)) * scale
      vignette.style.background =
        `radial-gradient(circle at ${x}px ${y}px, transparent 70px, ${withAlpha(ink, 0.35)} 70%)`
      ring.style.left = `${x}px`
      ring.style.top = `${y}px`
      tap.style.top = `${y + 46}px`
    },
  }
}
