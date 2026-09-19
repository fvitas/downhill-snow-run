import {
  LEVELS_PER_WORLD,
  WORLD_COUNT,
  levelAt,
  worldOf,
} from '../game/levels.ts'
import { recordOf, totalStars, type Progress } from '../game/progress.ts'
import { themeForWorld } from '../game/themes.ts'
import { applyGlass, applySolid, GLASS, PRESS, isDarkTheme, withAlpha } from './glass.ts'

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

// Frosted glass over a flat colour looks like nothing, so the world's colours bloom behind it.
const blob = (position: string, size: string): HTMLElement => {
  const element = document.createElement('div')
  element.className = `absolute ${position} ${size} rounded-full blur-3xl`
  return element
}

export const createLevelMap = (onPlay: (level: number) => void): LevelMap => {
  const root = document.createElement('div')
  root.className = 'absolute inset-0 z-20 flex flex-col overflow-hidden'
  root.style.display = 'none'

  const glow = document.createElement('div')
  glow.className = 'pointer-events-none absolute inset-0 -z-10'
  const glowTop = blob('-left-16 -top-10', 'h-64 w-64')
  const glowMid = blob('-right-20 top-1/3', 'h-72 w-72')
  const glowLow = blob('-bottom-16 left-1/4', 'h-64 w-64')
  glow.append(glowTop, glowMid, glowLow)

  const header = document.createElement('div')
  header.className = 'shrink-0 px-3 pt-[calc(env(safe-area-inset-top)+0.5rem)]'

  const nav = document.createElement('div')
  nav.className = `${GLASS} relative rounded-[1.75rem] px-4 pb-2.5 pt-3.5`

  const titleRow = document.createElement('div')
  titleRow.className = 'relative flex flex-col items-center'

  const worldName = document.createElement('div')
  worldName.className = 'text-center text-xl font-bold tracking-[0.2em]'

  const worldNote = document.createElement('div')
  worldNote.className = 'text-center text-[0.7rem] font-medium opacity-55'

  const starCount = document.createElement('div')
  starCount.className =
    `${GLASS} absolute -top-0.5 left-0 rounded-full px-2.5 py-1 text-xs font-bold tabular-nums ` +
    'text-amber-500'

  titleRow.append(worldName, worldNote, starCount)

  const strip = document.createElement('div')
  strip.className = 'mt-3 flex gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none]'
  strip.dataset.ui = ''

  nav.append(titleRow, strip)
  header.append(nav)

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

  const ribbonEdge = document.createElementNS(SVG_NS, 'path')
  ribbonEdge.setAttribute('fill', 'none')
  ribbonEdge.setAttribute('stroke-width', '44')
  ribbonEdge.setAttribute('stroke-linecap', 'round')
  ribbonEdge.setAttribute('stroke-linejoin', 'round')
  ribbonEdge.setAttribute('stroke-dasharray', '2 14')
  ribbonEdge.setAttribute('opacity', '0.35')
  piste.append(ribbon, ribbonEdge)

  const nodes = document.createElement('div')
  nodes.className = 'absolute inset-0'

  canvas.append(piste, nodes)
  scroller.append(canvas)
  root.append(glow, header, scroller)

  let shownProgress: Progress | null = null
  let shownWorld = 1

  const renderWorld = (progress: Progress, world: number, focusLevel: number): void => {
    shownProgress = progress
    shownWorld = world

    const theme = themeForWorld(world)
    const dark = isDarkTheme(theme)
    const width = scroller.clientWidth || 360
    root.style.background = theme.snow
    root.style.color = theme.ink
    glowTop.style.background = withAlpha(theme.ball, 0.3)
    glowMid.style.background = withAlpha(theme.trail, 0.7)
    glowLow.style.background = withAlpha(theme.ball, 0.18)

    applyGlass(nav, theme, { elevated: true })
    nav.style.color = theme.ink
    worldName.textContent = theme.name.toUpperCase()

    const first = (world - 1) * LEVELS_PER_WORLD + 1
    worldNote.textContent = `World ${world} · levels ${first}–${first + LEVELS_PER_WORLD - 1}`
    starCount.textContent = `★ ${totalStars(progress)}`
    applyGlass(starCount, theme, { tint: theme.snow, alpha: dark ? 0.35 : 0.65 })

    strip.replaceChildren()
    const reachedWorld = worldOf(progress.unlocked)
    for (let w = 1; w <= WORLD_COUNT; w += 1) {
      const reachable = reachedWorld >= w
      const current = w === world
      const chip = document.createElement('button')
      chip.type = 'button'
      chip.textContent = String(w)
      chip.className = `${GLASS} ${PRESS} relative shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold`
      chip.dataset.ui = ''
      if (current) applySolid(chip, theme.ink, theme.snow)
      else {
        applyGlass(chip, theme, { tint: theme.trail, alpha: dark ? 0.4 : 0.6 })
        chip.style.color = theme.ink
      }
      chip.style.opacity = reachable ? '1' : '0.35'
      if (reachable) chip.addEventListener('click', () => renderWorld(progress, w, first))
      strip.append(chip)
    }

    piste.setAttribute('width', String(width))
    piste.setAttribute('viewBox', `0 0 ${width} ${CONTENT_HEIGHT}`)
    ribbon.setAttribute('stroke', withAlpha(theme.trail, dark ? 0.55 : 0.9))
    ribbon.setAttribute('d', ribbonPath(width))
    ribbonEdge.setAttribute('stroke', withAlpha(theme.snow, 0.9))
    ribbonEdge.setAttribute('d', ribbonPath(width))

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
        `${GLASS} ${PRESS} absolute flex items-center justify-center rounded-full text-base font-bold`
      node.style.width = `${NODE_SIZE}px`
      node.style.height = `${NODE_SIZE}px`
      node.style.left = `${x - NODE_SIZE / 2}px`
      node.style.top = `${y - NODE_SIZE / 2}px`

      if (locked) {
        applyGlass(node, theme, { tint: theme.snow, alpha: dark ? 0.3 : 0.55 })
        node.style.color = withAlpha(theme.ink, 0.6)
      } else {
        applySolid(node, record.stars > 0 ? theme.ink : theme.ball, theme.snow)
      }
      node.textContent = locked ? '🔒' : level.bonus ? '◆' : String(index)
      if (index === progress.unlocked) {
        node.style.outline = `3px solid ${withAlpha(theme.ink, 0.9)}`
        node.style.outlineOffset = '4px'
      }
      if (!locked) node.addEventListener('click', () => onPlay(index))
      nodes.append(node)

      if (record.stars > 0) {
        const earned = document.createElement('div')
        earned.className = 'absolute text-center text-xs leading-none text-amber-400'
        earned.style.left = `${x - 30}px`
        earned.style.top = `${y + NODE_SIZE / 2 + 5}px`
        earned.style.width = '60px'
        earned.textContent = '★'.repeat(record.stars) + '☆'.repeat(3 - record.stars)
        nodes.append(earned)
      }

      const tag = level.bonus ? 'coin run' : level.avalanche ? 'avalanche' : null
      if (tag && !locked) {
        const label = document.createElement('div')
        label.className =
          `${GLASS} absolute rounded-full px-2 py-0.5 text-center text-[0.6rem] font-bold uppercase tracking-wider`
        label.style.left = `${x - 45}px`
        label.style.top = `${y - NODE_SIZE / 2 - 20}px`
        label.style.width = '90px'
        applyGlass(label, theme, { tint: theme.snow, alpha: dark ? 0.35 : 0.7 })
        label.style.color = withAlpha(theme.ink, 0.8)
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
      root.animate(
        [{ opacity: 0, transform: 'scale(1.02)' }, { opacity: 1, transform: 'scale(1)' }],
        { duration: 220, easing: 'ease-out' },
      )
    },
    hide: () => {
      root.style.display = 'none'
    },
  }
}
