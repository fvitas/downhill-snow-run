const images = new Map<string, HTMLImageElement>()

// Loaded the first time something asks for it; null until it has decoded, so a frame just skips it.
export const sprite = (path: string): HTMLImageElement | null => {
  let image = images.get(path)
  if (!image) {
    image = new Image()
    image.src = `${import.meta.env.BASE_URL}sprites/${path}`
    images.set(path, image)
  }
  return image.complete && image.naturalHeight > 0 ? image : null
}

// Every file under public/sprites the game draws; the build drops the rest.
export const SPRITE_PATHS: readonly string[] = ['left', 'right'].flatMap((side) => [
  ...[0, 1, 2, 3].flatMap((frame) => [`bear/${side}-${frame}.png`, `deer/${side}-${frame}.png`]),
  `skier/red-${side}.png`,
  `skier/teal-${side}.png`,
  ...[0, 1, 2].map((frame) => `kid/${side}-${frame}.png`),
])

// Asked for up front so the first bear on the slope isn't an empty frame.
export const preloadSprites = (): void => {
  for (const path of SPRITE_PATHS) sprite(path)
}
