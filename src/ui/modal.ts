import { createElement, X } from 'lucide'
import { UI_THEME } from '../game/themes.ts'
import { applyGlass, GLASS, PRESS, withAlpha } from './glass.ts'
import { playClick } from './sound.ts'

export type Modal = { root: HTMLElement; sheet: HTMLElement; open: () => void }

// A titled glass sheet over the dimmed screen: the × or a tap outside it closes it.
export const createModal = (titleText: string, onShow?: () => void, onHide?: () => void): Modal => {
  const ink = UI_THEME.ink
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
  title.textContent = titleText
  const close = document.createElement('button')
  close.type = 'button'
  close.ariaLabel = 'Close'
  close.className = `${PRESS} flex h-9 w-9 items-center justify-center rounded-full`
  close.style.background = withAlpha(ink, 0.08)
  close.append(createElement(X, { width: 18, height: 18, 'stroke-width': 2.25, 'aria-hidden': 'true' }))
  header.append(title, close)
  sheet.append(header)
  root.append(sheet)

  const hide = (): void => {
    root.style.display = 'none'
    onHide?.()
  }

  root.addEventListener('click', (event: MouseEvent) => {
    if (event.target === root) hide()
  })
  close.addEventListener('click', () => {
    playClick()
    hide()
  })

  return {
    root,
    sheet,
    open: () => {
      root.style.display = 'flex'
      onShow?.()
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
