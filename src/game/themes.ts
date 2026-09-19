export type Theme = {
  name: string
  snow: string
  trail: string
  treeDark: string
  treeLight: string
  trunkDark: string
  trunkLight: string
  shadow: string
  cast: string
  ball: string
  ballEdge: string
  ink: string
}

// Locked to worlds in order, picked from mockups/worlds.html. Worlds past the sixth cycle back.
export const THEMES: readonly Theme[] = [
  {
    name: 'Pine Valley',
    snow: '#faf7f0',
    trail: '#f0e5bd',
    treeDark: '#2f4f43',
    treeLight: '#4c6a5c',
    trunkDark: '#63452c',
    trunkLight: '#7a5638',
    shadow: 'rgba(122, 120, 114, 0.16)',
    cast: 'rgba(18, 40, 34, 0.3)',
    ball: '#f5a623',
    ballEdge: '#d98a10',
    ink: '#2f4f43',
  },
  {
    name: 'Sunset Ridge',
    snow: '#f7c85a',
    trail: '#efa08f',
    treeDark: '#1f9e93',
    treeLight: '#36c2b4',
    trunkDark: '#8a5a2b',
    trunkLight: '#a9713a',
    shadow: 'rgba(150, 105, 30, 0.18)',
    cast: 'rgba(12, 70, 66, 0.3)',
    ball: '#e2483c',
    ballEdge: '#b62f25',
    ink: '#8a5a2b',
  },
  {
    name: 'Glacier',
    snow: '#e7f1f6',
    trail: '#ffd9c2',
    treeDark: '#2b556b',
    treeLight: '#417a94',
    trunkDark: '#4a4a52',
    trunkLight: '#5e5e68',
    shadow: 'rgba(96, 130, 150, 0.18)',
    cast: 'rgba(14, 44, 60, 0.3)',
    ball: '#ff8a5b',
    ballEdge: '#d96a3d',
    ink: '#2b556b',
  },
  {
    name: 'Dusk',
    snow: '#ece4f2',
    trail: '#f4dcc0',
    treeDark: '#4a3b6b',
    treeLight: '#6b5892',
    trunkDark: '#5c4535',
    trunkLight: '#74573f',
    shadow: 'rgba(120, 104, 140, 0.2)',
    cast: 'rgba(32, 22, 52, 0.3)',
    ball: '#ffb03a',
    ballEdge: '#d98e18',
    ink: '#4a3b6b',
  },
  {
    name: 'Birch Woods',
    snow: '#f4f7f8',
    trail: '#f3d4cd',
    treeDark: '#6e8a6a',
    treeLight: '#8fab85',
    trunkDark: '#c9c6bb',
    trunkLight: '#e4e1d6',
    shadow: 'rgba(120, 130, 132, 0.16)',
    cast: 'rgba(60, 82, 58, 0.26)',
    ball: '#e26d5c',
    ballEdge: '#b9503f',
    ink: '#4f6b4c',
  },
  {
    name: 'Night Run',
    snow: '#243348',
    trail: '#3f5063',
    treeDark: '#101a26',
    treeLight: '#22374d',
    trunkDark: '#2b2118',
    trunkLight: '#3a2c20',
    shadow: 'rgba(8, 12, 20, 0.45)',
    cast: 'rgba(5, 10, 16, 0.4)',
    ball: '#ffd166',
    ballEdge: '#d9ac3f',
    ink: '#8ea6c0',
  },
]

export const themeForWorld = (world: number): Theme => {
  const theme = THEMES[(world - 1) % THEMES.length]
  if (!theme) throw new Error('no themes defined')
  return theme
}
