# App Store Connect listing

Paste each field as is. The character limits are Apple's and every value fits.

## App information

| Field | Value |
| --- | --- |
| Name (30) | Downhill: Snow Run |
| Subtitle (30) | One-tap ski slalom adventure |
| Bundle ID | com.filipvitas.downhill |
| SKU | downhill-snow-run |
| Primary language | English (U.S.) |
| Primary category | Games |
| Games subcategory 1 | Casual |
| Games subcategory 2 | Action |
| Price | Free |
| Content rights | Does not contain, show or access third-party content |

## Version 1.0

**Promotional text (170)**

```
Tap to carve, dodge wolves, bears and falling icicles, and race through 500 levels across ten snowy worlds. No ads, no accounts, just the mountain.
```

**Description (4000)**

```
Point your skis downhill and hold your line.

Downhill: Snow Run is a one-tap ski game. Tap anywhere to switch the way you carve, thread the piste between the trees and reach the finish tape. It is easy to pick up and hard to put down.

500 LEVELS, TEN WORLDS
Ski from Pine Valley through Larch Ridge, Whiteout Pass, Glacier Run, Alpenglow Ridge, Aurora Peak, Frozen Lake, Lantern Village and Basalt Springs, all the way to Summit Crown. Every world has its own look on the map.

A MOUNTAIN THAT FIGHTS BACK
The first runs are just you and the snow. Then the slope starts to fill up: slalom gates, snowmen, boulders, jumps, logs and nets, other skiers and sledding kids, snowmobiles, wolves, foxes, deer and bears, toppling trees, rolling snowballs and falling icicles. Each one arrives slowly, so you always have time to learn it.

POWER-UPS
Grab a Helmet to survive one crash, go Ghost to pass straight through trouble, or pick up ×2 to double your points.

SCORE AND COMBOS
Skim close past trees and hazards to build a combo, and every near miss in a row pays more. Replay any level to beat your best, and only your better result is kept.

PLAY ANYWHERE
No internet needed, no ads, no accounts and no tracking. Your progress stays on your device.
```

**Keywords (100)**

```
ski,skiing,snow,slalom,winter,mountain,downhill,one tap,arcade,endless,runner,offline,casual,slope
```

**Support URL:** host `store/support.html`, then paste its address. See the release checklist.

**Marketing URL:** optional. Leave empty.

**Privacy Policy URL:** https://github.com/fvitas/downhill-snow-run/blob/main/store/privacy-policy.md

**Copyright:** `2026 Filip Vitas`

**What's New:** not shown for the first version.

## App Review information

- **Sign-in required:** No.
- **Contact:** Filip Vitas, your phone number, app.filip.vitas@gmail.com.
- **Notes:**

```
Downhill is an offline, single-player game with no accounts, purchases, ads or network access. Tap anywhere to change carving direction. Progress is saved locally on the device.
```

## App Privacy

Answer **"No, we do not collect data from this app."** The label then reads **Data Not Collected**.

- Nothing leaves the device and there is no third-party SDK.
- Tracking: No.
- The privacy manifest ships in the app as `ios/App/App/PrivacyInfo.xcprivacy`, declaring no tracking, no collected data and no required-reason APIs.

## Age rating

Answer **None** to every content question and **No** to every capability question. The result is **4+**.

| Question | Answer |
| --- | --- |
| Cartoon or fantasy violence | None. Crashing into a tree or animal just ends the run. |
| Realistic violence, horror, mature themes | None |
| Profanity, sexual content, nudity | None |
| Alcohol, tobacco, drugs, gambling, contests | None |
| Medical or treatment information | None |
| Unrestricted web access | No |
| User-generated content or messaging | No |
| In-app purchases or loot boxes | No |
| Made for Kids | No. Opting in adds a stricter review and is not needed for a 4+ rating. |

## Export compliance

`ITSAppUsesNonExemptEncryption` is set to false in Info.plist. App Store Connect will not ask about encryption on upload.

## Screenshots

- **Required size:** 6.9" iPhone. Apple accepts 1290 × 2796 portrait for that slot.
- **Your phone:** an iPhone 14 Pro Max, 15 Plus, 15 Pro Max or 16 Plus captures exactly that size. Take them on the phone with side button plus volume up.
- **Other sizes:** App Store Connect scales the 6.9" set down for smaller iPhones. The app is iPhone only, so no iPad set is needed.
- **Count:** 3 to 10. A good set is the map, an early run, a run with a power-up, a busy late-world run and the finish card.
- Drop them in `store/screenshots/ios/`.
