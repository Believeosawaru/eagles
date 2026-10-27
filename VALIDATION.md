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
