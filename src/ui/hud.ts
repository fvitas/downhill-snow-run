import { nextStarTarget, starsFor } from '../game/levels.ts'
import { COUNTDOWN_TICK_SECONDS, levelProgress, runOver, type GameState } from '../game/state.ts'
import { UI_THEME } from '../game/themes.ts'
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

const PRAISE = ['Clean!', 'Carving!', 'Sending it!', 'Full send!']

// Lucide's `pause`, inlined — one icon does not justify the dependency. Solid bars, not the
// stroked default, so it still reads at arm's length on the slope.
const PAUSE_ICON =
  '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" class="h-6 w-6">' +
  '<rect x="14" y="3" width="4" height="18" rx="1.5" />' +
  '<rect x="6" y="3" width="4" height="18" rx="1.5" />' +
  '</svg>'

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

  // Out of the header's way and under the thumb that is already holding the phone.
  const pause = button(
    '',
    `${GLASS} ${PRESS} pointer-events-auto absolute right-4 ` +
      'bottom-[calc(env(safe-area-inset-bottom)+1.25rem)] flex h-11 w-11 items-center ' +
      'justify-center rounded-full',
    actions.onPause,
  )
  pause.innerHTML = PAUSE_ICON

  const header = document.createElement('div')
  header.className =
    'absolute inset-x-0 top-[calc(env(safe-area-inset-top)+0.4rem)] flex flex-col items-center px-3'

  const barRow = document.createElement('div')
  barRow.className = `${GLASS} relative flex w-1/2 items-center gap-1.5 rounded-full p-1`

  const fromNode = document.createElement('div')
  fromNode.className =
    'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold'

  const toNode = document.createElement('div')
  toNode.className =
    'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold'

  const track = document.createElement('div')
  track.className = 'relative h-1.5 grow overflow-hidden rounded-full'

  // How far the best failed attempt got. Appended first so the live fill paints straight over it.
  const ghost = document.createElement('div')
  ghost.className = 'absolute inset-y-0 left-0 rounded-full'

  const fill = document.createElement('div')
  fill.className = 'absolute inset-y-0 left-0 rounded-full transition-[width] duration-100'
  track.append(ghost, fill)

  barRow.append(fromNode, track, toNode)

  // A tooltip hanging off the fill head: the caret points at the exact spot you are on the piste.
  const badge = document.createElement('div')
  badge.className =
    `${GLASS} absolute top-1.5 z-10 whitespace-nowrap rounded-md px-1.5 py-0.5 ` +
    'text-[0.65rem] font-bold tabular-nums'

  // Same material as the badge. Only its top-left half is exposed — the badge covers the rest —
  // so the two borders that draw the point are the only ones that read.
  const badgeTail = document.createElement('div')
  badgeTail.className = `${GLASS} absolute top-[0.15rem] h-2 w-2 rounded-[2px] border-l border-t`

  // The ghost's own tooltip: same pill, muted and caret-less, so the live one always wins. It
  // rides above the bar while the live one hangs below, so the two can never collide.
  const ghostBadge = document.createElement('div')
  // Tucked down into the panel; z-10 keeps it above the glass, which is painted after it.
  ghostBadge.className =
    'absolute -bottom-[1.125rem] z-10 whitespace-nowrap px-1.5 py-0.5 text-[0.6rem] ' +
    'font-bold tabular-nums'

  const ghostRow = document.createElement('div')
  ghostRow.className = 'relative h-5 w-full'
  ghostRow.append(ghostBadge)

  const badgeRow = document.createElement('div')
  // No upward offset: the caret has only ~2px of clearance under the pill, and tucking the row up
  // buries it behind the panel.
  badgeRow.className = 'relative h-6 w-full'
  badgeRow.append(badgeTail, badge)

  // Level 500 has no tape to reach, so it gets no bar and no percentage — this stands in for the
  // whole row, and the score below it is the only number on the screen.
  const endlessPill = document.createElement('div')
  endlessPill.className = 'rounded-full px-4 py-1.5 text-[0.7rem] font-bold tracking-[0.35em]'
  endlessPill.textContent = 'ENDLESS'

  const scoreLine = document.createElement('div')
  scoreLine.className = 'mt-4 text-5xl font-bold tabular-nums tracking-tight'

  const comboLine = document.createElement('div')
  comboLine.className = 'h-5 text-sm font-semibold tracking-wide'

  header.append(ghostRow, barRow, badgeRow, endlessPill, scoreLine, comboLine)

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
  // The Snow secondary: same box as the primary — padding, text size and the 1px rim all match,
  // so only the fill and the weight separate them.
  const crashSite = button(
    'Crash site',
    `${PRESS} relative rounded-2xl border px-4 py-3.5 text-base font-semibold`,
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
    `${GLASS} relative flex h-36 w-36 items-center justify-center rounded-full font-bold`
  countdown.append(countdownDisc)

  root.append(pause, header, countdown, card)

  let lastScore = -1
  let cardShown = false

  return {
    root,
    update: () => {
      const { level } = state
      // Fixed chrome: every panel, chip and button stays on world one's palette. Only the two
      // lines that sit on bare slope keep the world's own colours, because they have nothing
      // behind them to read against.
      const theme = UI_THEME
      const world = state.theme
      const dark = isDarkTheme(theme)
      // The card waits out the impact hold, so the crash is seen before it is judged.
      const showCard = runOver(state) && !state.inspect.on && state.freeze <= 0
      const counting = !state.started && !runOver(state)

      header.style.display = showCard || state.inspect.on ? 'none' : 'flex'
      pause.style.display = showCard || counting || state.inspect.on ? 'none' : 'flex'
      applyGlass(pause, theme)
      pause.style.color = theme.ink

      for (const row of [ghostRow, barRow, badgeRow]) row.style.display = level.endless ? 'none' : ''
      endlessPill.style.display = level.endless ? 'block' : 'none'
      if (level.endless) applySolid(endlessPill, theme.ink, theme.snow)

      if (!level.endless) {
        applyGlass(barRow, theme)

        fromNode.textContent = String(level.index)
        applySolid(fromNode, theme.ink, theme.snow)
        toNode.textContent = level.bonus ? '★' : String(level.index + 1)
        applyGlass(toNode, theme, { tint: theme.trail, alpha: dark ? 0.5 : 0.85 })
        toNode.style.color = theme.ink

        track.style.background = withAlpha(theme.ink, dark ? 0.25 : 0.14)
        const progress = levelProgress(state)
        // The head is inside the bar, so the tooltips are placed off the track's own offsets —
        // layout px, so a CSS transform on the stage cannot skew them.
        const headXAt = (fraction: number, row: HTMLElement): number =>
          barRow.offsetLeft + track.offsetLeft - row.offsetLeft + fraction * track.offsetWidth
        fill.style.width = `${progress * 100}%`
        fill.style.background = `linear-gradient(90deg, ${withAlpha(theme.ink, 0.75)}, ${theme.ink})`

        // The ghost only lives until the live fill draws level with it — past that there is nothing
        // left to chase, and a mark behind you is just clutter.
        const ghostOn = state.bestReach > 0 && progress < state.bestReach
        ghost.style.display = ghostOn ? 'block' : 'none'
        ghostBadge.style.display = ghostOn ? 'block' : 'none'
        if (ghostOn) {
          ghost.style.width = `${state.bestReach * 100}%`
          ghost.style.background = withAlpha(theme.ink, dark ? 0.4 : 0.3)
          ghostBadge.textContent = `${Math.round(state.bestReach * 100)}%`
          ghostBadge.style.color = withAlpha(theme.ink, 0.45)
          ghostBadge.style.left = `${headXAt(state.bestReach, ghostRow)}px`
          ghostBadge.style.transform = 'translateX(calc(-50% + 4px))'
        }

        badge.textContent = `${Math.round(progress * 100)}%`
        applyGlass(badge, theme, { tint: theme.snow, alpha: dark ? 0.4 : 0.62 })
        badge.style.color = theme.ink
        const headX = headXAt(progress, badgeRow)
        badge.style.left = `${headX}px`
        badge.style.transform = 'translateX(-50%)'
        badgeTail.style.left = `${headX}px`
        badgeTail.style.transform = 'translateX(-50%) rotate(45deg)'
        applyGlass(badgeTail, theme, { tint: theme.snow, alpha: dark ? 0.4 : 0.62 })
        badgeTail.style.boxShadow = 'none'
        // The chips sit inside the pill, where their own drop reads as a blue glow trapped in it.
        // The tooltip hangs below it, so it gets a shallow one to lift it off the slope.
        for (const node of [fromNode, toNode]) node.style.boxShadow = 'none'
        badge.style.boxShadow = `0 2px 5px ${withAlpha(theme.ink, dark ? 0.3 : 0.14)}`
      }

      scoreLine.textContent = String(state.score)
      scoreLine.style.color = world.ball
      scoreLine.style.textShadow = `0 2px 10px ${withAlpha(world.ball, 0.22)}`
      // The number kicks on every tick, the way the original's does.
      if (state.score !== lastScore) {
        scoreLine.animate(
          [{ transform: 'scale(1.18)' }, { transform: 'scale(1)' }],
          { duration: 160, easing: 'ease-out' },
        )
        lastScore = state.score
      }

      comboLine.textContent = state.combo > 1 ? `${praiseFor(state.combo)} ×${state.combo}` : ''
      comboLine.style.color = world.ink

      countdown.style.display = counting ? 'flex' : 'none'
      if (counting) {
        applyGlass(countdownDisc, theme, { elevated: true })
        countdownDisc.style.color = theme.ink
        const tick = Math.ceil(state.countdown / COUNTDOWN_TICK_SECONDS)
        const text = tick > 0 ? String(tick) : 'GO'
        if (countdownDisc.textContent !== text) {
          countdownDisc.textContent = text
          // GO is two glyphs wide; at the digits' size it crowds the disc's rim.
          countdownDisc.classList.toggle('text-5xl', text === 'GO')
          countdownDisc.classList.toggle('text-7xl', text !== 'GO')
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
      finalScore.style.textShadow = `0 2px 10px ${withAlpha(theme.ball, 0.2)}`
      applySolid(primary, theme.ink, theme.snow)
      primary.textContent = state.finished ? 'Next level' : 'Retry'
      crashSite.style.background = theme.snow
      crashSite.style.borderColor = 'transparent'
      crashSite.style.color = theme.ink
      crashSite.style.boxShadow = `0 6px 16px ${withAlpha(theme.ink, 0.16)}`
      // A wall hit has no obstacle to inspect — the inspector would open on bare piste.
      const inspectable = !state.finished && state.lastHit?.kind !== 'wall'
      crashSite.style.display = inspectable ? 'block' : 'none'
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
