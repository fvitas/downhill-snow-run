const FLIGHT_MS = 560
const PUNCH_MS = 260
// The pill's text is about a third the size of the flying number.
const END_SCALE = 0.35

export type FlyOptions = {
  text: string
  color: string
  from: DOMRect
  to: DOMRect
  onHit: () => void
}

export const reducedMotion = (): boolean =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

// A number slides in a straight line from `from` into `to`, shrinking at the same steady rate, then
// hands over to `onHit`.
export const flyNumber = ({ text, color, from, to, onHit }: FlyOptions): void => {
  const flyer = document.createElement('div')
  flyer.className = 'pointer-events-none fixed left-0 top-0 z-50 text-5xl font-bold tabular-nums tracking-tight'
  flyer.textContent = text
  flyer.style.color = color
  flyer.style.textShadow = '0 2px 12px rgba(0, 0, 0, 0.35)'
  document.body.append(flyer)

  const box = flyer.getBoundingClientRect()
  const start = { x: from.x + from.width / 2 - box.width / 2, y: from.y + from.height / 2 - box.height / 2 }
  const end = { x: to.x + to.width / 2 - box.width / 2, y: to.y + to.height / 2 - box.height / 2 }

  const move = flyer.animate(
    [
      { transform: `translate(${start.x}px, ${start.y}px) scale(1)` },
      { transform: `translate(${end.x}px, ${end.y}px) scale(${END_SCALE})` },
    ],
    { duration: FLIGHT_MS, easing: 'linear', fill: 'forwards' },
  )

  move.addEventListener('finish', () => {
    flyer.remove()
    onHit()
  })
}

export const punch = (element: HTMLElement): void => {
  element.animate(
    [{ transform: 'scale(1)' }, { transform: 'scale(1.18)', offset: 0.4 }, { transform: 'scale(1)' }],
    { duration: PUNCH_MS, easing: 'cubic-bezier(0.2, 0.9, 0.3, 1.2)' },
  )
}
