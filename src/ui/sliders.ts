import { PRESET_NAMES, PRESETS, TUNING_FIELDS } from '../game/config.ts'
import type { GameState } from '../game/state.ts'
import { resetRun } from '../game/state.ts'
import { clearBadHits, clearTuning, loadBadHits, saveTuning } from '../game/storage.ts'

// touch-auto undoes the body's touch-none — without it range inputs can't be dragged on mobile.
const PANEL_CLASSES =
  'absolute inset-x-0 bottom-0 max-h-[70vh] touch-auto overflow-y-auto bg-slate-900/95 ' +
  'text-slate-100 px-4 pt-3 text-xs pb-[calc(env(safe-area-inset-bottom)+4rem)] hidden'

const BUTTON_CLASSES = 'rounded bg-slate-700 px-3 py-1.5 text-xs font-medium active:bg-slate-600'

export type TuningPanel = {
  root: HTMLElement
  setReadout: (text: string) => void
}

export const createTuningPanel = (state: GameState): TuningPanel => {
  const root = document.createElement('div')
  root.className = 'pointer-events-none absolute inset-0 z-20'

  const toggle = document.createElement('button')
  toggle.type = 'button'
  toggle.textContent = '⚙'
  // Bottom-left corner: the top belongs to the level bar and the map's total pill. z-10 keeps the
  // cog above the panel, which opens over this corner, so it can close it again.
  toggle.className =
    'pointer-events-auto absolute left-3 bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] ' +
    'z-10 size-10 touch-auto rounded-full bg-slate-900/70 text-lg text-white'
  toggle.dataset.ui = ''

  const readout = document.createElement('div')
  readout.className =
    'pointer-events-none absolute left-3 bottom-[calc(env(safe-area-inset-bottom)+3.75rem)] ' +
    'rounded bg-slate-900/70 px-2 py-1 font-mono text-[11px] text-white empty:hidden'

  const panel = document.createElement('div')
  panel.className = `pointer-events-auto ${PANEL_CLASSES}`
  panel.dataset.ui = ''

  const presetRow = document.createElement('div')
  presetRow.className = 'mb-3 flex flex-wrap gap-2'

  const json = document.createElement('pre')
  json.className = 'mt-3 rounded bg-slate-950 p-2 font-mono text-[10px] leading-tight text-sky-300'

  const syncJson = () => {
    json.textContent = JSON.stringify(state.tuning, null, 2)
  }

  const rebuild = () => {
    for (const field of TUNING_FIELDS) {
      const input = panel.querySelector<HTMLInputElement>(`input[name="${field.key}"]`)
      const value = panel.querySelector<HTMLElement>(`[data-value="${field.key}"]`)
      if (input) input.value = String(state.tuning[field.key])
      if (value) value.textContent = `${state.tuning[field.key]} ${field.unit}`
    }
    syncJson()
    saveTuning(state.tuning)
  }

  for (const name of PRESET_NAMES) {
    const button = document.createElement('button')
    button.type = 'button'
    button.textContent = name
    button.className = `${BUTTON_CLASSES} capitalize`
    button.addEventListener('click', () => {
      Object.assign(state.tuning, PRESETS[name])
      resetRun(state)
      rebuild()
    })
    presetRow.append(button)
  }

  const restart = document.createElement('button')
  restart.type = 'button'
  restart.textContent = 'Restart'
  restart.className = BUTTON_CLASSES
  restart.addEventListener('click', () => resetRun(state))
  presetRow.append(restart)

  const style = document.createElement('button')
  style.type = 'button'
  style.textContent = '3D'
  style.className = BUTTON_CLASSES
  style.addEventListener('click', () => {
    state.style = state.style === 'faux3d' ? 'flat' : 'faux3d'
    style.textContent = state.style === 'faux3d' ? '3D' : 'Flat'
  })
  presetRow.append(style)

  panel.append(presetRow)

  for (const field of TUNING_FIELDS) {
    const row = document.createElement('label')
    row.className = 'mb-2 block'

    const head = document.createElement('div')
    head.className = 'flex items-baseline justify-between'

    const label = document.createElement('span')
    label.textContent = field.label

    const value = document.createElement('span')
    value.className = 'font-mono text-[11px] text-slate-400'
    value.dataset.value = field.key
    value.textContent = `${state.tuning[field.key]} ${field.unit}`

    head.append(label, value)

    const input = document.createElement('input')
    input.type = 'range'
    input.name = field.key
    input.min = String(field.min)
    input.max = String(field.max)
    input.step = String(field.step)
    input.value = String(state.tuning[field.key])
    input.className = 'w-full accent-sky-400'
    input.addEventListener('input', (event: Event) => {
      const next = Number((event.currentTarget as HTMLInputElement).value)
      state.tuning[field.key] = next
      value.textContent = `${next} ${field.unit}`
      syncJson()
      saveTuning(state.tuning)
    })

    row.append(head, input)
    panel.append(row)
  }

  const copy = document.createElement('button')
  copy.type = 'button'
  copy.textContent = 'Copy'
  copy.className = BUTTON_CLASSES
  copy.addEventListener('click', () => {
    // Clipboard API is unavailable over plain http on LAN, so the JSON block stays readable.
    void navigator.clipboard?.writeText(JSON.stringify(state.tuning, null, 2)).catch(() => {})
  })
  presetRow.append(copy)

  const badHits = document.createElement('button')
  badHits.type = 'button'
  badHits.className = BUTTON_CLASSES
  const syncBadHits = () => {
    badHits.textContent = `Bad hits (${loadBadHits().length})`
  }
  badHits.addEventListener('click', () => {
    const hits = loadBadHits()
    json.textContent = hits.length === 0 ? 'No flagged hits' : JSON.stringify(hits, null, 2)
  })
  presetRow.append(badHits)

  const clearHits = document.createElement('button')
  clearHits.type = 'button'
  clearHits.textContent = 'Clear hits'
  clearHits.className = BUTTON_CLASSES
  clearHits.addEventListener('click', () => {
    clearBadHits()
    syncBadHits()
    syncJson()
  })
  presetRow.append(clearHits)

  const clear = document.createElement('button')
  clear.type = 'button'
  clear.textContent = 'Clear saved'
  clear.className = BUTTON_CLASSES
  clear.addEventListener('click', () => {
    clearTuning()
    Object.assign(state.tuning, PRESETS.snappy)
    resetRun(state)
    rebuild()
  })
  presetRow.append(clear)

  panel.append(json)
  syncJson()
  syncBadHits()

  toggle.addEventListener('click', () => panel.classList.toggle('hidden'))

  root.append(readout, toggle, panel)

  return {
    root,
    setReadout: (text: string) => {
      readout.textContent = text
    },
  }
}
