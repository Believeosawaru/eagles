# Tournament edition — v4 validation

Checks cover strict app/server TypeScript, Expo web/native bundle exports, seeded simulation, valid drafts, movement/event agreement, World Cup fixtures and API integration. Detailed final browser results are recorded below when packaging.

Automated game coverage includes 1,000 drafts, 900 team/tactic combinations, 3,000 rematch comparisons and 30 World Cup fixtures/progression checks. The World Cup checks require 48 group games, eight round-of-16 games, one final, no self-fixtures, and scorer totals matching every fixture. The tournament intentionally contains 63 games: no third-place playoff.

The API integration uses temporary MongoDB and checks seed consistency, recomputed scores, valid picks/configuration, duplicate-submission handling, private submitter fields, CORS and rate limiting.

Not verified: signed APK compilation/installation, physical iOS or Xcode execution, audible sound/haptics on real devices, production deployment/proxy behaviour, exhaustive accessibility, low-end phone performance or real user engagement. No claim of perfect behaviour on every device is made.

FIFA country data is a historical published 2022 snapshot, not a live/current feed. Game XIs, ratings, conditions, pundit analysis and outcomes are simulated. Twenty Nigerian players still use labelled photo fallbacks; opposition player photos are not included. The Fredoka font licence is bundled.

## Final v4 results

Passed: eight game tests, temporary-MongoDB API integration, strict app/server compilation, static web export, Android/iOS Hermes bundle exports. Award aggregation was checked against every goal/assist record, including stable identifiers for similarly named players. Late goals were checked for situational commentary and named scorer/assister metadata.

Browser interaction passed at 390 × 844 and desktop width: manager naming, player profile/favourite, complete draft, reload/resume, tactics/difficulty, tournament preview, both lineups, group tables, scorer/assist tabs, pause and 4× playback, completed tournament, replay, same-XI rematch key, PNG download, history/achievement persistence and horizontal overflow checks. No page runtime errors were observed. A separate normal-motion browser check verified the goal celebration and match centre; home typography and the goal screen were visually inspected. Microphone recording/background audio permissions are disabled; sound/haptics still require real-device validation.


## Patch 4.0.1 — fixture crash recovery

Eight targeted rendering tests passed for absent/legacy results, missing/null/empty fixture arrays, invalid fixture entries, stale match indices and a valid tournament. A browser test restored a saved run with an out-of-range match index and a legacy result snapshot, confirmed that the snapshot was discarded, the XI was retained, and the tournament/match centre loaded with no page runtime errors. App strict TypeScript and static web export passed. The simulation rules and API contract were unchanged. Native bundle exports were repeated for the patch; device installation remains unverified.

## V5 — online rooms and brand/social pack

Passed: app strict TypeScript, server compilation, the eight solo game tests, eight tournament recovery rendering checks and the new temporary-MongoDB multiplayer integration. The room test used independent tokens, rejected a third participant and unauthorised/invalid/stale picks, completed both XIs and confirmed identical saved match results and matching goal events. The two-browser flow completed create/join/draft, refresh/reconnect and playback without page runtime errors.

Web export and Android/iOS JavaScript/Hermes exports were repeated with the new splash-screen dependency. A standalone native build is still required to validate the actual launcher icon, native splash, device sharing, sound and haptics. No APK or signed iOS binary is supplied, and no production/load test has been performed.

The six final carousel PNGs are all 1122 × 1402. They were visually inspected for the build story, names/claims, readable copy and case-study limitations. Raw game captures are bundled; image-generated phone mockups can have minor rendering/type differences. The screenshots and bug are real; phone hardware frames are presentation artwork. No social posts were published and no launch/growth metrics are claimed.

Final v5 browser pass also verified that expired credentials show a recovery message and stop further room polling. No page runtime errors were observed. The six final images were checked to have matching dimensions, and X drafts were counted (single post 274 characters; thread posts 201–274 characters). The longer post and image alt text are in the social pack. These functional checks do not substitute for production load tests or physical-device tests.
