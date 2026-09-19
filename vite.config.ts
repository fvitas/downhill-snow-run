import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [tailwindcss()],
  // The game is plain TS; only the colour-picker mockup uses JSX.
  esbuild: { jsx: 'automatic' },
  // Screenshots and console logs get written into the project root, which would otherwise
  // trigger a full page reload mid-playtest.
  server: { host: true, watch: { ignored: ['**/.playwright-mcp/**', '**/*.png'] } },
})
