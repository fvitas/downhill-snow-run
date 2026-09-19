import {
  LEVELS_PER_WORLD,
  WORLD_COUNT,
  levelAt,
  worldOf,
} from '../game/levels.ts'
import { recordOf, totalStars, type Progress } from '../game/progress.ts'
import { themeForWorld } from '../game/themes.ts'

export type LevelMap = {
  root: HTMLElement
  show: (progress: Progress, focusLevel: number) => void
  hide: () => void
}

const NODE_STEP = 112
const NODE_SIZE = 56
const TOP_PAD = 70
const BOTTOM_PAD = 90
const SWING = 0.27
const CONTENT_HEIGHT = TOP_PAD + (LEVELS_PER_WORLD - 1) * NODE_STEP + BOTTOM_PAD

// The piste snakes down the screen; every node sits on it.
const nodeX = (indexInWorld: number, width: number): number =>
  width / 2 + Math.sin(indexInWorld * 0.9) * (width * SWING)

const nodeY = (indexInWorld: number): number => TOP_PAD + indexInWorld * NODE_STEP

// Quadratic through the midpoints, so the ribbon rounds each turn instead of kinking.
const ribbonPath = (width: number): string => {
  const point = (i: number) => ({ x: nodeX(i, width), y: nodeY(i) })
  const first = point(0)
  const parts = [`M ${first.x} 0`, `L ${first.x} ${first.y}`]

  for (let i = 1; i < LEVELS_PER_WORLD - 1; i += 1) {
    const current = point(i)
    const next = point(i + 1)
    parts.push(`Q ${current.x} ${current.y} ${(current.x + next.x) / 2} ${(current.y + next.y) / 2}`)
  }

  const last = point(LEVELS_PER_WORLD - 1)
  parts.push(`L ${last.x} ${last.y}`, `L ${last.x} ${CONTENT_HEIGHT}`)
  return parts.join(' ')
}

const SVG_NS = 'http://www.w3.org/2000/svg'

export const createLevelMap = (onPlay: (level: number) => void): LevelMap => {
  const root = document.createElement('div')
  root.className = 'absolute inset-0 z-20 flex flex-col'
  root.style.display = 'none'

  const header = document.createElement('div')
  header.className =
    'relative shrink-0 px-4 pb-1 pt-[calc(env(safe-area-inset-top)+0.75rem)]'

  const worldName = document.createElement('div')
  worldName.className = 'text-center text-xl font-bold tracking-widest'

  const worldNote = document.createElement('div')
  worldNote.className = 'text-center text-xs font-medium opacity-60'

  const starCount = document.createElement('div')
  starCount.className =
    'absolute right-4 top-[calc(env(safe-area-inset-top)+1rem)] text-sm font-bold text-amber-500'

  const strip = document.createElement('div')
  strip.className = 'flex shrink-0 gap-1.5 overflow-x-auto px-4 py-2'
  strip.dataset.ui = ''

  const scroller = document.createElement('div')
  scroller.className = 'relative grow overflow-y-auto'
  scroller.dataset.ui = ''

  const canvas = document.createElement('div')
  canvas.className = 'relative w-full'
  canvas.style.height = `${CONTENT_HEIGHT}px`

  const piste = document.createElementNS(SVG_NS, 'svg')
  piste.setAttribute('class', 'pointer-events-none absolute left-0 top-0')
  piste.setAttribute('height', String(CONTENT_HEIGHT))

  const ribbon = document.createElementNS(SVG_NS, 'path')
  ribbon.setAttribute('fill', 'none')
  ribbon.setAttribute('stroke-width', '44')
  ribbon.setAttribute('stroke-linecap', 'round')
  ribbon.setAttribute('stroke-linejoin', 'round')
  piste.append(ribbon)

  const nodes = document.createElement('div')
  nodes.className = 'absolute inset-0'

  canvas.append(piste, nodes)
  scroller.append(canvas)
  header.append(worldName, worldNote, starCount)
  root.append(header, strip, scroller)

  let shownProgress: Progress | null = null
  let shownWorld = 1

  const renderWorld = (progress: Progress, world: number, focusLevel: number): void => {
    shownProgress = progress
    shownWorld = world

    const theme = themeForWorld(world)
    const width = scroller.clientWidth || 360
    root.style.background = theme.snow
    root.style.color = theme.ink
    worldName.textContent = theme.name.toUpperCase()

    const first = (world - 1) * LEVELS_PER_WORLD + 1
    worldNote.textContent = `World ${world} · levels ${first}–${first + LEVELS_PER_WORLD - 1}`
    starCount.textContent = `★ ${totalStars(progress)}`

    strip.replaceChildren()
    const reachedWorld = worldOf(progress.unlocked)
    for (let w = 1; w <= WORLD_COUNT; w += 1) {
      const reachable = reachedWorld >= w
      const chip = document.createElement('button')
      chip.type = 'button'
      chip.textContent = String(w)
      chip.className = 'shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold'
      chip.dataset.ui = ''
      chip.style.background = w === world ? theme.ink : theme.trail
      chip.style.color = w === world ? theme.snow : theme.ink
      chip.style.opacity = reachable ? '1' : '0.4'
      if (reachable) chip.addEventListener('click', () => renderWorld(progress, w, first))
      strip.append(chip)
    }

    piste.setAttribute('width', String(width))
    piste.setAttribute('viewBox', `0 0 ${width} ${CONTENT_HEIGHT}`)
    ribbon.setAttribute('stroke', theme.trail)
    ribbon.setAttribute('d', ribbonPath(width))

    nodes.replaceChildren()
    for (let i = 0; i < LEVELS_PER_WORLD; i += 1) {
      const index = first + i
      const level = levelAt(index)
      const record = recordOf(progress, index)
      const locked = index > progress.unlocked
      const x = nodeX(i, width)
      const y = nodeY(i)

      const node = document.createElement('button')
      node.type = 'button'
      node.dataset.ui = ''
      node.className =
        'absolute flex items-center justify-center rounded-full text-base font-bold shadow'
      node.style.width = `${NODE_SIZE}px`
      node.style.height = `${NODE_SIZE}px`
      node.style.left = `${x - NODE_SIZE / 2}px`
      node.style.top = `${y - NODE_SIZE / 2}px`
      node.style.background = locked ? theme.snow : record.stars > 0 ? theme.ink : theme.ball
      node.style.color = theme.ink
      node.style.opacity = locked ? '0.75' : '1'
      if (!locked) node.style.color = theme.snow
      node.textContent = locked ? '🔒' : level.bonus ? '◆' : String(index)
      if (index === progress.unlocked) {
        node.style.outline = `3px solid ${theme.ink}`
        node.style.outlineOffset = '4px'
      }
      if (!locked) node.addEventListener('click', () => onPlay(index))
      nodes.append(node)

      if (record.stars > 0) {
        const earned = document.createElement('div')
        earned.className = 'absolute text-center text-xs leading-none text-amber-400'
        earned.style.left = `${x - 30}px`
        earned.style.top = `${y + NODE_SIZE / 2 + 3}px`
        earned.style.width = '60px'
        earned.textContent = '★'.repeat(record.stars) + '☆'.repeat(3 - record.stars)
        nodes.append(earned)
      }

      const tag = level.bonus ? 'coin run' : level.avalanche ? 'avalanche' : null
      if (tag && !locked) {
        const label = document.createElement('div')
        label.className = 'absolute text-center text-[10px] font-bold uppercase leading-none opacity-60'
        label.style.left = `${x - 40}px`
        label.style.top = `${y - NODE_SIZE / 2 - 14}px`
        label.style.width = '80px'
        label.textContent = tag
        nodes.append(label)
      }
    }

    const focusInWorld = focusLevel - first
    if (focusInWorld >= 0 && focusInWorld < LEVELS_PER_WORLD) {
      scroller.scrollTop = Math.max(0, nodeY(focusInWorld) - scroller.clientHeight * 0.55)
    }
  }

  // Node positions are in pixels, so a rotation or a resized window has to redraw them.
  window.addEventListener('resize', () => {
    if (shownProgress && root.style.display !== 'none') {
      renderWorld(shownProgress, shownWorld, -1)
    }
  })

  return {
    root,
    show: (progress, focusLevel) => {
      root.style.display = 'flex'
      renderWorld(progress, worldOf(focusLevel), focusLevel)
    },
    hide: () => {
      root.style.display = 'none'
    },
  }
}
