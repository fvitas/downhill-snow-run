import { runOver, type GameState } from '../game/state.ts'

export type Hud = {
  root: HTMLElement
  update: () => void
}

export const createHud = (
  state: GameState,
  onRestart: () => void,
  onInspect: () => void,
): Hud => {
  const root = document.createElement('div')
  root.className = 'pointer-events-none absolute inset-0 z-10'

  const score = document.createElement('div')
  score.className =
    'absolute inset-x-0 top-[calc(env(safe-area-inset-top)+3.5rem)] text-center ' +
    'text-5xl font-bold text-amber-500'

  const best = document.createElement('div')
  best.className =
    'absolute inset-x-0 top-[calc(env(safe-area-inset-top)+1.25rem)] text-center ' +
    'text-base font-semibold text-stone-500'

  const gameOver = document.createElement('div')
  gameOver.className =
    'pointer-events-auto absolute inset-0 flex flex-col items-center justify-center gap-2 ' +
    'bg-[#faf7f0]/85 text-stone-700'
  gameOver.style.display = 'none'

  const title = document.createElement('div')
  title.className = 'text-2xl font-bold tracking-wide text-emerald-700'

  const finalScore = document.createElement('div')
  finalScore.className = 'text-7xl font-bold text-amber-500'

  const finalBest = document.createElement('div')
  finalBest.className = 'text-lg font-semibold text-stone-500'

  const prompt = document.createElement('div')
  prompt.className = 'mt-6 text-base font-medium text-stone-400'
  prompt.textContent = 'Tap to play again'

  const inspect = document.createElement('button')
  inspect.type = 'button'
  inspect.textContent = 'Inspect crash'
  inspect.className =
    'mt-8 rounded bg-slate-800/90 px-4 py-2 text-xs font-medium text-slate-100 active:bg-slate-700'
  inspect.dataset.ui = ''
  inspect.addEventListener('pointerdown', (event: PointerEvent) => {
    event.preventDefault()
    event.stopPropagation()
    onInspect()
  })

  gameOver.append(title, finalScore, finalBest, prompt, inspect)

  gameOver.addEventListener('pointerdown', (event: PointerEvent) => {
    event.preventDefault()
    event.stopPropagation()
    onRestart()
  })

  root.append(best, score, gameOver)

  let wasShowingCard = false

  return {
    root,
    update: () => {
      // Counts down: on a bounded course "180 m to go" is tension, distance travelled is trivia.
      score.textContent = `${Math.max(0, state.tuning.finishDistanceM - state.score)} m`
      best.textContent = state.bestTime > 0 ? `Best: ${state.bestTime.toFixed(1)}s` : ''

      // The card steps aside while the crash is being inspected, so the zoom stays readable.
      const showCard = runOver(state) && !state.inspect.on
      if (showCard === wasShowingCard) return

      wasShowingCard = showCard
      gameOver.style.display = showCard ? 'flex' : 'none'
      score.style.visibility = runOver(state) ? 'hidden' : 'visible'
      best.style.visibility = runOver(state) ? 'hidden' : 'visible'

      title.textContent = state.finished ? 'FINISH' : ''
      title.style.display = state.finished ? 'block' : 'none'
      // A finished run always covers the same distance, so the time is the result that varies.
      finalScore.textContent = state.finished
        ? `${state.elapsed.toFixed(1)}s`
        : `${state.score} m`
      finalBest.textContent = state.finished
        ? `Best: ${state.bestTime > 0 ? `${state.bestTime.toFixed(1)}s` : '—'}`
        : `of ${state.tuning.finishDistanceM} m`
      inspect.style.display = state.finished ? 'none' : 'block'
    },
  }
}
