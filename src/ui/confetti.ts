import confetti from 'canvas-confetti'

const COLORS = ['#ff7a2f', '#ffd166', '#4cc9f0', '#ffffff', '#b8f2e6']
// Paper size multiplier. The slope is drawn at 540×960 logical px, so default-scale confetti reads
// as grit rather than paper.
const SCALAR = 1.35

export type Confetti = {
  root: HTMLCanvasElement
  celebrate: () => void
  reset: () => void
}

export const createConfetti = (): Confetti => {
  const root = document.createElement('canvas')
  root.className = 'pointer-events-none absolute inset-0 z-20 h-full w-full'

  const fire = confetti.create(root, { resize: true, useWorker: true })

  // Two cannons angled in from the bottom corners. Nothing fires at the ball itself, so the
  // finish card comes up into a clear middle.
  const celebrate = (): void => {
    for (const side of [0, 1]) {
      void fire({
        particleCount: 80,
        angle: side === 0 ? 58 : 122,
        spread: 72,
        startVelocity: 66,
        ticks: 220,
        scalar: SCALAR,
        origin: { x: side, y: 1 },
        colors: COLORS,
        disableForReducedMotion: true,
      })
    }
  }

  return { root, celebrate, reset: () => void fire.reset() }
}
