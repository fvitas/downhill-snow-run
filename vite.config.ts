import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import { prunePublic } from './prune-public.ts'

export default defineConfig({
  plugins: [tailwindcss(), prunePublic()],
  // The game is plain TS; only the colour-picker mockup uses JSX.
  esbuild: { jsx: 'automatic' },
  // Screenshots and console logs get written into the project root, which would otherwise
  // trigger a full page reload mid-playtest.
  server: { host: true, watch: { ignored: ['**/.playwright-mcp/**', '**/*.png'] } },
})
