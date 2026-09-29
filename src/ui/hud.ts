import { createElement, Settings } from 'lucide'
import { rateRun } from '../game/levels.ts'
import {
  COUNTDOWN_TICK_SECONDS,
  levelProgress,
  runOver,
  type GameState,
} from '../game/state.ts'
import { UI_THEME } from '../game/themes.ts'
import { applyGlass, applySolid, GLASS, GLASS_EDGE, PRESS, isDarkTheme, withAlpha } from './glass.ts'
import { formatPoints } from './points.ts'
import { createPowerBadges } from './powers.ts'

export type HudActions = {
  onRetry: () => void
  onCrashSite: () => void
  onMenu: () => void
  onNext: () => void
  onPause: () => void
  onSettings: () => void
}

// Where the finish card's score sits on screen, so the map can fly the points off it.
export type ScoreAnchor = { rect: DOMRect; color: string }

export type Hud = {
  root: HTMLElement
  update: () => void
  scoreAnchor?: () => ScoreAnchor | null
}

const PRAISE = [
  'Clean!',
  'Smooth!',
  'Wow!',
  'Send it!',
  'Amazing!',
  'On fire!',
  'Full send!',
  'Master!',
  'Unstoppable!',
  'Godlike!',
  'Snow king!',
  'Mountain king!',
  'Ski god!',
]

// Lucide's `pause`, inlined — one icon does not justify the dependency. Solid bars, not the
// stroked default, so it still reads at arm's length on the slope.
const PAUSE_ICON =
  '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" class="h-6 w-6">' +
  '<rect x="14" y="3" width="4" height="18" rx="1.5" />' +
  '<rect x="6" y="3" width="4" height="18" rx="1.5" />' +
  '</svg>'

// Rungs sit two near misses apart at the bottom, three from `Amazing!` and four from
// `Unstoppable!`, so the top of the ladder takes real work to reach.
const WIDE_FROM = PRAISE.indexOf('Amazing!')
const WIDER_FROM = PRAISE.indexOf('Unstoppable!')

const rungWidth = (rung: number): number => (rung >= WIDER_FROM ? 4 : rung >= WIDE_FROM ? 3 : 2)

const praiseFor = (combo: number): string => {
  let left = Math.max(0, combo - 2)
  let rung = 0
  while (rung < PRAISE.length - 1 && left >= rungWidth(rung)) {
    left -= rungWidth(rung)
    rung += 1
  }
  return PRAISE[rung] ?? ''
}

export const button = (label: string, classes: string, onClick: () => void): HTMLButtonElement => {
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
    `${GLASS_EDGE} ${PRESS} pointer-events-auto absolute right-4 ` +
      'bottom-[calc(env(safe-area-inset-bottom)+1.25rem)] flex h-11 w-11 items-center ' +
      'justify-center rounded-full',
    actions.onPause,
  )
  pause.innerHTML = PAUSE_ICON

  const header = document.createElement('div')
  header.className =
    // The status bar is hidden natively, so iOS reports a tiny top inset while the Dynamic Island
    // is still physically there. The floor clears the island; the inset wins where it is larger.
    'absolute inset-x-0 top-[calc(max(env(safe-area-inset-top),2.75rem)+0.4rem)] ' +
    'flex flex-col items-center px-3'

  const barRow = document.createElement('div')
  barRow.className = 'relative flex w-[62%] items-center'

  const fromNode = document.createElement('div')
  fromNode.className =
    'relative z-20 -mr-1.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ' +
    'text-sm font-bold'

  const toNode = document.createElement('div')
  toNode.className =
    'relative -ml-[4.5px] flex h-10 w-10 shrink-0 items-center justify-center rounded-full ' +
    'border-[3px] text-sm font-bold'

  // Both ends tuck under the nodes. The right one sits over the ring's left arc and stops where its
  // edges meet the ring's stroke, so the ring reads as opening into the track.
  const track = document.createElement('div')
  track.className = 'relative z-10 h-5 grow overflow-hidden border-y-[3px]'

  // How far the best failed attempt got, painted over the bare track but under the live fill.
  const band = document.createElement('div')
  band.className = 'absolute inset-y-0 left-0'

  // No width transition: the fill is rewritten every frame, so easing it only leaves the head
  // trailing the badge that is meant to point at it.
  const fill = document.createElement('div')
  fill.className = 'absolute inset-y-0 left-0'
  track.append(band, fill)

  barRow.append(fromNode, track, toNode)

  // The ghost badge is translucent, so its caret sits flush: any overlap composites twice and shows
  // as a dark seam. The live one is opaque, so its caret tucks 1px under to close the hairline gap.
  const caret = (pointsUp: boolean): HTMLElement => {
    const element = document.createElement('div')
    element.className =
      `absolute left-1/2 h-1.5 w-[13px] -translate-x-1/2 ${pointsUp ? 'bottom-[calc(100%-1px)]' : 'top-full'} ` +
      (pointsUp
        ? '[clip-path:polygon(50%_0,100%_100%,0_100%)]'
        : '[clip-path:polygon(0_0,100%_0,50%_100%)]')
    return element
  }

  const pill = (top: string): HTMLElement => {
    const element = document.createElement('div')
    element.className =
      `absolute ${top} flex -translate-x-1/2 items-center gap-1 whitespace-nowrap ` +
      'rounded-[8px] px-2.5 py-[3px] text-[0.8rem] font-bold tabular-nums'
    return element
  }

  // Hangs off the fill head: the caret points at the exact spot you are on the piste.
  const liveBadge = pill('top-[5px]')
  const liveCaret = caret(true)

  // The best failed run's own mark. It rides above the bar while the live one hangs below, so the
  // two can never collide, and it goes quiet once this run is past it.
  const bestBadge = pill('bottom-1.5')
  const bestCaret = caret(false)
  const bestText = document.createElement('span')
  bestBadge.append(bestText, bestCaret)

  const liveText = document.createElement('span')
  liveBadge.append(liveText, liveCaret)

  const ghostRow = document.createElement('div')
  ghostRow.className = 'relative h-[30px] w-full'
  ghostRow.append(bestBadge)

  const badgeRow = document.createElement('div')
  badgeRow.className = 'relative h-[30px] w-full'
  badgeRow.append(liveBadge)

  // Level 500 has no tape to reach, so it gets no bar and no percentage — this stands in for the
  // whole row, and the score below it is the only number on the screen.
  const endlessPill = document.createElement('div')
  endlessPill.className = 'rounded-full px-4 py-1.5 text-[0.7rem] font-bold tracking-[0.35em]'
  endlessPill.textContent = 'ENDLESS'

  const scoreLine = document.createElement('div')
  scoreLine.className = 'text-6xl font-bold tabular-nums tracking-tight'

  // Full width so the power-ups can hang off the right edge, the first one level with the score.
  const powers = createPowerBadges(state)
  const scoreRow = document.createElement('div')
  scoreRow.className = 'relative mt-4 flex w-full justify-center'
  scoreRow.append(scoreLine, powers.root)

  const comboLine = document.createElement('div')
  comboLine.className = 'h-7 text-xl font-semibold tracking-wide'

  header.append(ghostRow, barRow, badgeRow, endlessPill, scoreRow, comboLine)

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

  const verdict = document.createElement('div')
  verdict.className = 'mt-1 flex items-center gap-2'

  const rating = document.createElement('span')
  rating.className = 'text-lg font-bold'

  const newBest = document.createElement('span')
  newBest.className =
    'rounded-full bg-amber-400 px-2 py-0.5 text-[0.65rem] font-extrabold uppercase ' +
    'tracking-[0.12em] text-slate-900'
  newBest.textContent = 'New best'
  verdict.append(rating, newBest)

  const finalScore = document.createElement('div')
  finalScore.className = 'text-6xl font-bold tabular-nums tracking-tight'

  const detail = document.createElement('div')
  detail.className = 'text-sm font-semibold opacity-60'

  const buttons = document.createElement('div')
  buttons.className = 'mt-5 flex w-full flex-col items-stretch gap-2'

  const primary = button(
    'Let’s go again',
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

  sheet.append(title, verdict, finalScore, detail, buttons)

  // Where the map keeps its gear, so Settings is in the same corner on both screens. A click, not
  // the pointerdown the other buttons use: a click still to come would land on the sheet's backdrop
  // and close it again.
  const gear = document.createElement('button')
  gear.type = 'button'
  gear.ariaLabel = 'Settings'
  gear.dataset.ui = ''
  gear.className =
    'absolute right-4 top-[calc(max(env(safe-area-inset-top),2.75rem)+0.95rem)] flex h-[35px] ' +
    'w-[35px] items-center justify-center rounded-full bg-white/[0.16] text-white backdrop-blur-md ' +
    'transition-transform duration-150 ease-out active:scale-[0.92]'
  gear.append(createElement(Settings, { width: 19, height: 19, 'stroke-width': 2.5, 'aria-hidden': 'true' }))
  gear.addEventListener('click', actions.onSettings)

  card.append(sheet, gear)

  const countdown = document.createElement('div')
  countdown.className = 'absolute inset-0 flex items-center justify-center'
  countdown.style.display = 'none'

  const countdownDisc = document.createElement('div')
  countdownDisc.className =
    `${GLASS} relative flex h-36 w-36 items-center justify-center rounded-full font-bold`
  // Only the digit pops; the disc holds still so the count never flashes.
  const countdownText = document.createElement('span')
  countdownText.className = 'block'
  countdownDisc.append(countdownText)
  countdown.append(countdownDisc)

  root.append(pause, header, countdown, card)

  let cardShown = false

  return {
    root,
    scoreAnchor: () =>
      card.style.display === 'none'
        ? null
        : { rect: finalScore.getBoundingClientRect(), color: UI_THEME.ball },
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
      powers.update(!showCard && !state.inspect.on)
      // Without the blur the slope shows through sharp, so the tint is denser.
      applyGlass(pause, theme, { alpha: isDarkTheme(theme) ? 0.66 : 0.78 })
      pause.style.color = theme.ink

      for (const row of [ghostRow, barRow, badgeRow]) row.style.display = level.endless ? 'none' : ''
      endlessPill.style.display = level.endless ? 'block' : 'none'
      if (level.endless) applySolid(endlessPill, theme.ink, theme.snow)

      if (!level.endless) {
        // The bar sits on bare slope like the score, so it takes the world's colours too.
        const bar = { ...world, ...world.bar }
        const barDark = isDarkTheme(bar)
        const lift = `0 2px 6px ${withAlpha(bar.ink, barDark ? 0.35 : 0.16)}`

        fromNode.textContent = String(level.index)
        applySolid(fromNode, bar.ink, bar.snow)
        toNode.textContent = String(level.index + 1)
        toNode.style.background = bar.snow
        toNode.style.borderColor = bar.ink
        toNode.style.color = bar.ink
        for (const node of [fromNode, toNode, track]) node.style.boxShadow = 'none'
        // One shadow for the whole outline: per-element shadows would smear into the open ring.
        barRow.style.filter = `drop-shadow(${lift})`

        track.style.background = bar.snow
        track.style.borderColor = bar.ink
        const progress = levelProgress(state)
        // The head is inside the bar, so the tooltips are placed off the track's own offsets —
        // layout px, so a CSS transform on the stage cannot skew them.
        const headXAt = (fraction: number, row: HTMLElement): number =>
          barRow.offsetLeft + track.offsetLeft - row.offsetLeft + fraction * track.offsetWidth
        fill.style.width = `${progress * 100}%`
        fill.style.background = bar.ink

        // The best run only lives until the live fill draws level with it — past that there is
        // nothing left to chase, and a mark behind you is just clutter.
        const bestOn = state.bestReach > 0 && progress < state.bestReach
        const pale = withAlpha(bar.ink, barDark ? 0.45 : 0.32)
        band.style.display = bestOn ? 'block' : 'none'
        bestBadge.style.display = bestOn ? 'flex' : 'none'
        if (bestOn) {
          band.style.width = `${state.bestReach * 100}%`
          band.style.background = pale
          bestText.textContent = `${Math.round(state.bestReach * 100)}%`
          bestBadge.style.background = pale
          bestBadge.style.color = bar.snow
          bestCaret.style.background = pale
          bestBadge.style.left = `${headXAt(state.bestReach, ghostRow)}px`
        }

        liveText.textContent = `${Math.round(progress * 100)}%`
        liveBadge.style.background = bar.ink
        liveBadge.style.color = bar.snow
        // drop-shadow, not box-shadow: a box shadow follows the pill's rounded rect alone and its
        // edge cuts across the caret's base, so the caret reads as a hat sat on top.
        liveBadge.style.filter = `drop-shadow(${lift})`
        liveCaret.style.background = bar.ink
        liveBadge.style.left = `${headXAt(progress, badgeRow)}px`
      }

      scoreLine.textContent = formatPoints(state.score)
      scoreLine.style.color = world.ball
      scoreLine.style.textShadow = `0 2px 10px ${withAlpha(world.ball, 0.22)}`

      comboLine.textContent = state.combo > 1 ? `${praiseFor(state.combo)} ×${state.combo}` : ''
      // Same colour as the score, so the two lines read as one shout.
      comboLine.style.color = world.ball

      countdown.style.display = counting ? 'flex' : 'none'
      if (counting) {
        applyGlass(countdownDisc, theme, { elevated: true })
        countdownDisc.style.color = theme.ink
        const tick = Math.ceil(state.countdown / COUNTDOWN_TICK_SECONDS)
        const text = tick > 0 ? String(tick) : 'GO'
        if (countdownText.textContent !== text) {
          countdownText.textContent = text
          // GO is two glyphs wide; at the digits' size it crowds the disc's rim.
          countdownDisc.classList.toggle('text-5xl', text === 'GO')
          countdownDisc.classList.toggle('text-7xl', text !== 'GO')
          countdownText.animate(
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
      title.textContent = state.finished ? 'FINISH' : 'CRASHED'
      finalScore.textContent = formatPoints(state.score)
      finalScore.style.color = theme.ball
      finalScore.style.textShadow = `0 2px 10px ${withAlpha(theme.ball, 0.2)}`
      applySolid(primary, theme.ink, theme.snow)
      primary.textContent = state.finished ? 'Next level' : 'Let’s go again'
      crashSite.style.background = theme.snow
      crashSite.style.borderColor = 'transparent'
      crashSite.style.color = theme.ink
      crashSite.style.boxShadow = `0 6px 16px ${withAlpha(theme.ink, 0.16)}`
      // A wall hit has nothing to look at: the edge is the whole screen's side.
      const inspectable = !state.finished && state.lastHit !== null && state.lastHit.kind !== 'wall'
      crashSite.style.display = inspectable ? 'block' : 'none'
      menu.style.color = theme.ink

      const grade = state.finished ? rateRun(level, state.score, state.course.perfectScore) : null
      verdict.style.display = grade ? 'flex' : 'none'
      rating.textContent = grade ?? ''
      newBest.style.display = state.newBest ? 'inline-block' : 'none'

      // A crash banks nothing, so the best on show is the one already saved.
      const best = state.finished ? Math.max(state.bestScore, state.score) : state.bestScore
      detail.textContent = `Best: ${formatPoints(best)}`
    },
  }
}
