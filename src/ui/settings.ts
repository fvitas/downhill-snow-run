import { Capacitor } from '@capacitor/core'
import { Haptics, ImpactStyle } from '@capacitor/haptics'
import {
  Activity,
  Bug,
  ChevronRight,
  createElement,
  Gauge,
  Lightbulb,
  Star,
  Vibrate,
  Volume2,
  type IconNode,
} from 'lucide'
import { version } from '../../package.json'
import { setSetting, setting, watchSettings, type SettingKey } from '../game/settings.ts'
import { UI_THEME } from '../game/themes.ts'
import { hasFpsCap } from './fps-cap.ts'
import { withAlpha } from './glass.ts'
import { createModal } from './modal.ts'
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
  ...(hasFpsCap ? [{ key: 'fpsCap' as const, label: 'Limit to 60 fps', on: Gauge }] : []),
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
  const { root, sheet, open } = createModal('Settings')

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
    group(TOGGLES.map(({ key, label, on }) => switchRow(key, label, on))),
    group(links),
    footer,
  )

  return { root, open }
}
