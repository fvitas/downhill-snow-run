import { DEFAULT_PRESET } from './game/config.ts'
import { stepAvalanche } from './game/avalanche.ts'
import { checkCollisions } from './game/collision.ts'
import { attachInput } from './game/input.ts'
import { attachPause, tryLockPortrait } from './game/pause.ts'
import { emitSpray, stepParticles } from './game/particles.ts'
import { stepPhysics } from './game/physics.ts'
import { clampLevelIndex, extendCourse } from './game/levels.ts'
import {
  clearedBefore,
  loadProgress,
  recordOf,
  recordReach,
  recordRun,
  saveProgress,
} from './game/progress.ts'
import { render, stepEffects } from './game/render.ts'
import { stepRocks } from './game/rocks.ts'
import { render3d } from './game/render3d.ts'
import {
  cameraY,
  createState,
  finishY,
  levelProgress,
  PIXELS_PER_METRE,
  runActive,
  runOver,
  scoreDistance,
  startLevel,
  COUNTDOWN_SECONDS,
  type GameState,
} from './game/state.ts'
import { loadTuning } from './game/storage.ts'
import { updateTerrain } from './game/terrain.ts'
import { createViewport } from './game/viewport.ts'
import { themeForWorld } from './game/themes.ts'
import { createConfetti } from './ui/confetti.ts'
import { createHud, type Hud, type HudActions } from './ui/hud.ts'
import { createInspector } from './ui/inspect.ts'
import { createLevelMap } from './ui/map.ts'
import { createTuningPanel } from './ui/sliders.ts'

const MAX_FRAME_SECONDS = 1 / 30
const TRAIL_POINT_SPACING = 8
const TRAIL_TAIL_PX = 260
// "GO" holds just long enough to read before the slope moves.
const GO_HOLD_SECONDS = 0.3
// How long the ball skis on past the tape before the card judges the run.
const FINISH_COAST_SECONDS = 0.35

export type GameMount = {
  stage: HTMLElement
  canvas: HTMLCanvasElement
  overlay: HTMLElement
  overlayMessage: HTMLElement
  // mockups/picker.tsx runs the game in a phone frame: it sizes the canvas off that frame instead
  // of the window, drops the sliders, and never writes to the save file the phone is playing.
  host?: HTMLElement
  tuningPanel?: boolean
  persist?: boolean
  // mockups/ui-style.html swaps the whole HUD layer per kit; everything else stays the game.
  hud?: HudFactory
}

export type HudFactory = (state: GameState, actions: HudActions) => Hud

export type Game = {
  state: GameState
  play: (levelIndex: number) => void
  openMap: () => void
  // The run reads state.theme every frame; the map only repaints when told to.
  refreshTheme: () => void
  stop: () => void
}

export const createGame = (mount: GameMount): Game => {
  const { stage, canvas, overlay, overlayMessage } = mount
  const persist = mount.persist ?? true

  let progress = loadProgress()
  const state = createState(loadTuning(DEFAULT_PRESET), progress.unlocked)
  // Written once per run, the frame the ball dies, so the next attempt can draw the ghost.
  let reachSaved = false

  const { ctx } = createViewport(canvas, mount.host)
  const inspector = createInspector(state)
  const confetti = createConfetti()

  const openMap = (): void => {
    state.screen = 'map'
    state.paused = false
    inspector.close()
    map.show(progress, state.level.index)
  }

  const play = (levelIndex: number): void => {
    const index = clampLevelIndex(levelIndex)
    // The tapped button keeps focus otherwise, and input.ts ignores keys aimed at UI.
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
    state.screen = 'run'
    map.hide()
    inspector.close()
    confetti.reset()
    startLevel(state, index)
    const record = recordOf(progress, index)
    state.bestScore = record.score
    state.bestReach = record.reach
    reachSaved = false
  }

  const map = createLevelMap(play)
  const pauseControl = attachPause(state, overlay, overlayMessage)

  const hud = (mount.hud ?? createHud)(state, {
    onRetry: () => play(state.level.index),
    onNext: () => play(state.level.index + 1),
    onCrashSite: inspector.open,
    onMenu: openMap,
    onPause: pauseControl.pause,
  })

  // Twelve sliders that can break the game — a playtest tool, never shipped.
  const panel = (mount.tuningPanel ?? import.meta.env.DEV) ? createTuningPanel(state) : null
  // Confetti sits over the finish card but under the map, which covers the whole stage.
  stage.append(hud.root, confetti.root, map.root, ...(panel ? [panel.root] : []), inspector.root)

  attachInput(state, stage)
  void tryLockPortrait()

  const saveReach = (): void => {
    reachSaved = true
    const next = recordReach(progress, state.level.index, levelProgress(state))
    if (next === progress) return
    progress = next
    if (persist) saveProgress(progress)
  }

  const crossFinish = (): void => {
    state.finished = true
    state.pressed = false
    const { index } = state.level
    state.newBest = clearedBefore(progress, index) && state.score > state.bestScore
    progress = recordRun(progress, index, state.score)
    progress.coins += state.runCoins
    progress.diamonds += state.runDiamonds
    if (persist) saveProgress(progress)
  }

  // Crossing the tape doesn't end the run on the spot: the ball skis through it for a beat, which
  // reads as finishing rather than as hitting a stop.
  const stepFinish = (state: GameState, dt: number): void => {
    if (state.dead) return
    if (state.coast > 0) {
      state.coast -= dt
      if (state.coast <= 0) crossFinish()
    } else if (state.y >= finishY(state)) {
      state.coast = FINISH_COAST_SECONDS
      confetti.celebrate()
    }
  }

  const stepCountIn = (dt: number): void => {
    state.countdown -= dt
    if (state.countdown <= -GO_HOLD_SECONDS) state.started = true
  }

  const stepRun = (dt: number): void => {
    stepPhysics(state, dt)
    scoreDistance(state)
    extendCourse(state.level, state.course, state.y)
    stepRocks(state, dt)
    stepAvalanche(state, dt)
    state.elapsed += dt
    // Past the tape nothing can touch you — not a stray trunk, not the wall.
    if (state.coast <= 0) checkCollisions(state)
    stepFinish(state, dt)
    if (state.dead && !reachSaved) saveReach()

    const last = state.trail[state.trail.length - 1]
    if (!last || Math.hypot(state.x - last.x, state.y - last.y) > TRAIL_POINT_SPACING) {
      state.trail.push({ x: state.x, y: state.y })
    }
    while ((state.trail[0]?.y ?? Infinity) < state.y - TRAIL_TAIL_PX) state.trail.shift()

    emitSpray(state, dt)
  }

  let previous = performance.now()
  let handle = 0

  const frame = (now: number): void => {
    const dt = Math.min((now - previous) / 1_000, MAX_FRAME_SECONDS)
    previous = now
    handle = requestAnimationFrame(frame)

    if (state.screen === 'map') return

    if (!state.paused) {
      if (!state.started && !runOver(state)) stepCountIn(dt)
      else if (runActive(state)) stepRun(dt)

      // Effects outlive the run: the crash burst and the impact hold both keep counting down.
      stepParticles(state, dt)
      stepEffects(state, dt)
    }

    const camY = cameraY(state)
    updateTerrain(state, camY)
    if (state.style === 'faux3d') render3d(ctx, state)
    else render(ctx, state, camY)
    hud.update()
    panel?.setReadout(
      `${Math.round(state.speed)} px/s · ${Math.round(state.y / PIXELS_PER_METRE)} m · ` +
        `L${state.level.index} d${state.level.difficulty.toFixed(2)}`,
    )
  }

  state.countdown = COUNTDOWN_SECONDS
  openMap()
  handle = requestAnimationFrame(frame)

  return {
    state,
    play,
    openMap,
    refreshTheme: () => {
      state.theme = themeForWorld(state.level.world)
      map.redraw()
    },
    stop: () => cancelAnimationFrame(handle),
  }
}
