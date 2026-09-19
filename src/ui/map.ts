import {
  LEVELS_PER_WORLD,
  WORLD_COUNT,
  levelAt,
  worldOf,
} from '../game/levels.ts'
import { recordOf, totalStars, type Progress } from '../game/progress.ts'
import { createRng, hashSeed, rngInt, rngRange, type Rng } from '../game/rng.ts'
import { themeForWorld, UI_THEME, type Theme } from '../game/themes.ts'
import { applyGlass, applySolid, GLASS, PRESS, isDarkTheme, withAlpha } from './glass.ts'

export type LevelMap = {
  root: HTMLElement
  show: (progress: Progress, focusLevel: number) => void
  hide: () => void
  // Same world, same scroll position, fresh colours — for a live theme edit or a resize.
  redraw: () => void
}

const NODE_STEP = 112
const NODE_SIZE = 56
const TOP_PAD = 150
const BOTTOM_PAD = 150
const SWING = 0.27
const PISTE_HALF = 38
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

// Where the middle of the run is at a given height — everything else is placed off this.
const pisteXAt = (y: number, width: number): number => {
  const t = Math.min(LEVELS_PER_WORLD - 1.001, Math.max(0, (y - TOP_PAD) / NODE_STEP))
  const index = Math.floor(t)
  const frac = t - index
  const from = nodeX(index, width)
  const to = nodeX(index + 1, width)
  return from + (to - from) * (frac * frac * (3 - 2 * frac))
}

const SVG_NS = 'http://www.w3.org/2000/svg'

const svg = <K extends keyof SVGElementTagNameMap>(
  name: K,
  attributes: Record<string, string | number>,
): SVGElementTagNameMap[K] => {
  const element = document.createElementNS(SVG_NS, name)
  for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, String(value))
  return element
}

// Three stacked tiers: the same pine the slope is made of, seen from the map's distance.
const pinePath = (x: number, y: number, size: number): string => {
  const tier = (i: number): string => {
    const half = size * (0.6 - i * 0.14)
    const top = y - size * (0.95 + i * 0.4)
    const base = y - size * (0.2 + i * 0.4)
    return `M ${x - half} ${base} L ${x} ${top} L ${x + half} ${base} Z`
  }
  return `${tier(0)} ${tier(1)} ${tier(2)}`
}

const CONTOUR_STEP = 190
const CONTOUR_DROP_M = 30

// Contour lines with their heights called out: the one thing that makes a drawing read as a map.
const addContours = (scene: SVGElement, width: number, theme: Theme, world: number): void => {
  const summit = 1_600 + world * 40
  for (let y = TOP_PAD - 40; y < CONTENT_HEIGHT - 60; y += CONTOUR_STEP) {
    const sag = 26 + ((y / CONTOUR_STEP) % 3) * 8
    scene.append(
      svg('path', {
        d: `M -10 ${y} Q ${width * 0.3} ${y + sag} ${width * 0.55} ${y} T ${width + 10} ${y - sag * 0.4}`,
        fill: 'none',
        stroke: withAlpha(theme.ink, 0.08),
        'stroke-width': 1,
      }),
    )
    const label = svg('text', {
      x: 8,
      y: y - 5,
      fill: withAlpha(theme.ink, 0.28),
      'font-size': 9,
      'font-weight': 600,
      'letter-spacing': 0.5,
    })
    label.textContent = `${summit - Math.round((y - TOP_PAD) / CONTOUR_STEP) * CONTOUR_DROP_M} m`
    scene.append(label)
  }
}

// Clusters, not a uniform sprinkle: a forest has thickets and glades.
const addForest = (
  scene: SVGElement,
  rng: Rng,
  width: number,
  theme: Theme,
  dark: boolean,
): void => {
  const group = svg('g', {})
  for (let y = 20; y < CONTENT_HEIGHT - 20; y += rngRange(rng, 90, 170)) {
    const side = rng() < 0.5 ? -1 : 1
    const lane = pisteXAt(y, width)
    const spread = rngRange(rng, 30, 90)
    const centre = lane + side * rngRange(rng, PISTE_HALF + 40, PISTE_HALF + 120)
    const count = rngInt(rng, 3, 7)

    for (let i = 0; i < count; i += 1) {
      const treeY = y + rngRange(rng, -spread, spread)
      const treeX = centre + rngRange(rng, -spread, spread)
      // The run is kept clear: trees crowd the treeline but never stand on the piste.
      if (Math.abs(treeX - pisteXAt(treeY, width)) < PISTE_HALF + 16) continue
      if (treeX < 6 || treeX > width - 6) continue
      const size = rngRange(rng, 9, 16)
      group.append(
        svg('path', {
          d: pinePath(treeX, treeY, size),
          fill: rng() < 0.5 ? theme.treeDark : theme.treeLight,
          opacity: dark ? 0.85 : 0.92,
        }),
      )
      group.append(
        svg('ellipse', {
          cx: treeX + size * 0.3,
          cy: treeY + 2,
          rx: size * 0.5,
          ry: size * 0.18,
          fill: withAlpha(theme.ink, 0.1),
        }),
      )
    }
  }
  scene.append(group)
}

const PYLON_STEP = 260

// A chairlift running the length of the map: the piste has to come from somewhere.
const addLift = (scene: SVGElement, width: number, theme: Theme, world: number): void => {
  const side = world % 2 === 0 ? 1 : -1
  const topX = width / 2 + side * width * 0.41
  const bottomX = width / 2 + side * width * 0.33
  const top = 60
  const bottom = CONTENT_HEIGHT - 90
  const lineX = (y: number): number => topX + ((bottomX - topX) * (y - top)) / (bottom - top)
  const group = svg('g', {})

  group.append(
    svg('line', {
      x1: topX,
      y1: top,
      x2: bottomX,
      y2: bottom,
      stroke: withAlpha(theme.ink, 0.35),
      'stroke-width': 1.5,
    }),
  )

  for (let y = top; y <= bottom; y += PYLON_STEP) {
    const x = lineX(y)
    group.append(
      svg('line', {
        x1: x - 7,
        y1: y,
        x2: x + 7,
        y2: y,
        stroke: withAlpha(theme.ink, 0.5),
        'stroke-width': 2.5,
        'stroke-linecap': 'round',
      }),
    )
  }

  for (let y = top + PYLON_STEP / 2; y <= bottom; y += PYLON_STEP / 2) {
    const x = lineX(y)
    group.append(
      svg('rect', {
        x: x - 3,
        y: y - 3,
        width: 6,
        height: 6,
        rx: 1.5,
        fill: withAlpha(theme.ink, 0.55),
      }),
    )
  }

  scene.append(group)
}

// The peak the run drops off, and the lodge it ends at.
const addLandmarks = (scene: SVGElement, width: number, theme: Theme, world: number): void => {
  const peakX = pisteXAt(0, width)
  const ridge = svg('path', {
    d:
      `M ${peakX - 150} 96 L ${peakX - 66} 22 L ${peakX - 14} 70 L ${peakX + 40} 10 ` +
      `L ${peakX + 96} 68 L ${peakX + 168} 96 Z`,
    fill: withAlpha(theme.ink, 0.1),
  })
  const cap = svg('path', {
    d: `M ${peakX + 12} 42 L ${peakX + 40} 10 L ${peakX + 70} 44 L ${peakX + 48} 36 ` +
      `L ${peakX + 30} 48 Z`,
    fill: withAlpha(theme.snow, 0.95),
  })
  const summit = svg('text', {
    x: peakX,
    y: 118,
    fill: withAlpha(theme.ink, 0.6),
    'font-size': 10,
    'font-weight': 700,
    'letter-spacing': 2,
    'text-anchor': 'middle',
  })
  summit.textContent = `SUMMIT · ${1_600 + world * 40} m`

  const baseX = pisteXAt(CONTENT_HEIGHT, width)
  const baseY = CONTENT_HEIGHT - 72
  const lodge = svg('g', {})
  lodge.append(
    svg('rect', {
      x: baseX - 26,
      y: baseY,
      width: 52,
      height: 30,
      rx: 4,
      fill: withAlpha(theme.ink, 0.55),
    }),
    svg('path', {
      d: `M ${baseX - 34} ${baseY} L ${baseX} ${baseY - 20} L ${baseX + 34} ${baseY} Z`,
      fill: withAlpha(theme.ink, 0.75),
    }),
    svg('rect', { x: baseX - 14, y: baseY + 9, width: 10, height: 10, fill: theme.snow }),
    svg('rect', { x: baseX + 5, y: baseY + 9, width: 10, height: 10, fill: theme.snow }),
  )
  const baseLabel = svg('text', {
    x: baseX,
    y: baseY + 48,
    fill: withAlpha(theme.ink, 0.6),
    'font-size': 10,
    'font-weight': 700,
    'letter-spacing': 2,
    'text-anchor': 'middle',
  })
  baseLabel.textContent = 'BASE'

  scene.append(ridge, cap, summit, lodge, baseLabel)
}

const MARKER_STEP = 96

// Slope poles down both edges of the run, the way a groomed piste is fenced.
const addPoles = (scene: SVGElement, width: number, theme: Theme): void => {
  const group = svg('g', {})
  for (let y = TOP_PAD - 60; y < CONTENT_HEIGHT - 40; y += MARKER_STEP) {
    const lane = pisteXAt(y, width)
    for (const side of [-1, 1]) {
      group.append(
        svg('circle', {
          cx: lane + side * (PISTE_HALF + 5),
          cy: y,
          r: 2.4,
          fill: side < 0 ? withAlpha(theme.ball, 0.85) : withAlpha(theme.ink, 0.35),
        }),
      )
    }
  }
  scene.append(group)
}

export const createLevelMap = (onPlay: (level: number) => void): LevelMap => {
  const root = document.createElement('div')
  root.className = 'absolute inset-0 z-20 flex flex-col overflow-hidden'
  root.style.display = 'none'

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

  const nodes = document.createElement('div')
  nodes.className = 'absolute inset-0'

  canvas.append(piste, nodes)
  scroller.append(canvas)
  root.append(header, scroller)

  let shownProgress: Progress | null = null
  let shownWorld = 1

  const drawScene = (width: number, theme: Theme, world: number): void => {
    const dark = isDarkTheme(theme)
    const rng = createRng(hashSeed(world, 0x9a5))
    piste.replaceChildren()
    piste.setAttribute('width', String(width))
    piste.setAttribute('viewBox', `0 0 ${width} ${CONTENT_HEIGHT}`)

    // The mountain face is a shade off the snow so the groomed run can read as the bright part.
    piste.append(
      svg('rect', {
        x: 0,
        y: 0,
        width,
        height: CONTENT_HEIGHT,
        fill: withAlpha(theme.ink, dark ? 0.22 : 0.05),
      }),
    )

    addContours(piste, width, theme, world)
    addLandmarks(piste, width, theme, world)

    const path = ribbonPath(width)
    piste.append(
      svg('path', {
        d: path,
        fill: 'none',
        stroke: withAlpha(theme.ink, 0.11),
        'stroke-width': PISTE_HALF * 2 + 10,
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round',
      }),
      svg('path', {
        d: path,
        fill: 'none',
        stroke: theme.snow,
        'stroke-width': PISTE_HALF * 2,
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round',
      }),
      // Groomer corduroy: the run is a worked surface, not a blank stripe.
      svg('path', {
        d: path,
        fill: 'none',
        stroke: withAlpha(theme.ink, 0.08),
        'stroke-width': PISTE_HALF * 2 - 6,
        'stroke-dasharray': '1 9',
        'stroke-linecap': 'round',
      }),
    )

    addPoles(piste, width, theme)
    addLift(piste, width, theme, world)
    addForest(piste, rng, width, theme, dark)
  }

  const renderWorld = (progress: Progress, world: number, focusLevel: number): void => {
    shownProgress = progress
    shownWorld = world

    // Only the drawn piste carries the world's colours here. Every control on top of it is fixed
    // chrome, so the map reads the same in world one and world six.
    const sceneTheme = themeForWorld(world)
    const theme = UI_THEME
    const dark = isDarkTheme(theme)
    const width = scroller.clientWidth || 360
    root.style.background = theme.snow
    root.style.color = theme.ink

    applyGlass(nav, theme, { elevated: true })
    nav.style.color = theme.ink
    worldName.textContent = sceneTheme.name.toUpperCase()

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

    drawScene(width, sceneTheme, world)

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

  const redraw = (): void => {
    if (shownProgress) renderWorld(shownProgress, shownWorld, -1)
  }

  // Node positions are in pixels, so a rotation or a resized window has to redraw them.
  window.addEventListener('resize', () => {
    if (root.style.display !== 'none') redraw()
  })

  return {
    root,
    redraw,
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
