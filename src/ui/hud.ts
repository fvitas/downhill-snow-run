import { nextStarTarget, starsFor } from '../game/levels.ts'
import { distanceLeftM, levelProgress, runOver, type GameState } from '../game/state.ts'
import { applyGlass, applySolid, GLASS, PRESS, isDarkTheme, withAlpha } from './glass.ts'

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
  element.className = filled
    ? 'text-amber-400 drop-shadow-[0_2px_6px_rgba(245,166,35,0.5)]'
    : 'opacity-25'
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
    `${GLASS} ${PRESS} pointer-events-auto absolute left-3 ` +
      'top-[calc(env(safe-area-inset-top)+0.5rem)] flex h-11 w-11 items-center justify-center ' +
      'rounded-full text-xs',
    actions.onPause,
  )

  const header = document.createElement('div')
  header.className =
    'absolute inset-x-0 top-[calc(env(safe-area-inset-top)+3.5rem)] flex flex-col items-center'

  const barRow = document.createElement('div')
  barRow.className = `${GLASS} relative flex w-[86%] items-center gap-2 rounded-full p-1.5`

  const fromNode = document.createElement('div')
  fromNode.className =
    'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm font-bold'

  const toNode = document.createElement('div')
  toNode.className =
    'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm font-bold'

  const track = document.createElement('div')
  track.className = 'relative h-2.5 grow overflow-hidden rounded-full'

  const fill = document.createElement('div')
  fill.className = 'absolute inset-y-0 left-0 rounded-full transition-[width] duration-100'
  track.append(fill)

  barRow.append(fromNode, track, toNode)

  // Rides the fill head, so the number is always where the progress is.
  const badge = document.createElement('div')
  badge.className =
    `${GLASS} absolute top-0 rounded-full px-2.5 py-0.5 text-[0.7rem] font-bold tabular-nums`

  const badgeRow = document.createElement('div')
  badgeRow.className = 'relative mt-1.5 h-6 w-[74%]'
  badgeRow.append(badge)

  const scoreLine = document.createElement('div')
  scoreLine.className = 'mt-6 text-5xl font-bold tabular-nums tracking-tight'

  const comboLine = document.createElement('div')
  comboLine.className = 'h-5 text-sm font-semibold tracking-wide'

  header.append(barRow, badgeRow, scoreLine, comboLine)

  // The scene freezes behind the sheet and is blurred out, so the card owns the screen.
  const card = document.createElement('div')
  card.className =
    'pointer-events-auto absolute inset-0 flex items-center justify-center ' +
    'bg-slate-900/25 backdrop-blur-md'
  card.style.display = 'none'

  const sheet = document.createElement('div')
  sheet.className =
    `${GLASS} relative flex w-[78%] flex-col items-center gap-2 rounded-[2rem] px-6 pb-6 pt-7`

  const title = document.createElement('div')
  title.className = 'text-xl font-bold tracking-[0.3em] opacity-70'

  const stars = document.createElement('div')
  stars.className = 'mt-1 flex gap-2 text-4xl'

  const finalScore = document.createElement('div')
  finalScore.className = 'text-6xl font-bold tabular-nums tracking-tight'

  const detail = document.createElement('div')
  detail.className = 'text-sm font-semibold opacity-60'

  const buttons = document.createElement('div')
  buttons.className = 'mt-5 flex w-full flex-col items-stretch gap-2'

  const primary = button(
    'Retry',
    `${PRESS} relative rounded-2xl border px-4 py-3.5 text-base font-bold`,
    () => {
      if (state.finished) actions.onNext()
      else actions.onRetry()
    },
  )
  const crashSite = button(
    'Crash site',
    `${GLASS} ${PRESS} relative rounded-2xl px-4 py-2.5 text-sm font-semibold`,
    actions.onCrashSite,
  )
  const menu = button(
    'Levels',
    `${PRESS} rounded-2xl px-4 py-2 text-sm font-semibold opacity-60`,
    actions.onMenu,
  )
  buttons.append(primary, crashSite, menu)
  sheet.append(title, stars, finalScore, detail, buttons)
  card.append(sheet)

  const countdown = document.createElement('div')
  countdown.className = 'absolute inset-0 flex items-center justify-center'
  countdown.style.display = 'none'

  const countdownDisc = document.createElement('div')
  countdownDisc.className =
    `${GLASS} relative flex h-36 w-36 items-center justify-center rounded-full text-7xl font-bold`
  countdown.append(countdownDisc)

  root.append(pause, header, countdown, card)

  let lastScore = -1
  let cardShown = false

  return {
    root,
    update: () => {
      const { theme, level } = state
      const dark = isDarkTheme(theme)
      // The card waits out the impact hold, so the crash is seen before it is judged.
      const showCard = runOver(state) && !state.inspect.on && state.freeze <= 0
      const counting = !state.started && !runOver(state)

      header.style.display = showCard || state.inspect.on ? 'none' : 'flex'
      pause.style.display = showCard || counting || state.inspect.on ? 'none' : 'flex'
      applyGlass(pause, theme)
      pause.style.color = theme.ink

      applyGlass(barRow, theme)

      fromNode.textContent = String(level.index)
      applySolid(fromNode, theme.ink, theme.snow)
      toNode.textContent = level.bonus ? '★' : String(level.index + 1)
      applyGlass(toNode, theme, { tint: theme.trail, alpha: dark ? 0.5 : 0.85 })
      toNode.style.color = theme.ink

      track.style.background = withAlpha(theme.ink, dark ? 0.25 : 0.14)
      const progress = levelProgress(state)
      fill.style.width = `${progress * 100}%`
      fill.style.background = `linear-gradient(90deg, ${withAlpha(theme.ink, 0.75)}, ${theme.ink})`

      badge.textContent = `${distanceLeftM(state)} m`
      applyGlass(badge, theme)
      badge.style.color = theme.ink
      badge.style.left = `calc(${progress * 100}% - 1.5rem)`

      scoreLine.textContent = String(state.score)
      scoreLine.style.color = theme.ball
      scoreLine.style.textShadow = `0 4px 18px ${withAlpha(theme.ball, 0.45)}`
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
      if (counting) {
        applyGlass(countdownDisc, theme, { elevated: true })
        countdownDisc.style.color = theme.ink
        const seconds = Math.ceil(state.countdown)
        const text = seconds > 0 ? String(seconds) : 'GO'
        if (countdownDisc.textContent !== text) {
          countdownDisc.textContent = text
          countdownDisc.animate(
            [
              { transform: 'scale(0.82)', opacity: 0.4 },
              { transform: 'scale(1)', opacity: 1 },
            ],
            { duration: 260, easing: 'cubic-bezier(0.2, 0.9, 0.3, 1.2)' },
          )
        }
      }

      card.style.display = showCard ? 'flex' : 'none'
      if (!showCard) {
        cardShown = false
        return
      }

      // Springs in once per run, not on every frame the card is up.
      if (!cardShown) {
        cardShown = true
        sheet.animate(
          [
            { transform: 'scale(0.9) translateY(12px)', opacity: 0 },
            { transform: 'scale(1) translateY(0)', opacity: 1 },
          ],
          { duration: 320, easing: 'cubic-bezier(0.2, 0.9, 0.3, 1.1)' },
        )
      }

      applyGlass(sheet, theme, { alpha: dark ? 0.72 : 0.82, elevated: true })
      sheet.style.color = theme.ink
      const crashTitle = state.lastHit?.kind === 'avalanche' ? 'CAUGHT' : 'CRASHED'
      title.textContent = state.finished ? (level.bonus ? 'COLLECTED' : 'FINISH') : crashTitle
      finalScore.textContent = String(state.score)
      finalScore.style.color = theme.ball
      finalScore.style.textShadow = `0 4px 18px ${withAlpha(theme.ball, 0.4)}`
      applySolid(primary, theme.ink, theme.snow)
      primary.textContent = state.finished ? 'Next level' : 'Retry'
      applyGlass(crashSite, theme, { tint: theme.trail, alpha: dark ? 0.5 : 0.8 })
      crashSite.style.color = theme.ink
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
