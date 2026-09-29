import type { Theme } from '../game/themes.ts'

// One material for every panel in the game: a blurred backdrop, a bright top edge and a specular
// sheen. The sheen sits on -z-10 so it washes the background but never the text on top of it.
// Callers must position the element themselves (relative or absolute): the sheen is an
// absolutely positioned pseudo-element and needs this box as its containing block.
export const GLASS_EDGE =
  'isolate overflow-hidden border ' +
  'before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:-z-10 ' +
  "before:h-1/2 before:bg-gradient-to-b before:from-white/55 before:to-transparent before:content-['']"

// Over the moving slope a backdrop blur is redone every frame, so controls there take GLASS_EDGE.
export const GLASS = `${GLASS_EDGE} backdrop-blur-xl backdrop-saturate-150`

export const PRESS = 'transition-transform duration-150 ease-out active:scale-[0.96]'

const hexToRgb = (hex: string): [number, number, number] => {
  const value = hex.replace('#', '')
  const full =
    value.length === 3
      ? value
          .split('')
          .map((char) => char + char)
          .join('')
      : value
  const int = Number.parseInt(full, 16)
  return [(int >> 16) & 255, (int >> 8) & 255, int & 255]
}

export const withAlpha = (hex: string, alpha: number): string => {
  const [r, g, b] = hexToRgb(hex)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

// Night Run is a dark world: its glass needs a dim tint and a faint edge, not a white one.
export const isDarkTheme = (theme: Theme): boolean => {
  const [r, g, b] = hexToRgb(theme.snow)
  return (r * 0.299 + g * 0.587 + b * 0.114) / 255 < 0.5
}

export type GlassOptions = { tint?: string; alpha?: number; elevated?: boolean }

export const applyGlass = (element: HTMLElement, theme: Theme, options: GlassOptions = {}): void => {
  const dark = isDarkTheme(theme)
  const tint = options.tint ?? (dark ? theme.trail : theme.snow)
  element.style.background = withAlpha(tint, options.alpha ?? (dark ? 0.46 : 0.58))
  element.style.borderColor = dark ? 'rgba(255, 255, 255, 0.16)' : 'rgba(255, 255, 255, 0.72)'
  element.style.boxShadow = options.elevated
    ? '0 20px 45px rgba(15, 23, 42, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.55)'
    : '0 8px 20px rgba(15, 23, 42, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.5)'
}

// A filled control is flat: no bright top edge, no white rim — on dark ink both read as a stray
// highlight. All it keeps is a drop shadow in its own colour.
export const applySolid = (element: HTMLElement, fill: string, ink: string): void => {
  element.style.background = fill
  element.style.color = ink
  element.style.borderColor = 'transparent'
  element.style.boxShadow = `0 8px 18px ${withAlpha(fill, 0.2)}`
}
