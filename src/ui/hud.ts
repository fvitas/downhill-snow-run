import { nextStarTarget, starsFor } from '../game/levels.ts'
import { distanceLeftM, levelProgress, runOver, type GameState } from '../game/state.ts'

export type HudActions = {
  onRetry: () => void
  onCrashSite: () => void
  onMenu: () => void
  onNext: () => void
  onPause: () => void
}

export type Hud = {
  root: HTMLElement
  update: () => void
}

const PRAISE = ['Nice!', 'Smooth!', 'Exquisite!', "You're on fire!"]

const praiseFor = (combo: number): string => {
  const index = Math.min(PRAISE.length - 1, Math.floor((combo - 2) / 2))
  return PRAISE[index] ?? ''
}

const star = (filled: boolean): HTMLElement => {
  const element = document.createElement('span')
  element.textContent = '★'
  element.className = filled ? 'text-amber-400' : 'text-stone-300'
  return element
}

const button = (label: string, classes: string, onClick: () => void): HTMLButtonElement => {
  const element = document.createElement('button')
  element.type = 'button'
  element.textContent = label
  element.className = classes
  element.dataset.ui = ''
  element.addEventListener('pointerdown', (event: PointerEvent) => {
    event.preventDefault()
    event.stopPropagation()
    onClick()
  })
  return element
}

export const createHud = (state: GameState, actions: HudActions): Hud => {
  const root = document.createElement('div')
  root.className = 'pointer-events-none absolute inset-0 z-10'

  // Pause: a small icon in the corner with a 44 px target around it.
  const pause = button(
    '❚❚',
    'pointer-events-auto absolute left-1 top-[calc(env(safe-area-inset-top)+0.25rem)] ' +
      'flex h-11 w-11 items-center justify-center text-sm opacity-60',
    actions.onPause,
  )

  const header = document.createElement('div')
  header.className =
    'absolute inset-x-0 top-[calc(env(safe-area-inset-top)+3rem)] flex flex-col items-center'

  const barRow = document.createElement('div')
  barRow.className = 'flex w-[86%] items-center gap-2'

  const fromNode = document.createElement('div')
  fromNode.className =
    'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold'

  const toNode = document.createElement('div')
  toNode.className =
    'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-[3px] text-sm font-bold'

  const track = document.createElement('div')
  track.className = 'relative h-4 grow overflow-hidden rounded-full'

  const fill = document.createElement('div')
  fill.className = 'absolute inset-y-0 left-0 rounded-full transition-[width] duration-100'
  track.append(fill)

  barRow.append(fromNode, track, toNode)

  // Rides the fill head, so the number is always where the progress is.
  const badge = document.createElement('div')
  badge.className = 'absolute top-0 rounded-md px-2 py-0.5 text-xs font-bold text-white'

  const badgeRow = document.createElement('div')
  badgeRow.className = 'relative mt-1 h-5 w-[86%]'
  badgeRow.append(badge)

  const scoreLine = document.createElement('div')
  scoreLine.className = 'mt-7 text-5xl font-bold'

  const comboLine = document.createElement('div')
  comboLine.className = 'h-5 text-sm font-semibold'

  header.append(barRow, badgeRow, scoreLine, comboLine)

  const card = document.createElement('div')
  card.className =
    'pointer-events-auto absolute inset-0 flex flex-col items-center justify-center gap-3'
  card.style.display = 'none'

  const title = document.createElement('div')
  title.className = 'text-2xl font-bold tracking-widest'

  const stars = document.createElement('div')
  stars.className = 'flex gap-2 text-4xl'

  const finalScore = document.createElement('div')
  finalScore.className = 'text-6xl font-bold'

  const detail = document.createElement('div')
  detail.className = 'text-sm font-semibold opacity-60'

  const buttons = document.createElement('div')
  buttons.className = 'mt-6 flex flex-col items-center gap-2'

  const primary = button('Retry', 'w-44 rounded-lg px-4 py-3 text-base font-bold text-white', () => {
    if (state.finished) actions.onNext()
    else actions.onRetry()
  })
  const crashSite = button(
    'Crash site',
    'w-44 rounded-lg bg-slate-800/85 px-4 py-2 text-sm font-medium text-slate-100',
    actions.onCrashSite,
  )
  const menu = button(
    'Levels',
    'w-44 rounded-lg px-4 py-2 text-sm font-medium opacity-70',
    actions.onMenu,
  )
  buttons.append(primary, crashSite, menu)
  card.append(title, stars, finalScore, detail, buttons)

  const countdown = document.createElement('div')
  countdown.className =
    'absolute inset-0 flex items-center justify-center text-[8rem] font-bold leading-none'
  countdown.style.display = 'none'

  root.append(pause, header, countdown, card)

  let lastScore = -1

  return {
    root,
    update: () => {
      const { theme, level } = state
      // The card waits out the impact hold, so the crash is seen before it is judged.
      const showCard = runOver(state) && !state.inspect.on && state.freeze <= 0
      const counting = !state.started && !runOver(state)

      header.style.display = showCard || state.inspect.on ? 'none' : 'flex'
      pause.style.display = showCard || counting || state.inspect.on ? 'none' : 'flex'
      pause.style.color = theme.ink

      fromNode.textContent = String(level.index)
      fromNode.style.background = theme.ink
      fromNode.style.color = theme.snow
      toNode.textContent = level.bonus ? '★' : String(level.index + 1)
      toNode.style.borderColor = theme.ink
      toNode.style.color = theme.ink
      toNode.style.background = theme.snow

      track.style.background = theme.trail
      const progress = levelProgress(state)
      fill.style.width = `${progress * 100}%`
      fill.style.background = theme.ink

      badge.textContent = `${distanceLeftM(state)} m`
      badge.style.background = theme.ink
      badge.style.left = `calc(${progress * 100}% - 1.5rem)`

      scoreLine.textContent = String(state.score)
      scoreLine.style.color = theme.ball
      // The number kicks on every tick, the way the original's does.
      if (state.score !== lastScore) {
        scoreLine.animate(
          [{ transform: 'scale(1.18)' }, { transform: 'scale(1)' }],
          { duration: 160, easing: 'ease-out' },
        )
        lastScore = state.score
      }

      comboLine.textContent = state.combo > 1 ? `${praiseFor(state.combo)} ×${state.combo}` : ''
      comboLine.style.color = theme.ink

      countdown.style.display = counting ? 'flex' : 'none'
      countdown.style.color = theme.ink
      if (counting) {
        const seconds = Math.ceil(state.countdown)
        countdown.textContent = seconds > 0 ? String(seconds) : 'GO'
      }

      card.style.display = showCard ? 'flex' : 'none'
      if (!showCard) return

      card.style.background = `${theme.snow}dd`
      card.style.color = theme.ink
      const crashTitle = state.lastHit?.kind === 'avalanche' ? 'CAUGHT' : 'CRASHED'
      title.textContent = state.finished ? (level.bonus ? 'COLLECTED' : 'FINISH') : crashTitle
      finalScore.textContent = String(state.score)
      finalScore.style.color = theme.ball
      primary.style.background = theme.ink
      primary.textContent = state.finished ? 'Next level' : 'Retry'
      crashSite.style.display = state.finished ? 'none' : 'block'
      menu.style.color = theme.ink

      stars.replaceChildren()
      const earned = state.finished ? starsFor(state.score, state.course.perfectScore) : 0
      for (let i = 0; i < 3; i += 1) stars.append(star(i < earned))

      const target = nextStarTarget(state.score, state.course.perfectScore)
      if (state.finished) {
        detail.textContent = level.bonus
          ? `${state.runCoins} coins · ${state.runDiamonds} diamonds`
          : target === null
            ? 'Perfect run'
            : `${target - state.score} more for the next star`
      } else {
        detail.textContent = `Best: ${Math.max(state.bestScore, state.score)}`
      }
    },
  }
}
