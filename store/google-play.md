# Google Play Console listing

Paste each field as is. The character limits are Google's and every value fits.

## Main store listing

| Field | Value |
| --- | --- |
| App name (30) | Downhill: Snow Run |
| Package name | com.filipvitas.downhill |
| Default language | English (United States), en-US |
| App or game | Game |
| Free or paid | Free. This cannot be changed to paid later. |
| Category | Casual. Arcade and Racing are good alternatives. |
| Tags | Skiing, Casual, Arcade, Offline, Single player |
| Contact email | app.filip.vitas@gmail.com |
| Website | optional. Paste the hosted support page address. |
| Privacy policy | https://github.com/fvitas/downhill-snow-run/blob/main/store/privacy-policy.md Required. |

**Short description (80)**

```
One-tap skiing through 500 snowy levels. Dodge, carve and chase the finish tape.
```

**Full description (4000)**

```
Point your skis downhill and hold your line.

Downhill: Snow Run is a one-tap ski game. Tap anywhere to switch the way you carve, thread the piste between the trees and reach the finish tape. It is easy to pick up and hard to put down.

★ 500 LEVELS, TEN WORLDS
Ski from Pine Valley through Larch Ridge, Whiteout Pass, Glacier Run, Alpenglow Ridge, Aurora Peak, Frozen Lake, Lantern Village and Basalt Springs, all the way to Summit Crown.

★ A MOUNTAIN THAT FIGHTS BACK
The first runs are just you and the snow. Then the slope starts to fill up: slalom gates, snowmen, boulders, jumps, logs and nets, other skiers and sledding kids, snowmobiles, wolves, foxes, deer and bears, toppling trees, rolling snowballs and falling icicles. Each one arrives slowly, so you always have time to learn it.

★ POWER-UPS
Grab a Helmet to survive one crash, go Ghost to pass straight through trouble, or pick up ×2 to double your points.

★ SCORE AND COMBOS
Skim close past trees and hazards to build a combo, and every near miss in a row pays more. Replay any level to beat your best, and only your better result is kept.

★ PLAY ANYWHERE
No internet needed, no ads, no accounts and no tracking. Your progress stays on your device.
```

## Graphics

| Asset | File | Rule |
| --- | --- | --- |
| App icon | `assets/play-store-512.png` | 512 × 512 PNG, 32-bit, up to 1 MB |
| Feature graphic | `store/feature-graphic.png` | 1024 × 500 PNG or JPEG, no alpha |
| Phone screenshots | `store/screenshots/play/` | 2 to 8, JPEG or PNG, longest side at most twice the shortest |

iPhone screenshots are 1290 × 2796, which is taller than 2:1. Run `store/crop-for-play.sh` to make Play copies.

## App content, the Policy section

**Privacy policy:** https://github.com/fvitas/downhill-snow-run/blob/main/store/privacy-policy.md

**Ads:** No, my app does not contain ads.

**App access:** All functionality is available without special access.

**Content rating:** take the IARC questionnaire.

- Category: Game.
- Violence, fear, sexuality, language, controlled substances, crude humour: No to all.
- Gambling or simulated gambling: No.
- Users can interact or exchange content: No.
- Shares location: No.
- Digital purchases: No.
- Unrestricted internet: No.
- Expected result: **PEGI 3, ESRB Everyone, USK 0**.

**Target audience and content:**

- Age groups: **13–15, 16–17 and 18 and over.**
- Picking any group under 13 pulls the app into the Families policy, with extra review. It is not needed for release. It can be added later.
- Appeals to children unintentionally: answer No.

**Data safety:**

- Does your app collect or share any of the required user data types? **No.**
- The form then asks nothing more. The listing reads **No data collected** and **No data shared with third parties**.
- Is all user data encrypted in transit? Not applicable, because nothing is transmitted.
- Account deletion: not applicable, because there are no accounts.

**Government app:** No. **Financial features:** None. **Health:** None. **News app:** No.

**Advertising ID:** No, the app does not use an advertising ID. The build declares no AD_ID permission.

## Release

- **Play App Signing:** accept Google-managed signing when creating the first release. The AAB is signed with your upload key, and Google re-signs it for devices.
- **Testing:** new personal developer accounts must run a closed test with at least 12 testers for 14 days before production. Start that early.
- **Countries:** all countries, or pick the ones you want.
