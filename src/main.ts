import './style.css'
import { DEFAULT_PRESET } from './game/config.ts'
import { checkCollisions, stepCombo } from './game/collision.ts'
import { attachInput } from './game/input.ts'
import { attachPause, tryLockPortrait } from './game/pause.ts'
import { emitSpray, stepParticles } from './game/particles.ts'
import { stepPhysics } from './game/physics.ts'
import { clampLevelIndex, starsFor } from './game/levels.ts'
import { loadProgress, recordOf, recordRun, saveProgress } from './game/progress.ts'
import { render, stepEffects } from './game/render.ts'
import { render3d } from './game/render3d.ts'
import {
  cameraY,
  createState,
  finishY,
  PIXELS_PER_METRE,
  runActive,
  runOver,
  startLevel,
  COUNTDOWN_SECONDS,
} from './game/state.ts'
import { loadTuning } from './game/storage.ts'
import { updateTerrain } from './game/terrain.ts'
import { createViewport } from './game/viewport.ts'
import { createHud } from './ui/hud.ts'
import { createInspector } from './ui/inspect.ts'
import { createLevelMap } from './ui/map.ts'
import { createTuningPanel } from './ui/sliders.ts'

const MAX_FRAME_SECONDS = 1 / 30
const TRAIL_POINT_SPACING = 8
const TRAIL_TAIL_PX = 260
// The count-in sits on -0.5 for half a second so "GO" is readable before the slope moves.
const GO_HOLD_SECONDS = 0.5

const stage = document.querySelector<HTMLElement>('#stage')
const canvas = document.querySelector<HTMLCanvasElement>('#game')
const overlay = document.querySelector<HTMLElement>('#overlay')
const overlayMessage = document.querySelector<HTMLElement>('#overlay-message')

if (!stage || !canvas || !overlay || !overlayMessage) throw new Error('Missing stage markup')

let progress = loadProgress()
const state = createState(loadTuning(DEFAULT_PRESET), progress.unlocked)

const { ctx } = createViewport(canvas)
const inspector = createInspector(state)

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
  startLevel(state, index)
  state.bestScore = recordOf(progress, index).score
}

const map = createLevelMap(play)
const pauseControl = attachPause(state, overlay, overlayMessage)

const hud = createHud(state, {
  onRetry: () => play(state.level.index),
  onNext: () => play(state.level.index + 1),
  onCrashSite: inspector.open,
  onMenu: openMap,
  onPause: pauseControl.pause,
})

// Twelve sliders that can break the game — a playtest tool, never shipped.
const panel = import.meta.env.DEV ? createTuningPanel(state) : null
stage.append(hud.root, map.root, ...(panel ? [panel.root] : []), inspector.root)

if (import.meta.env.DEV) Reflect.set(window, 'ski', state)

attachInput(state, stage)
void tryLockPortrait()

const crossFinish = (): void => {
  state.finished = true
  state.pressed = false
  const stars = starsFor(state.score, state.course.perfectScore)
  progress = recordRun(progress, state.level.index, stars, state.score)
  progress.coins += state.runCoins
  progress.diamonds += state.runDiamonds
  saveProgress(progress)
}

const stepCountIn = (dt: number): void => {
  state.countdown -= dt
  if (state.countdown <= -GO_HOLD_SECONDS) state.started = true
}

const stepRun = (dt: number): void => {
  stepPhysics(state, dt)
  state.elapsed += dt
  checkCollisions(state)
  stepCombo(state, dt)
  if (!state.dead && state.y >= finishY(state)) crossFinish()

  const last = state.trail[state.trail.length - 1]
  if (!last || Math.hypot(state.x - last.x, state.y - last.y) > TRAIL_POINT_SPACING) {
    state.trail.push({ x: state.x, y: state.y })
  }
  while ((state.trail[0]?.y ?? Infinity) < state.y - TRAIL_TAIL_PX) state.trail.shift()

  emitSpray(state, dt)
}

let previous = performance.now()

const frame = (now: number): void => {
  const dt = Math.min((now - previous) / 1_000, MAX_FRAME_SECONDS)
  previous = now
  requestAnimationFrame(frame)

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
requestAnimationFrame(frame)
