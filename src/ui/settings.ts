import { Capacitor } from '@capacitor/core'
import { Haptics, ImpactStyle } from '@capacitor/haptics'
import {
  Activity,
  Bug,
  ChevronRight,
  createElement,
  Lightbulb,
  Star,
  Vibrate,
  VibrateOff,
  Volume2,
  VolumeX,
  X,
  type IconNode,
} from 'lucide'
import { version } from '../../package.json'
import { setSetting, setting, watchSettings, type SettingKey } from '../game/settings.ts'
import { UI_THEME } from '../game/themes.ts'
import { applyGlass, GLASS, PRESS, withAlpha } from './glass.ts'
import { playClick } from './sound.ts'

const ISSUES_URL = 'https://github.com/fvitas/downhill-snow-run/issues/new'
// Filled in once the App Store listing exists; until then iOS has nothing to rate.
const APP_STORE_ID: string | null = null
const PLAY_STORE_ID = 'com.filipvitas.downhill'

const platform = Capacitor.getPlatform()

const rateUrl = (): string | null => {
  if (platform === 'android') return `https://play.google.com/store/apps/details?id=${PLAY_STORE_ID}`
  if (platform === 'ios' && APP_STORE_ID) {
    return `https://apps.apple.com/app/id${APP_STORE_ID}?action=write-review`
  }
  return null
}

// Extra params prefill the issue form's fields of the same id (.github/ISSUE_TEMPLATE).
const issueUrl = (template: string, fields: Record<string, string> = {}): string =>
  `${ISSUES_URL}?${new URLSearchParams({ template, ...fields })}`

const icon = (node: IconNode, size = 20): SVGElement =>
  createElement(node, { width: size, height: size, 'stroke-width': 2.25, 'aria-hidden': 'true' })

const TOGGLES: readonly { key: SettingKey; label: string; on: IconNode }[] = [
  { key: 'sound', label: 'Sound', on: Volume2 },
  { key: 'haptics', label: 'Haptics', on: Vibrate },
  { key: 'shake', label: 'Shake on crash', on: Activity },
]

// The click is silent once sound is off. Turning haptics on answers with a buzz, so it is felt.
const toggle = (key: SettingKey): void => {
  const next = !setting(key)
  setSetting(key, next)
  playClick()
  if (key === 'haptics' && next) {
    void Haptics.impact({ style: ImpactStyle.Medium }).catch(() => undefined)
  }
}

const ink = UI_THEME.ink

const rowClasses = 'flex w-full items-center gap-3 px-4 py-3 text-left text-[0.95rem] font-semibold'

const badge = (node: IconNode): HTMLSpanElement => {
  const element = document.createElement('span')
  element.className = 'flex h-8 w-8 shrink-0 items-center justify-center rounded-[0.6rem]'
  element.style.background = withAlpha(ink, 0.08)
  element.append(icon(node, 18))
  return element
}

const label = (text: string): HTMLSpanElement => {
  const element = document.createElement('span')
  element.className = 'grow'
  element.textContent = text
  return element
}

const switchRow = (key: SettingKey, text: string, node: IconNode): HTMLButtonElement => {
  const row = document.createElement('button')
  row.type = 'button'
  row.setAttribute('role', 'switch')
  row.className = rowClasses

  const track = document.createElement('span')
  track.className = 'relative h-[26px] w-[46px] shrink-0 rounded-full transition-colors duration-200'
  const knob = document.createElement('span')
  knob.className =
    'absolute left-[3px] top-[3px] h-5 w-5 rounded-full bg-white ' +
    'shadow-[0_2px_4px_rgba(15,23,42,0.25)] transition-transform duration-200 ease-out'
  track.append(knob)
  row.append(badge(node), label(text), track)

  const sync = (): void => {
    const on = setting(key)
    row.setAttribute('aria-checked', String(on))
    track.style.background = on ? ink : withAlpha(ink, 0.18)
    knob.style.transform = on ? 'translateX(20px)' : 'none'
  }
  sync()
  watchSettings(sync)
  row.addEventListener('click', () => toggle(key))
  return row
}

const linkRow = (text: string, node: IconNode, href: string): HTMLAnchorElement => {
  const row = document.createElement('a')
  row.href = href
  row.target = '_blank'
  row.rel = 'noopener'
  row.className = rowClasses
  const chevron = icon(ChevronRight, 18)
  chevron.classList.add('shrink-0', 'opacity-40')
  row.append(badge(node), label(text), chevron)
  row.addEventListener('click', playClick)
  return row
}

const group = (rows: readonly HTMLElement[]): HTMLDivElement => {
  const element = document.createElement('div')
  element.className = 'w-full divide-y overflow-hidden rounded-2xl'
  element.style.background = withAlpha('#ffffff', 0.55)
  for (const row of rows) row.style.borderColor = withAlpha(ink, 0.08)
  element.append(...rows)
  return element
}

export type SettingsSheet = { root: HTMLElement; open: () => void }

export const createSettingsSheet = (): SettingsSheet => {
  const root = document.createElement('div')
  root.className =
    'absolute inset-0 z-30 flex items-center justify-center bg-slate-900/45 backdrop-blur-sm'
  root.dataset.ui = ''
  root.style.display = 'none'

  const sheet = document.createElement('div')
  sheet.className = `${GLASS} relative flex w-[82%] flex-col items-center gap-3 rounded-[2rem] p-4 pt-5`
  applyGlass(sheet, UI_THEME, { alpha: 0.82, elevated: true })
  sheet.style.color = ink

  const header = document.createElement('div')
  header.className = 'flex w-full items-center justify-between pl-2'
  const title = document.createElement('div')
  title.className = 'text-xl font-bold'
  title.textContent = 'Settings'
  const close = document.createElement('button')
  close.type = 'button'
  close.ariaLabel = 'Close'
  close.className = `${PRESS} flex h-9 w-9 items-center justify-center rounded-full`
  close.style.background = withAlpha(ink, 0.08)
  close.append(icon(X, 18))
  header.append(title, close)

  const rate = rateUrl()
  const links = [
    ...(rate ? [linkRow('Rate Downhill', Star, rate)] : []),
    linkRow('Report a bug', Bug, issueUrl('bug-report.yml', { version })),
    linkRow('Request a feature', Lightbulb, issueUrl('feature-request.yml')),
  ]

  const footer = document.createElement('div')
  footer.className = 'pt-1 text-xs font-semibold opacity-50'
  footer.textContent = `Version ${version}`

  sheet.append(
    header,
    group(TOGGLES.map(({ key, label, on }) => switchRow(key, label, on))),
    group(links),
    footer,
  )
  root.append(sheet)

  const hide = (): void => {
    root.style.display = 'none'
  }

  // A tap on the dimmed map around the sheet closes it, the same as the ×.
  root.addEventListener('click', (event: MouseEvent) => {
    if (event.target === root) hide()
  })
  close.addEventListener('click', () => {
    playClick()
    hide()
  })

  return {
    root,
    open: () => {
      root.style.display = 'flex'
      sheet.animate(
        [
          { opacity: 0, transform: 'scale(0.94)' },
          { opacity: 1, transform: 'none' },
        ],
        { duration: 180, easing: 'cubic-bezier(0.2, 0.9, 0.3, 1.2)' },
      )
    },
  }
}

const QUICK: readonly { key: SettingKey; label: string; on: IconNode; off: IconNode }[] = [
  { key: 'sound', label: 'Sound', on: Volume2, off: VolumeX },
  { key: 'haptics', label: 'Haptics', on: Vibrate, off: VibrateOff },
]

// The pause screen's pair of icon switches. Any tap on that screen resumes the run, so these
// claim their own pointerdown before it reaches the overlay.
export const createQuickToggles = (): HTMLElement => {
  const root = document.createElement('div')
  root.className = 'flex gap-3'
  root.dataset.ui = ''

  for (const { key, label, on, off } of QUICK) {
    const button = document.createElement('button')
    button.type = 'button'
    button.setAttribute('role', 'switch')
    button.ariaLabel = label
    button.className =
      `${PRESS} flex h-12 w-12 items-center justify-center rounded-full border border-white/25 ` +
      'bg-white/15 text-white shadow-[0_18px_40px_rgba(15,23,42,0.35)] backdrop-blur-xl'

    const sync = (): void => {
      const enabled = setting(key)
      button.setAttribute('aria-checked', String(enabled))
      button.replaceChildren(icon(enabled ? on : off, 22))
      button.style.opacity = enabled ? '1' : '0.6'
    }
    sync()
    watchSettings(sync)

    button.addEventListener('pointerdown', (event: PointerEvent) => {
      event.preventDefault()
      event.stopPropagation()
      toggle(key)
    })
    root.append(button)
  }
  return root
}
