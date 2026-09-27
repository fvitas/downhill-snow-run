# Releasing Downhill: Snow Run

Everything the stores ask for lives in this folder.

| File | What it is |
| --- | --- |
| `app-store.md` | App Store Connect texts, privacy answers and age rating |
| `google-play.md` | Play Console texts, data safety, content rating and target audience |
| `privacy-policy.md` / `.html` | The privacy policy both stores require a public address for; published to GitHub Pages |
| `support.html` | The support page App Store Connect requires, published to GitHub Pages |
| `feature-graphic.png` | Play's 1024 × 500 feature graphic |

The screenshots, the pages that render them and the Play crop script live in `mockups/store/`, which git ignores.

## 1. Back up the Android upload key first

The key is `android/upload-keystore.jks`, and its passwords are in `android/keystore.properties`. Git ignores both.

- Copy both files into a password manager or another safe place today.
- Losing them means asking Google support for an upload key reset, which takes days.
- Enrol in Play App Signing when creating the first release. Google then holds the real app signing key.

## 2. The policy and support pages

Both stores need public addresses. `.github/workflows/pages.yml` publishes both pages to GitHub Pages on every push to main that changes them:

- Support: https://fvitas.github.io/downhill-snow-run/support.html
- Privacy policy: https://fvitas.github.io/downhill-snow-run/privacy-policy.html

Edit `privacy-policy.html` and keep `privacy-policy.md` in step, since the repo README links the `.md`.

## 3. Take screenshots

The App Store set is rendered from `mockups/store/screenshots.html` into `mockups/store/screenshots/ios/`.

```sh
mockups/store/crop-for-play.sh
```

The script writes the Play copies to `mockups/store/screenshots/play/`.

## 4. Build

Bump the build number before every upload after the first. The stores reject a number they have seen before.

- iOS: `CURRENT_PROJECT_VERSION` in Xcode, under target App, Build.
- Android: `versionCode` in `android/app/build.gradle`.
- Change `MARKETING_VERSION` and `versionName` only for a new public version.

```sh
pnpm release:android   # signed AAB at android/app/build/outputs/bundle/release/app-release.aab
pnpm release:ios       # signed IPA at ios/App/build/export/App.ipa
```

Both builds were run and verified on 25 September 2026. The AAB is signed with the upload key. The IPA is signed with Apple Distribution for team 7Z5VPU7R3V.

## 5. App Store

1. In App Store Connect, go to Apps, then New App. Pick iOS, the name `Downhill: Snow Run`, bundle ID `com.filipvitas.downhill` and SKU `downhill-snow-run`.
2. Upload the IPA with the Transporter app from the Mac App Store. Drag `App.ipa` in and press Deliver.
3. Alternatively, open the archive in Xcode with `open ios/App/build/Downhill.xcarchive` and choose Distribute App, then App Store Connect.
4. Fill in every field from `app-store.md`, add the screenshots and pick the build once it finishes processing.
5. Optionally test it first through TestFlight on your phone.
6. Submit for review.

## 6. Google Play

1. Pay the one-time developer fee and verify your identity in Play Console if not done yet.
2. Create the app with the name `Downhill: Snow Run`, as a Game, Free.
3. Work through the Dashboard's "Set up your app" tasks using `google-play.md`.
4. Go to Testing, then Closed testing. Create a release, accept Play App Signing and upload `app-release.aab`.
5. Personal accounts created after November 2023 need 12 testers opted in for 14 days before production access.
6. Apply for production, then promote the release.

## Known gaps

- **Android back button:** it closes the app, even mid-run. Handling it needs the `@capacitor/app` plugin.
- **No INTERNET permission:** the app only loads its own bundled files, which Capacitor serves without network access. Confirm the map and a run load on a real Android phone before release, because this has not been tested on a device yet.
- **iPhone only:** iPad is switched off so no iPad screenshots are needed. It can be turned on in a later version.
