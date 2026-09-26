import type { CapacitorConfig } from '@capacitor/cli'

// The CLI reads this file's default export by contract, so it is the one place the project
// can't use a named export.
const config: CapacitorConfig = {
  appId: 'com.filipvitas.downhill',
  appName: 'Downhill: Snow Run',
  webDir: 'dist',
  // Matches the letterbox behind the canvas, so the launch handoff doesn't flash white.
  backgroundColor: '#0a4478',
  ios: {
    // The slope is drawn edge to edge under the HUD; bouncing the web view would drag it.
    scrollEnabled: false,
    contentInset: 'never',
  },
  android: {
    backgroundColor: '#0a4478',
  },
  plugins: {
    // The map hides the splash as soon as it is built and opens an iris onto itself. The duration
    // only caps a load that stalls.
    SplashScreen: {
      launchShowDuration: 3_000,
      launchAutoHide: true,
      // Android's launch splash ignores the fade passed to hide(). This short one melts the icon
      // away while the iris is already opening under it.
      launchFadeOutDuration: 200,
      backgroundColor: '#0a4478',
      showSpinner: false,
    },
    // iOS hides the status bar (Info.plist), so Android hides both bars to match. Old WebViews
    // (< 140) can't read env(safe-area-inset-*), and hidden bars leave only the cutout to inset.
    SystemBars: {
      hidden: true,
      initialViewportFitValueHint: 'cover',
    },
  },
}

export default config
