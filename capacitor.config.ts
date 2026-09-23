import type { CapacitorConfig } from '@capacitor/cli'

// The CLI reads this file's default export by contract, so it is the one place the project
// can't use a named export.
const config: CapacitorConfig = {
  appId: 'com.filipvitas.treeline',
  appName: 'Treeline',
  webDir: 'dist',
  // Matches the letterbox behind the canvas, so the launch handoff doesn't flash white.
  backgroundColor: '#0f172a',
  ios: {
    // The slope is drawn edge to edge under the HUD; bouncing the web view would drag it.
    scrollEnabled: false,
    contentInset: 'never',
  },
  android: {
    backgroundColor: '#0f172a',
  },
}

export default config
