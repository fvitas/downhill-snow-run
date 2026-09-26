import { readdirSync, readFileSync, rmSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import type { Plugin } from 'vite'
import { SPRITE_PATHS } from './src/game/sprites.ts'
import { SOUND_PATHS } from './src/ui/sound.ts'
import { PROP_SLUGS } from './src/game/worlds.ts'

// The mockups load far more of public/ than the game does, so only what the game asks for ships.
const shippedPaths = (publicDir: string): Set<string> => {
  const shipped = new Set(['favicon.png', 'apple-touch-icon.png', 'map/plate.webp'])
  for (const path of SPRITE_PATHS) shipped.add(`sprites/${path}`)
  for (const path of SOUND_PATHS) shipped.add(path)
  for (const slug of PROP_SLUGS) {
    const props = `map/props/props-${slug}.json`
    shipped.add(props)
    const data = JSON.parse(readFileSync(join(publicDir, props), 'utf8')) as { props?: { sprite: string }[] }
    for (const placement of data.props ?? []) shipped.add(`map/sprites/${slug}/${placement.sprite}.png`)
  }
  return shipped
}

const filesUnder = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    return entry.isDirectory() ? filesUnder(path) : [path]
  })

const removeEmptyDirs = (dir: string): void => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) removeEmptyDirs(join(dir, entry.name))
  }
  if (readdirSync(dir).length === 0) rmSync(dir, { recursive: true })
}

export const prunePublic = (): Plugin => {
  let publicDir = ''
  let outDir = ''
  return {
    name: 'prune-public',
    apply: 'build',
    configResolved(config) {
      publicDir = config.publicDir
      outDir = resolve(config.root, config.build.outDir)
    },
    closeBundle() {
      const shipped = shippedPaths(publicDir)
      const missing = [...shipped].filter((path) => !statSync(join(publicDir, path), { throwIfNoEntry: false }))
      if (missing.length > 0) throw new Error(`The game asks for files public/ does not have: ${missing.join(', ')}`)

      let bytes = 0
      let count = 0
      for (const file of filesUnder(publicDir)) {
        const path = relative(publicDir, file)
        if (shipped.has(path)) continue
        const copy = join(outDir, path)
        const stat = statSync(copy, { throwIfNoEntry: false })
        if (!stat) continue
        bytes += stat.size
        count += 1
        rmSync(copy)
      }
      for (const entry of readdirSync(outDir, { withFileTypes: true })) {
        if (entry.isDirectory()) removeEmptyDirs(join(outDir, entry.name))
      }
      this.info(`dropped ${count} unused public files (${(bytes / 1_048_576).toFixed(1)} MB)`)
    },
  }
}
