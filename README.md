# Eagles 7–0 — Online rooms + brand edition (v5)

One Expo + TypeScript app for web, Android and iOS, with an Express/MongoDB daily leaderboard. Draft an all-time Nigerian XI, manage the team under your chosen name and play a classic 32-team fantasy World Cup. Winning all seven is the perfect achievement; a draw or loss in the groups no longer automatically ends your tournament.

## New in v5

**Online multiplayer is a separate two-manager head-to-head mode.** It uses the same Nigerian player pool, with a MongoDB-backed room, private bearer tokens, server-validated picks and one authoritative saved match result. This is online drafting and a shared simulation; it is not live control of footballers. Each manager can pause/replay the saved timeline independently.

The new eagle/football mark is used in Home, branded loaders, the web favicon, native app icon and the native splash-screen plugin. A new native build is needed to see launcher/splash changes. Expo Go can show its own launch screen; it is not a reliable test of standalone branding. No compiled APK is supplied.

`social-pack/` contains six final portrait case-study images, real source captures, platform captions, a longer post, alt text and generation prompts. The phone frames are presentation mockups based on browser captures; they do not claim physical iPhone validation or App Store availability. No posts have been published.

## Start a multiplayer match

1. Deploy/start the **updated server** with MongoDB and set the app's `EXPO_PUBLIC_API_URL` to its HTTPS origin. Regular offline play needs no server, but multiplayer does.
2. Open **Online multiplayer**, enter a 2–24 character manager name and select **Create a room**.
3. Send the eight-character room code to your friend. They open the same web build/app on another device or browser profile, enter their own name and select **Join room**.
4. Each manager makes eleven legal picks. Opponent selections remain hidden until both XIs are locked.
5. The server simulates the host XI against the guest XI. Both receive the same saved score/timeline. Select **Watch our head-to-head** to play it back.

Two tabs in the same browser profile share local room credentials; use different profiles/incognito contexts or devices for separate seats. A refresh/relaunch can reconnect with the saved room token. **Leave room** cancels a waiting/drafting room for both players. Rooms expire after 30 minutes. Expired or unauthorised sessions stop polling and offer leaving/rejoining.

Rooms are stored in MongoDB, so they can survive an API process restart if the database and `SEED_SECRET` stay the same. Tokens are hashed on the server; don't publish a participant token. Rotating `SEED_SECRET` invalidates existing tokens. No account or verified identity is involved.

Transport: HTTP polling every 2.5 seconds while waiting/drafting; no overlapping polls. Polling stops after completion/cancellation. Requests remain subject to per-IP limits, so many players behind one shared network may hit a limit. Room creation/join/pick actions are bounded; picks use an atomic expected-count filter to reject stale/double submissions. The complete timeline is calculated server-side. No scalability/load claim is made from the two-client tests.

Multiplayer endpoints: `POST /api/rooms`, `POST /api/rooms/:code/join`, `GET /api/rooms/:code`, `POST /api/rooms/:code/pick`, `POST /api/rooms/:code/leave`. Protected requests use `Authorization: Bearer TOKEN`. No extra public app environment variable or WebSocket service is required. Existing CORS and Render wake-up behaviour still apply.

Multiplayer uses Balanced tactics with no captain bonus; it is separate from the daily tournament leaderboard. The teams can contain the same legend because each participant drafts independently. A simplified shoot-out decides level exhibition games; the match is neutral in the goal-rate baseline.

## What you can do

- Draft 11 Nigerian legends, inspect photo cards, choose a captain, tactics and difficulty.
- Enter your manager name on Home before starting. It is saved locally and used in the Nigeria dugout, lineups and match centre. The daily submission name is prefilled but editable.
- Explore a tournament hub: eight group tables, a knockout tree, matchday results, top scorers and top assisters.
- Open the match centre for both managers, game-selected XIs, match information, goal minutes, assists and a fictional pre-match pundit preview.
- Watch connected 2D possession sequences with real opponent player names. Follow slower commentary, late-goal reactions and animated celebrations.
- Pause or choose 0.5×, 1×, 2× or 4× playback. Goals and half-time have longer holds. Standard-speed runs are deliberately longer than the original three-minute MVP.
- Replay completed matches, rematch with the same XI, share your result image or a friend challenge code.
- Keep favourites, local history, achievements, settings and an automatically saved current run.

## Tournament rules and data

This is **Classic 32**, not a representation of the current 48-team World Cup. Nigeria replaces Qatar in a historical 2022 field. The other 31 teams use FIFA's published 2022 squad lists and head coaches. These are historical managers, not claims about current jobs. Full historical squad data is bundled; the match centre shows a game-selected XI based on position and caps, not a claim about a particular real match's starting lineup.

- Eight groups of four; each team plays three games. Win = 3 points, draw = 1.
- Top two advance. Ties use points, goal difference, goals scored, then alphabetical order. This is a simplified tie-break system without disciplinary points/head-to-head rules.
- Round of 16, quarter-finals, semi-finals, final. There is no third-place playoff: 48 group games + 15 championship knockout games = 63 fixtures.
- Group draws stand. Level knockout games go directly to a simplified deciding shoot-out; extra-time and individual shoot-out kicks are not animated. Shoot-outs do not inflate player goal/assist totals.
- Scorer/assist lists count completed visible fixtures. Future results stay hidden until played or you explicitly simulate the rest after Nigeria's tournament ends.
- Nigeria's ratings are subjective game estimates; other nations have fictional team strengths. Pundit commentary, venues, conditions and results are generated for the game. No live sports feed, actual news, injury reporting or betting information is supplied.

See `DATA-SOURCES.md` for the FIFA source and `ASSETS.md` for 44 licensed Nigerian player photos and 20 labelled silhouette fallbacks. Opponent XIs are text rosters; opponent photos are not bundled. Fredoka is bundled under the SIL Open Font License in `FONT-LICENSE.txt`.

## Folder structure

```text
eagles-7-0/
  app/       Expo Router application, artwork, photos, fonts and local saves
  server/    Express/Mongoose API
  shared/    Draft rules, country squads, World Cup and match simulation
  tests/     Game, API and browser checks
  scripts/   Photo-import helper
```

## Fix in 4.0.1: missing tournament fixtures

The tournament hub now checks for missing/legacy tournament data before reading fixtures and offers **Rebuild tournament** while retaining a valid drafted XI. Result computation refreshes when the simulation module changes; restored runs regenerate results with the current engine and clamp stale match indices. Stored result snapshots are discarded rather than treated as current tournament data.

If you see `Cannot read properties of undefined (reading 'fixtures')` while updating from an earlier ZIP:

1. Stop the older Expo development server.
2. Extract this complete ZIP into a fresh folder. Keep `app`, `shared` and `server` from the same version; copying only the screen files can leave an older simulation engine behind.
3. From `app`, install and clear Metro's cache:

```bash
npm ci
npx expo start --clear
```

Reload/reopen the app from that server. You do not need to delete all local data. **Rebuild tournament** restarts the current tournament presentation with the same XI; history and favourites are kept.

## Start on web

Use Node 24 LTS:

```bash
cd app
npm ci
cp .env.example .env
npm run web
```

Regular play needs no server. On Windows use your editor or `copy` to create `.env` from `.env.example`. Native play works offline after installation. The website needs an initial connection to load its files; no service worker is configured for a cold offline browser launch.

### Start the API

In another terminal:

```bash
cd server
npm ci
cp .env.example .env
npm run dev
```

Set `MONGODB_URI` to your MongoDB connection string, `SEED_SECRET` to a random secret of at least 24 characters and `WEB_ORIGINS` to comma-separated exact web origins. Never commit `.env`. Generate a secret with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Set the app's sole public environment variable, `EXPO_PUBLIC_API_URL`, to the API origin without `/api`, for example `http://localhost:4000`. Restart Expo after changing it. This value is public and must not contain credentials.

Endpoints: `GET /api/health`, `GET /api/daily`, `POST /api/scores`, `GET /api/leaderboard?date=YYYY-MM-DD`. Daily date uses UTC. POST sends playerName, date, eleven picks, and config (tactic, captain, Standard difficulty). The server validates and recomputes the tournament result.

### Android development

Install Android Studio and start an emulator, or connect an Android device with USB debugging:

```bash
cd app
npm ci
npm run android
```

Use `http://10.0.2.2:4000` for an Android emulator. For a physical phone use your computer's LAN address, the same Wi-Fi network and an open firewall port 4000. Use HTTPS for deployment.

### iOS simulator

Requires macOS and Xcode; Windows cannot run the simulator:

```bash
cd app
npm ci
npm run ios
```

Use `http://localhost:4000`. Physical iOS distribution ordinarily requires Apple signing/membership. No compiled iOS binary or APK is included.

### Static web build

```bash
cd app
npm run typecheck
npx expo export --platform web
```

Output: `app/dist`. The complete repository must be available at build time because the app imports `shared`.

## Free deployment path

Free plans have quotas and may change. They are suitable for an MVP, not guaranteed permanent production entitlements.

### Atlas + Render

1. Create an Atlas free MongoDB cluster, a database user and network rules permitting Render's outbound addresses. Use a database-scoped user and a URL-encoded password in the connection string.
2. Push the entire source repository to GitHub, excluding `.env`, dependencies and generated output.
3. Create a Render free Node Web Service. Leave Root Directory at repository root.
4. Build: `cd server && npm ci && npm run build`.
5. Start: `cd server && npm start`. Health path: `/api/health`.
6. Set `MONGODB_URI`, `SEED_SECRET`, `WEB_ORIGINS` and `TRUST_PROXY=1` for the expected single Render proxy. Check proxy topology before changing the trust setting. Render supplies `PORT`.
7. Confirm `/api/daily` returns JSON. Put the Render HTTPS origin in `EXPO_PUBLIC_API_URL`.

Free Render services sleep. The app sends an initial health request, allows up to 90 seconds for requests, shows a wake-up message after 2.5 seconds and leaves regular Play independent of the API. Failed actions can be retried; there is no keep-alive bot.

### Vercel or Netlify

Import the full repository with project root at repository root. Set `EXPO_PUBLIC_API_URL` to your Render HTTPS origin before building.

Vercel: framework Other; install `cd app && npm ci`; build `cd app && npm run build:web`; output `app/dist`.

Netlify: build `cd app && npm ci && npm run build:web`; publish `app/dist`.

The app uses one route, so no SPA rewrite is necessary. Add your exact deployed web origin to Render's `WEB_ORIGINS`. Redeploy after changing the public API URL.

### Android APK via EAS

Create a free Expo account; free build quotas/queues apply. From `app`:

```bash
npx eas-cli@latest login
npx eas-cli@latest init
npx eas-cli@latest env:create --environment preview --name EXPO_PUBLIC_API_URL --value https://YOUR-RENDER-SERVICE.onrender.com --visibility plaintext
npx eas-cli@latest build --platform android --profile preview
```

Replace the example URL with your actual service. Commit the project ID/configuration written by `eas init`. The preview profile produces an APK; attach the downloaded file to a GitHub Release or share its EAS download link. Users need to allow Android installation from their browser/file manager.

For an iOS simulator cloud build use `npx eas-cli@latest build --platform ios --profile simulator`. Physical-device signing uses the production profile and your Apple account; check current account requirements before promising free iOS distribution.

## Saving, replays and fairness

Local saves are per device/origin. Clearing storage deletes progress. History keeps the latest 50 compact summaries, manager names and match keys; movement is regenerated for replays. There is no account/cloud sync or telemetry.

A new Free Play attempt saves its own match key. Most result variation is small, with a 7% per-match volatility switch allowing occasional larger shocks. Replay keeps the original key. Changing a score by one goal can still affect qualification or knockout progression substantially.

Daily uses a fixed match key and Standard difficulty so the server can recompute scores. It accepts one score per HMAC-hashed network IP per UTC day. Shared Wi-Fi may block another person and changing networks bypasses the limit. This is casual anti-abuse, not competition-grade anti-cheat; the engine and seeds are public. No prizes or money are involved. A public privacy/retention policy is needed before broad launch.

V4 starts a fresh local-save namespace because prior results did not include a World Cup draw. Earlier namespaces are left untouched and not imported. The API uses rules version 4 and excludes older leaderboard entries. Deploy app and server together. To keep targets in sync, build web and APK from the same commit with the committed lockfiles. OTA updating is not configured; native dependency changes require a new binary.

## Tests

```bash
# root, Node 24
npm test
npm run test:recovery
cd app
npm run typecheck
npm run build:web
cd ../server
npm run build
cd ..
node --experimental-strip-types --test tests/api.test.ts
node --experimental-strip-types --test tests/multiplayer.test.ts
```

`test:recovery` requires the app and server dependencies installed. It renders missing/legacy fixture cases and a valid hub using React DOM and esbuild; output is temporary under `app/node_modules/.cache`.

The API test uses `mongodb-memory-server-core` to start an isolated temporary MongoDB. First execution downloads a MongoDB binary; local process/network permissions are required. Your Atlas database is not touched.

For browser interaction tests, serve `app/dist` on port 8089, then at root:

```bash
npm install --no-save playwright
npx playwright install chromium
node tests/browser.cjs
```

Set `GAME_TEST_URL` for another local origin. Tests use an isolated browser context. See `VALIDATION.md` for performed checks and real-device/deployment limits.

## Case study and real interest

`CASE_STUDY.md` records the iterations and trade-offs without invented user results. Share a web link first: it has much less friction than an unfamiliar APK. Keep Play obvious, the manager field optional, regular play independent of the server and the guide dismissible. Longer commentary is now an intentional choice; observe whether people prefer 1× or 4×.

No one can predict enjoyment from a feature list. A useful first experiment is 50–100 relevant fans, looking for completed drafts/tournaments, voluntary replays and shares. Track denominators and acquisition sources, ask where people dropped off, and use actual evidence before claiming retention or demand. Analytics are not installed.

### Optional two-browser multiplayer check

After installing app/server dependencies and the optional root Playwright dependency, export a local-only test build with `EXPO_PUBLIC_API_URL=http://localhost:4125`, then run:

```bash
node tests/multiplayer-browser.cjs
```

The test starts its own temporary MongoDB/API on port 4125 and static server on 8092, uses two isolated browser sessions and never intentionally targets production. It checks create/join/draft, completion, refresh/reconnect, playback and expired-room polling recovery. Close services occupying those ports first. The test refuses a web build that does not contain the local test API origin. Rebuild the web app with your real API URL before deploying it publicly.
