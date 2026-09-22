// Who each world is on the map. Separate from themes.ts on purpose: a theme is the palette the
// slope is painted in during a run, while a world here is a name and a set of painted props laid
// over one continuous plate. The two lists are different lengths and mean different things.
export type World = {
  name: string
  // Prop set under public/map/props and public/map/sprites. Pine Valley is the bare plate.
  props: string | null
}

// Ten worlds, never reused. The order is the light arc: day, afternoon, overcast, cold clear,
// golden hour, night, dawn, morning, midday, thin air.
export const WORLDS: readonly World[] = [
  { name: 'PINE VALLEY', props: null },
  { name: 'LARCH RIDGE', props: 'larch-ridge' },
  { name: 'WHITEOUT PASS', props: 'whiteout-pass' },
  { name: 'GLACIER RUN', props: 'glacier-run' },
  { name: 'ALPENGLOW RIDGE', props: 'alpenglow-ridge' },
  { name: 'AURORA PEAK', props: 'aurora-peak' },
  { name: 'FROZEN LAKE', props: 'frozen-lake' },
  { name: 'LANTERN VILLAGE', props: 'lantern-village' },
  { name: 'BASALT SPRINGS', props: 'basalt-springs' },
  { name: 'SUMMIT CROWN', props: 'summit-crown' },
]

// Aurora Peak is night sprites on a daylight plate, so that one world wears a night band.
export const NIGHT_WORLD = WORLDS.findIndex((world) => world.props === 'aurora-peak')

export const worldName = (world: number): string => WORLDS[world - 1]?.name ?? 'PINE VALLEY'

export const PROP_SLUGS: readonly string[] = [
  ...new Set(WORLDS.map((world) => world.props).filter((slug): slug is string => slug !== null)),
]
