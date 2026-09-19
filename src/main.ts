import './style.css'
import { DEFAULT_PRESET } from './game/config.ts'
import { checkCollisions } from './game/collision.ts'
import { attachInput } from './game/input.ts'
import { attachPause, tryLockPortrait } from './game/pause.ts'
import { emitSpray, stepParticles } from './game/particles.ts'
import { stepPhysics } from './game/physics.ts'
import { render } from './game/render.ts'
import { render3d } from './game/render3d.ts'
import { cameraY, createState, finishY, PIXELS_PER_METRE, resetRun, runOver } from './game/state.ts'
import { loadBest, loadBestTime, loadTuning, saveBest, saveBestTime } from './game/storage.ts'
import { updateTerrain } from './game/terrain.ts'
import { createViewport } from './game/viewport.ts'
import { createHud } from './ui/hud.ts'
import { createInspector } from './ui/inspect.ts'
import { createTuningPanel } from './ui/sliders.ts'

const MAX_FRAME_SECONDS = 1 / 30
const TRAIL_POINT_SPACING = 8
const TRAIL_TAIL_PX = 260

const stage = document.querySelector<HTMLElement>('#stage')
const canvas = document.querySelector<HTMLCanvasElement>('#game')
const overlay = document.querySelector<HTMLElement>('#overlay')
const overlayMessage = document.querySelector<HTMLElement>('#overlay-message')

if (!stage || !canvas || !overlay || !overlayMessage) throw new Error('Missing stage markup')

const state = createState(loadTuning(DEFAULT_PRESET))
resetRun(state)
state.best = loadBest()
state.bestTime = loadBestTime(state.tuning.finishDistanceM)

const { ctx } = createViewport(canvas)
const inspector = createInspector(state)
const restart = (): void => {
  resetRun(state)
  // The finish distance may have moved on the panel, and best times are kept per distance.
  state.bestTime = loadBestTime(state.tuning.finishDistanceM)
}

const hud = createHud(state, restart, inspector.open)
// Twelve sliders that can break the game — a playtest tool, never shipped.
const panel = import.meta.env.DEV ? createTuningPanel(state) : null
stage.append(hud.root, ...(panel ? [panel.root] : []), inspector.root)

if (import.meta.env.DEV) Reflect.set(window, 'ski', state)

attachInput(state, stage)
attachPause(state, overlay, overlayMessage)
void tryLockPortrait()

const crossFinish = (): void => {
  state.finished = true
  state.score = state.tuning.finishDistanceM
  // Read fresh: the finish slider may have moved since the run started.
  const previous = loadBestTime(state.tuning.finishDistanceM)
  const improved = previous === 0 || state.elapsed < previous
  state.bestTime = improved ? state.elapsed : previous
  if (improved) saveBestTime(state.tuning.finishDistanceM, state.elapsed)
}

let previous = performance.now()

const frame = (now: number): void => {
  const dt = Math.min((now - previous) / 1_000, MAX_FRAME_SECONDS)
  previous = now

  if (!state.paused && !runOver(state)) {
    stepPhysics(state, dt)
    state.elapsed += dt

    const wasBest = state.best
    state.score = Math.floor(state.y / PIXELS_PER_METRE)
    checkCollisions(state)
    if (state.best > wasBest) saveBest(state.best)
    if (!state.dead && state.y >= finishY(state)) crossFinish()

    const last = state.trail[state.trail.length - 1]
    if (!last || Math.hypot(state.x - last.x, state.y - last.y) > TRAIL_POINT_SPACING) {
      state.trail.push({ x: state.x, y: state.y })
    }
    while ((state.trail[0]?.y ?? Infinity) < state.y - TRAIL_TAIL_PX) state.trail.shift()

    emitSpray(state, dt)
  }

  // Keeps the crash burst animating after death, but freezes everything while paused.
  if (!state.paused) {
    stepParticles(state, dt)
    state.wallFlash = Math.max(0, state.wallFlash - dt * 2.5)
  }

  const camY = cameraY(state)
  updateTerrain(state, camY)
  if (state.style === 'faux3d') render3d(ctx, state)
  else render(ctx, state, camY)
  hud.update()
  panel?.setReadout(
    `${Math.round(state.speed)} px/s · ${Math.round(state.y / PIXELS_PER_METRE)} m · ` +
      `${state.elapsed.toFixed(1)}s`,
  )

  requestAnimationFrame(frame)
}

requestAnimationFrame(frame)
