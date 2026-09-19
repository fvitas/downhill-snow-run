import type { GameState } from '../game/state.ts'
import { appendBadHit, loadBadHits } from '../game/storage.ts'

const ZOOM_LEVELS = [1, 4, 8, 16, 32]

const BUTTON_CLASSES =
  'rounded bg-slate-800/90 px-3 py-2 text-xs font-medium text-slate-100 active:bg-slate-700'

export type Inspector = {
  root: HTMLElement
  open: () => void
  close: () => void
}

export const createInspector = (state: GameState): Inspector => {
  const root = document.createElement('div')
  root.className = 'pointer-events-auto absolute inset-0 z-30 touch-auto'
  root.dataset.ui = ''
  root.style.display = 'none'

  const bar = document.createElement('div')
  bar.className =
    'absolute inset-x-0 bottom-0 flex flex-wrap items-center gap-2 bg-slate-900/90 p-3 ' +
    'pb-[calc(env(safe-area-inset-bottom)+0.75rem)]'

  const info = document.createElement('div')
  info.className = 'w-full font-mono text-[11px] leading-tight text-slate-300'

  const zoomRow = document.createElement('div')
  zoomRow.className = 'flex gap-1'

  for (const level of ZOOM_LEVELS) {
    const button = document.createElement('button')
    button.type = 'button'
    button.textContent = `×${level}`
    button.className = BUTTON_CLASSES
    button.addEventListener('click', () => {
      state.inspect.zoom = level
      state.inspect.panX = 0
      state.inspect.panY = 0
    })
    zoomRow.append(button)
  }

  const flag = document.createElement('button')
  flag.type = 'button'
  flag.className = `${BUTTON_CLASSES} bg-red-900/90 active:bg-red-800`

  const syncFlag = () => {
    flag.textContent = `Flag bad hit (${loadBadHits().length})`
  }

  flag.addEventListener('click', () => {
    if (!state.lastHit) return
    appendBadHit(state.lastHit, state.tuning)
    syncFlag()
  })

  const close = document.createElement('button')
  close.type = 'button'
  close.textContent = 'Close'
  close.className = BUTTON_CLASSES
  close.addEventListener('click', () => {
    state.inspect.on = false
    root.style.display = 'none'
  })

  bar.append(info, zoomRow, flag, close)
  root.append(bar)

  // Drag anywhere above the bar to pan the magnified view.
  let dragging = false
  root.addEventListener('pointerdown', (event: PointerEvent) => {
    if (event.target !== root) return
    dragging = true
    root.setPointerCapture(event.pointerId)
  })
  root.addEventListener('pointermove', (event: PointerEvent) => {
    if (!dragging) return
    state.inspect.panX += event.movementX
    state.inspect.panY += event.movementY
  })
  const endDrag = () => {
    dragging = false
  }
  root.addEventListener('pointerup', endDrag)
  root.addEventListener('pointercancel', endDrag)

  return {
    root,
    open: () => {
      state.inspect.on = true
      state.inspect.panX = 0
      state.inspect.panY = 0
      root.style.display = 'block'
      syncFlag()

      const hit = state.lastHit
      if (!hit) return
      const gap = hit.tree
        ? Math.hypot(hit.ball.x - hit.tree.x, hit.ball.y - hit.tree.y).toFixed(2)
        : '—'
      const box = hit.tree ? `${hit.tree.rx.toFixed(2)} × ${hit.tree.ry.toFixed(2)}` : '—'
      info.textContent =
        `${hit.kind} hit at ${hit.score} m · ${Math.round(hit.speed)} px/s · ` +
        `${hit.angleDeg.toFixed(0)}°\nball r=${hit.ball.radius} · centre gap ${gap} px · ` +
        `hitbox ${box} px`
    },
    close: () => {
      state.inspect.on = false
      root.style.display = 'none'
    },
  }
}
