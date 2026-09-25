import { createElement, LockKeyhole } from 'lucide'
import 'number-flow'
import { LEVEL_COUNT, LEVELS_PER_WORLD, levelAt, type Level } from '../game/levels.ts'
import { recordOf, totalScore, type Progress } from '../game/progress.ts'
import { NIGHT_WORLD, PROP_SLUGS, WORLDS, worldName } from '../game/worlds.ts'
import { flyNumber, punch, reducedMotion } from './fly.ts'
import type { ScoreAnchor } from './hud.ts'
import { bakePlate, PLATE_H, PLATE_W, rowAt, SPLIT, type Plate } from './plate.ts'
import { formatPoints, POINTS_LOCALE } from './points.ts'

export type LevelMap = {
  root: HTMLElement
  // `from` is the finish card's score: when the total grew, the gain flies off it into the pill.
  show: (progress: Progress, focusLevel: number, from?: ScoreAnchor | null) => void
  hide: () => void
  redraw: () => void
}

// Stepping down in equal *height* leaves wider-looking gaps wherever the piste runs diagonally, so
// each node is instead placed this far from the previous one, centre to centre.
// Temporary, while obstacles are being designed: every level is playable in dev. Locked nodes
// keep their grey paint and the save is untouched, so the real position is still visible.
const UNLOCK_ALL_LEVELS = import.meta.env.DEV

const NODE_STEP = 85
// Extra run-in before the last level, so the finish gate clears the node above it.
const FINISH_GAP = 70
const NODE_MARGIN = 160
const PROP_MARGIN = 400
// Room below the last node for the finish gate and a little runout.
const TAIL_PAD = 280
// How far the night band takes to arrive, at each end of the world.
const NIGHT_FADE = 220
// Node 3 sits low into the bend below it; only the opening run is hand-placed.
const NUDGE: Record<number, { x: number; y: number }> = { 2: { x: 6, y: -14 } }

type PropPlacement = {
  sprite: string
  x: number
  y: number
  h: number
  flip: boolean
  i: number
}

const div = (className: string, style?: Partial<CSSStyleDeclaration>): HTMLDivElement => {
  const element = document.createElement('div')
  element.className = className
  if (style) Object.assign(element.style, style)
  return element
}

const loadProps = async (slug: string): Promise<PropPlacement[]> => {
  const response = await fetch(`/map/props/props-${slug}.json`)
  if (!response.ok) return []
  try {
    const data = (await response.json()) as { props?: Omit<PropPlacement, 'i'>[] }
    return (data.props ?? []).map((placement, i) => ({ ...placement, i }))
  } catch {
    return []
  }
}

export const createLevelMap = (onPlay: (level: number) => void): LevelMap => {
  const root = div('absolute inset-0 z-20 flex flex-col overflow-hidden bg-[#0a4478]')
  root.style.display = 'none'

  const stage = div('relative grow overflow-hidden')

  const scroller = div(
    'absolute inset-0 overflow-y-auto overscroll-contain [scrollbar-width:none] ' +
      '[&::-webkit-scrollbar]:w-0',
  )
  scroller.dataset.ui = ''

  // `isolate` boxes the night band's multiply blend in, so it can never reach the chrome above it.
  const track = div('relative isolate w-full bg-[#dbeaf4]')

  const artHead = div('pointer-events-none absolute inset-x-0 bg-[0_0] bg-no-repeat')
  const artBody = div('pointer-events-none absolute inset-x-0 bg-[0_0] bg-repeat-y')

  // Aurora Peak is night sprites on a daylight plate, so one world wears a night band. Two layers,
  // same split as the paint tool: a veil and a fog, so day and night art settle into the same
  // light. The mask fades both in and out, because a hard cut across the continuous plate reads
  // as a rendering fault.
  const nightLayer = (background: string, z: number): HTMLDivElement => {
    const layer = div('pointer-events-none absolute inset-x-0', {
      background,
      opacity: '.15',
      mixBlendMode: 'multiply',
      zIndex: String(z),
    })
    const mask =
      `linear-gradient(180deg, transparent, #000 ${NIGHT_FADE}px, ` +
      `#000 calc(100% - ${NIGHT_FADE}px), transparent)`
    layer.style.maskImage = mask
    layer.style.setProperty('-webkit-mask-image', mask)
    return layer
  }

  const veil = nightLayer('linear-gradient(180deg, #223a6e, #16233f)', 3)
  const fog = nightLayer('linear-gradient(180deg, #33456e, #5a6f96 45%, #33456e)', 3)
  const nightLayers = [veil, fog]

  // A prop's z-index is its plate row, so this layer must box those in or they outrank the nodes.
  const propsLayer = div('pointer-events-none absolute inset-0', { zIndex: '2' })
  const nodesLayer = div('pointer-events-none absolute inset-0', { zIndex: '5' })

  track.append(artHead, artBody, veil, propsLayer, fog, nodesLayer)
  scroller.append(track)

  const hud = div(
    'pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center gap-2.5 px-4 ' +
      'pb-6 pt-[calc(max(env(safe-area-inset-top),2.75rem)+0.6rem)] text-white',
    {
      background:
        'linear-gradient(180deg, rgba(8, 32, 46, .78) 0%, rgba(8, 32, 46, .45) 52%, ' +
        'rgba(8, 32, 46, 0) 100%)',
    },
  )

  const who = div('min-w-0 grow')
  const hudWorld = div('text-[0.95rem] font-extrabold tracking-[0.06em]')
  const hudSub = div('text-[0.7rem] font-semibold tracking-[0.04em] opacity-70')
  who.append(hudWorld, hudSub)

  const totalPill = div(
    'flex shrink-0 items-baseline gap-1.5 rounded-full bg-white/[0.16] px-3 py-1.5 ' +
      'font-extrabold backdrop-blur-md',
  )
  const totalValue = document.createElement('number-flow')
  totalValue.className = 'text-[0.8rem] tabular-nums'
  totalValue.locales = POINTS_LOCALE
  const totalLabel = div('text-[0.6rem] uppercase tracking-[0.08em] opacity-70')
  totalLabel.textContent = 'total'
  totalPill.append(totalValue, totalLabel)

  hud.append(who, totalPill)

  // Once the current level scrolls out of view, a pill at the bottom says where it went.
  const jump = document.createElement('button')
  jump.type = 'button'
  jump.dataset.ui = ''
  jump.className =
    'absolute bottom-[calc(env(safe-area-inset-bottom)+1.1rem)] right-3.5 z-10 flex ' +
    'items-center gap-1.5 rounded-full bg-[rgba(9,38,54,0.74)] px-4 py-2.5 text-xs ' +
    'font-extrabold text-white shadow-[0_8px_18px_rgba(9,38,54,0.35)] backdrop-blur-lg ' +
    'transition-[opacity,transform] duration-200 ease-out'
  jump.innerHTML =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
    'stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4 shrink-0" aria-hidden="true">' +
    '<path d="M2 12h3" /><path d="M19 12h3" /><path d="M12 2v3" /><path d="M12 19v3" />' +
    '<circle cx="12" cy="12" r="7" /><circle cx="12" cy="12" r="3" /></svg>Next run'

  const booting = div(
    'absolute inset-0 z-20 grid place-items-center bg-[#0a4478] text-[0.8rem] font-bold ' +
      'tracking-[0.1em] text-[#cfe9f6] transition-opacity duration-300',
  )
  booting.textContent = 'BAKING TILES…'

  stage.append(scroller, hud, jump, booting)
  root.append(stage)

  let head: Plate | null = null
  let body: Plate | null = null
  const propSets = new Map<string, PropPlacement[]>()

  let stageW = 420
  let headH = 0
  let bodyH = 0
  let contentH = 0
  let nodeYs = new Float64Array(LEVEL_COUNT)

  let progress: Progress | null = null
  let current = 1
  let pendingFocus = 0

  // ---- the piste, traced off the plate --------------------------------------------------------

  const trailAt = (y: number): number => {
    if (!head || !body) return stageW / 2
    if (y < headH) {
      const row = rowAt(head.rows, head.step, (y / headH) * head.h)
      return (((row.l + row.r) / 2) / head.w) * stageW
    }
    const local = (y - headH) % bodyH
    const row = rowAt(body.rows, body.step, (local / bodyH) * body.h)
    return (((row.l + row.r) / 2) / body.w) * stageW
  }

  // Chord distance, not equal height — a solve, not a formula, so every node's y is worked out
  // once up front.
  const buildNodes = (): void => {
    nodeYs = new Float64Array(LEVEL_COUNT)
    let y = Math.round(headH * 0.42)
    nodeYs[0] = y
    for (let i = 1; i < LEVEL_COUNT; i += 1) {
      const step = i === LEVEL_COUNT - 1 ? NODE_STEP + FINISH_GAP : NODE_STEP
      const x0 = trailAt(y)
      const reach = (at: number): number => Math.hypot(trailAt(at) - x0, at - y)
      let lo = y
      let hi = y + step
      while (reach(hi) < step) hi += step * 0.5
      for (let k = 0; k < 18; k += 1) {
        const mid = (lo + hi) / 2
        if (reach(mid) < step) lo = mid
        else hi = mid
      }
      y = (lo + hi) / 2
      nodeYs[i] = y
    }
  }

  const nodeY = (i: number): number => nodeYs[Math.max(0, Math.min(LEVEL_COUNT - 1, i))] ?? 0

  const nodeIndexAt = (y: number): number => {
    const first = nodeYs[0] ?? 0
    const last = nodeYs[LEVEL_COUNT - 1] ?? 0
    if (y <= first) return 0
    if (y >= last) return LEVEL_COUNT - 1
    let lo = 0
    let hi = LEVEL_COUNT - 1
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1
      if ((nodeYs[mid] ?? 0) <= y) lo = mid
      else hi = mid
    }
    const from = nodeYs[lo] ?? 0
    const to = nodeYs[hi] ?? from + 1
    return lo + (y - from) / (to - from)
  }

  const slotY = (i: number): number => nodeY(i) + (NUDGE[i]?.y ?? 0)

  // Worlds are node ranges and props are plate rows, so the two never line up; a prop instance is
  // placed by its own anchor row falling inside a world, which makes a set change at the gate.
  const worldAt = (y: number): number => {
    let lo = 0
    let hi = WORLDS.length - 1
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1
      if ((nodeYs[mid * LEVELS_PER_WORLD] ?? 0) <= y) lo = mid
      else hi = mid - 1
    }
    return lo
  }

  // ---- nodes ----------------------------------------------------------------------------------

  const addGate = (slot: HTMLElement, world: number): void => {
    const gate = div(
      'absolute left-1/2 -ml-[116px] w-[232px] rounded-[14px] px-0 pb-2.5 pt-[9px] ' +
        'text-center text-white shadow-[0_10px_24px_rgba(9,38,54,0.32)]',
      { top: '-84px', background: 'rgba(9, 38, 54, .84)' },
    )
    const name = div('text-[0.8rem] font-extrabold leading-tight tracking-[0.1em]')
    name.textContent = worldName(world)
    const sub = div('text-[0.62rem] font-semibold leading-relaxed tracking-[0.08em] opacity-70')
    sub.textContent = `WORLD ${world}`
    gate.append(name, sub)
    slot.append(gate)
  }

  // Level 500 skis under a race banner — the end of the track, not another level.
  const addFinishGate = (slot: HTMLElement): void => {
    for (const left of ['-54px', '49px']) {
      slot.append(
        div('absolute rounded-[3px] shadow-[0_3px_8px_rgba(13,43,62,0.3)]', {
          left,
          top: '-78px',
          width: '5px',
          height: '78px',
          background: 'linear-gradient(180deg, #f0e3c4, #b99a66)',
        }),
      )
    }
    const ribbon = div(
      'absolute w-[116px] rounded-md pb-[7px] pt-[5px] text-center text-[0.62rem] ' +
        'font-extrabold tracking-[0.12em] text-white shadow-[0_5px_12px_rgba(13,43,62,0.35)]',
      { left: '-58px', top: '-82px', background: 'linear-gradient(180deg, #e8533a, #c22f1c)' },
    )
    ribbon.textContent = 'FINISH'
    const notch = div('absolute inset-x-0', {
      bottom: '-7px',
      height: '8px',
      background: '#c22f1c',
      clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 40%, 0 100%)',
    })
    ribbon.append(notch)
    slot.append(ribbon)
  }

  const NODE_BASE =
    'absolute -left-[27px] -top-[27px] grid h-[54px] w-[54px] place-items-center rounded-full ' +
    'border-[3px] border-white text-[1.2rem] font-extrabold text-white ' +
    'shadow-[0_6px_14px_rgba(13,43,62,0.34)]'

  const paintNode = (node: HTMLElement, state: 'done' | 'now' | 'lock', level: Level): void => {
    if (state === 'lock') {
      node.style.background = 'rgba(255, 255, 255, .58)'
      node.style.color = '#5e7f9a'
      node.style.borderColor = 'rgba(255, 255, 255, .9)'
      node.style.fontSize = '1.05rem'
      node.style.boxShadow = '0 4px 10px rgba(13, 43, 62, .2)'
      return
    }
    if (state === 'now') {
      node.style.background = 'linear-gradient(180deg, #4fd0f4, #1d87d6)'
      node.style.boxShadow = '0 8px 20px rgba(13, 43, 62, .4)'
      const ring = div('absolute -inset-[9px] rounded-full border-[3px] border-white/70')
      node.append(ring)
      ring.animate(
        [{ transform: 'scale(0.9)', opacity: 0.9 }, { transform: 'scale(1.3)', opacity: 0 }],
        { duration: 1_800, iterations: Infinity, easing: 'ease-out' },
      )
      return
    }
    node.style.color = '#5a2f00'
    node.style.background = level.bonus
      ? 'linear-gradient(180deg, #ffd45e, #ec8615)'
      : 'linear-gradient(180deg, #ffc247, #f79320)'
    if (level.avalanche) {
      node.style.background = 'linear-gradient(180deg, #ff8f6b, #e8442f)'
      node.style.color = '#fff'
    }
  }

  const makeSlot = (i: number): HTMLElement => {
    const index = i + 1
    const level = levelAt(index)
    const shift = NUDGE[i] ?? { x: 0, y: 0 }
    const y = slotY(i)
    const slot = div('absolute h-0 w-0', {
      left: `${trailAt(y) + shift.x}px`,
      top: `${y}px`,
    })

    if (level.indexInWorld === 1 && level.world > 1) addGate(slot, level.world)
    if (level.endless) addFinishGate(slot)

    const unlocked = progress?.unlocked ?? 1
    const state = index < unlocked ? 'done' : index === unlocked ? 'now' : 'lock'
    // A locked level is a padlock and nothing else, bonus or not.
    const locked = state === 'lock' && !UNLOCK_ALL_LEVELS

    if (level.bonus && !locked) {
      slot.append(
        div('absolute -left-[52px] -top-[52px] h-[104px] w-[104px] rounded-full', {
          background:
            'radial-gradient(circle, rgba(255, 201, 71, .55), rgba(255, 201, 71, 0) 68%)',
        }),
      )
    }

    const node = document.createElement('button')
    node.type = 'button'
    node.dataset.ui = ''
    node.className = `${NODE_BASE} pointer-events-auto`
    if (locked) node.append(createElement(LockKeyhole, { width: 22, height: 22, 'stroke-width': 2.5 }))
    else node.textContent = String(index)
    paintNode(node, state, level)
    if (level.bonus && !locked) {
      const gift = div(
        'absolute -right-[5px] -top-[5px] grid h-6 w-6 place-items-center rounded-full ' +
          'bg-white text-sm shadow-[0_3px_8px_rgba(13,43,62,0.3)]',
      )
      gift.textContent = '🎁'
      node.append(gift)
    }
    if (!locked) node.addEventListener('click', () => onPlay(index))
    slot.append(node)

    const best = progress ? recordOf(progress, index).score : 0
    // The endless level is never cleared, so it never wears a score.
    if (best > 0 && !level.endless) {
      const score = div(
        'absolute left-0 top-[31px] -translate-x-1/2 rounded-full bg-white px-1.5 py-px ' +
          'text-[0.65rem] font-extrabold tabular-nums text-[#2b5876] ' +
          'shadow-[0_2px_5px_rgba(13,43,62,0.3)]',
      )
      score.textContent = String(best)
      slot.append(score)
    }

    return slot
  }

  // ---- what is on screen ----------------------------------------------------------------------

  const liveNodes = new Map<number, HTMLElement>()
  const liveProps = new Map<string, HTMLElement>()

  const syncNodes = (): void => {
    const top = scroller.scrollTop
    const view = scroller.clientHeight
    const first = Math.max(0, Math.floor(nodeIndexAt(top - NODE_MARGIN)))
    const last = Math.min(LEVEL_COUNT - 1, Math.ceil(nodeIndexAt(top + view + NODE_MARGIN)))

    for (const [i, element] of liveNodes) {
      if (i < first || i > last) {
        element.remove()
        liveNodes.delete(i)
      }
    }
    for (let i = first; i <= last; i += 1) {
      if (liveNodes.has(i)) continue
      const slot = makeSlot(i)
      nodesLayer.append(slot)
      liveNodes.set(i, slot)
    }
  }

  // Props are placed against this same cut plate, so a coordinate in the paint tool is a
  // coordinate here. Anything below SPLIT rides the repeating tile and is drawn once per repeat;
  // only a prop above it is a one-off.
  const makeProp = (slug: string, placement: PropPlacement, top: number, scale: number): HTMLElement => {
    // Anchored with a translate, not `left`: an absolute box with no width shrinks to fit what is
    // left of the layer, which squashed every sprite in the right column.
    const element = div('absolute left-0', {
      translate: `calc(${placement.x * scale}px - 50%) -100%`,
      top: `${top}px`,
      height: `${placement.h * scale}px`,
      zIndex: String(Math.round(placement.y)),
    })
    element.append(
      div('absolute bottom-[-3px] left-1/2 h-[14%] min-h-[6px] w-[96%] rounded-[50%]', {
        transform: 'translateX(-46%)',
        background:
          'radial-gradient(ellipse at 50% 50%, rgba(120, 168, 208, .5), rgba(120, 168, 208, 0) 66%)',
      }),
    )
    const image = document.createElement('img')
    image.src = `/map/sprites/${slug}/${placement.sprite}.png`
    image.alt = ''
    image.className = 'relative block h-full w-auto'
    if (placement.flip) image.style.transform = 'scaleX(-1)'
    element.append(image)
    return element
  }

  const syncProps = (): void => {
    const scale = stageW / PLATE_W
    const from = scroller.scrollTop - PROP_MARGIN
    const to = scroller.scrollTop + scroller.clientHeight + PROP_MARGIN
    const wanted = new Set<string>()

    const place = (slug: string, placement: PropPlacement, key: string, top: number): void => {
      if (top < from || top > Math.min(to + placement.h * scale, contentH)) return
      if (WORLDS[worldAt(top)]?.props !== slug) return
      wanted.add(key)
      if (liveProps.has(key)) return
      const element = makeProp(slug, placement, top, scale)
      propsLayer.append(element)
      liveProps.set(key, element)
    }

    const firstTile = Math.max(0, Math.floor((from - headH) / bodyH) - 1)
    const lastTile = Math.floor((to - headH) / bodyH)
    for (const [slug, placements] of propSets) {
      for (const placement of placements) {
        if (placement.y <= SPLIT) {
          place(slug, placement, `${slug}:h${placement.i}`, (placement.y / SPLIT) * headH)
          continue
        }
        const local = ((placement.y - SPLIT) / (PLATE_H - SPLIT)) * bodyH
        for (let k = firstTile; k <= lastTile; k += 1) {
          place(slug, placement, `${slug}:${k}:${placement.i}`, headH + k * bodyH + local)
        }
      }
    }

    for (const [key, element] of liveProps) {
      if (wanted.has(key)) continue
      element.remove()
      liveProps.delete(key)
    }
  }

  // The band covers the whole world, gate to gate; the mask handles the arrival at each end.
  const syncNight = (): void => {
    if (NIGHT_WORLD < 0) return
    const from = (nodeYs[NIGHT_WORLD * LEVELS_PER_WORLD] ?? 0) - 150
    const to = (nodeYs[Math.min(LEVEL_COUNT - 1, (NIGHT_WORLD + 1) * LEVELS_PER_WORLD)] ?? 0) - 150
    for (const layer of nightLayers) {
      layer.style.top = `${from}px`
      layer.style.height = `${to - from}px`
    }
  }

  const syncHud = (): void => {
    const mid = scroller.scrollTop + scroller.clientHeight * 0.45
    const i = Math.max(0, Math.min(LEVEL_COUNT - 1, Math.round(nodeIndexAt(mid))))
    const world = Math.floor(i / LEVELS_PER_WORLD) + 1
    hudWorld.textContent = worldName(world)
    const first = (world - 1) * LEVELS_PER_WORLD + 1
    hudSub.textContent = `levels ${first} – ${first + LEVELS_PER_WORLD - 1}`
  }

  // What the pill last displayed, so a total that grew off-screen still rolls up on the next show.
  let shownTotal = 0

  const syncTotal = (from: ScoreAnchor | null | undefined): void => {
    const total = progress ? totalScore(progress) : 0
    const gain = total - shownTotal
    const settle = (): void => {
      shownTotal = total
      totalValue.update(total)
    }
    if (gain <= 0 || !from || reducedMotion()) return settle()
    flyNumber({
      text: `+${formatPoints(gain)}`,
      color: from.color,
      from: from.rect,
      to: totalPill.getBoundingClientRect(),
      onHit: () => {
        punch(totalPill)
        settle()
      },
    })
  }

  const syncJump = (): void => {
    const y = slotY(current - 1)
    const top = scroller.scrollTop
    const away = y < top + 80 || y > top + scroller.clientHeight - 80
    jump.style.opacity = away ? '1' : '0'
    jump.style.transform = away ? 'translateY(0)' : 'translateY(14px)'
    jump.style.pointerEvents = away ? 'auto' : 'none'
  }

  const scrollTo = (index: number, behavior: ScrollBehavior): void => {
    scroller.scrollTo({
      top: Math.max(0, slotY(index - 1) - scroller.clientHeight * 0.55),
      behavior,
    })
  }

  jump.addEventListener('click', () => scrollTo(current, 'smooth'))

  let queued = false
  const onScroll = (): void => {
    if (queued) return
    queued = true
    requestAnimationFrame(() => {
      queued = false
      syncProps()
      syncNodes()
      syncHud()
      syncJump()
    })
  }
  scroller.addEventListener('scroll', onScroll, { passive: true })

  // ---- layout ---------------------------------------------------------------------------------

  const layout = (): void => {
    if (!head || !body) return
    stageW = Math.round(scroller.clientWidth)
    headH = Math.round(stageW * (head.h / head.w))
    bodyH = Math.round(stageW * (body.h / body.w))
    buildNodes()

    contentH = Math.round(nodeY(LEVEL_COUNT - 1)) + TAIL_PAD
    track.style.height = `${contentH}px`

    artHead.style.top = '0px'
    artHead.style.height = `${headH}px`
    artHead.style.backgroundImage = `url(${head.url})`
    artHead.style.backgroundSize = `${stageW}px ${headH}px`

    artBody.style.top = `${headH}px`
    artBody.style.height = `${contentH - headH}px`
    artBody.style.backgroundImage = `url(${body.url})`
    artBody.style.backgroundSize = `${stageW}px ${bodyH}px`

    for (const [, element] of liveProps) element.remove()
    liveProps.clear()
    for (const [, element] of liveNodes) element.remove()
    liveNodes.clear()

    syncNight()
    syncProps()
    syncNodes()
    syncHud()
    syncJump()
  }

  const boot = async (): Promise<void> => {
    const [plates, ...placed] = await Promise.all([
      bakePlate('/map/plate.webp'),
      ...PROP_SLUGS.map(loadProps),
    ])
    head = plates.head
    body = plates.body
    PROP_SLUGS.forEach((slug, i) => propSets.set(slug, placed[i] ?? []))
    layout()
    if (pendingFocus > 0) {
      scrollTo(pendingFocus, 'auto')
      pendingFocus = 0
      onScroll()
    }
    booting.style.opacity = '0'
    booting.addEventListener('transitionend', () => booting.remove(), { once: true })
  }

  void boot()

  // Node positions are in pixels, so a rotation or a resized window has to redraw them.
  window.addEventListener('resize', () => {
    if (root.style.display !== 'none') layout()
  })

  const redraw = (): void => layout()

  return {
    root,
    redraw,
    show: (next, focusLevel, from) => {
      progress = next
      current = Math.max(1, Math.min(LEVEL_COUNT, next.unlocked))
      root.style.display = 'flex'
      syncTotal(from)
      if (!head || !body) {
        pendingFocus = focusLevel
        return
      }
      layout()
      scrollTo(focusLevel, 'auto')
      onScroll()
    },
    hide: () => {
      root.style.display = 'none'
    },
  }
}
