# Eagles 7–0 — case study working notes

## Status
Built MVP source; pre-launch. No user research, audience results or production metrics claimed.

## Problem and hypothesis
Can a short, nostalgic Nigerian football draft give fans a reason to play, compare decisions and share a result, without an account or large download?

## Scope
One responsive Expo application, a 4–3–3 draft, 64 text-only player records, seeded match simulation, a portable result image, daily challenge and MongoDB leaderboard.

## Design direction
Dark forest green, warm off-white and lime accents. Large editorial headings, generous touch targets, limited borders, original geometric stadium illustration. The pitch turns a list of names into a team. The result card makes the player's choices the shareable object. Desktop keeps the same focused game column.

## Decisions worth documenting
- Kept normal play independent of the server, reducing the impact of sleeping free hosting.
- Used names and subjective ratings, with original artwork, avoiding official visual assets.
- Fixed duplicate selection by calculating eligible era pools from remaining players.
- Recomputed daily results on the server instead of trusting posted scores.
- Accepted a network-level submission cap and documented its shared-Wi-Fi drawback.
- Used a single route with local game state to keep the MVP simple; runs do not survive refresh.
- Used broad position categories rather than claiming detailed historical tactical accuracy.

## Suggested research
Observe five fans on their own phones. Ask them to start a run without explanation. Record time to first pick, draft completion time, total run time, confusing labels and whether they understand the daily rules. Ask permission before recording. Do not guide them unless blocked.

## Before/after evidence to collect
Save initial design sketches, representative home/draft/result captures, observed usability issues, changes made in response, and real analytics with dates and sample sizes. Do not describe internal logic tests as user validation.

## Open questions
Does drafting eleven players feel too long? Do fans prefer three-player choice cards or faster auto-draft? Do subjective ratings invite playful discussion or frustration? Is the probability model satisfying? Do people share a losing run?

## Launch experiment
Web-first distribution to a small relevant group. Measure starts, completions, replays and shares. State acquisition context and denominators. Decide the next iteration from observed drop-off and interviews, not vanity totals.


## V2 iteration — adding a reason to watch

The initial build showed text selections and revealed final scores. The next brief requested player photos and visible action, then fifteen more features. The redesign adds photo-led cards, a 2D pitch, an event feed, match playback and local progression. The tactical dressing room gives users three understandable decisions before kick-off: approach, captain and difficulty.

The match result is calculated once from the chosen team/configuration/seed. The event timeline is constructed from that result. Goal events increment the displayed score and drive the pitch celebration; final shots are counted from events. This deliberately prioritises consistency and speed over a full physics simulation. Capturing a moving pitch gives the player something to screen-record beyond score labels.

The player photo collection is incomplete. Real thumbnails were sourced with explicit reuse metadata and bundled with attribution. Fallback silhouettes are honest missing-data states, not invented player images. The next asset task is to curate the remaining portraits, checking identities and reuse terms.

The fifteen features are itemised in README.md. Local saves and a dismissible guide reduce repeat friction; replays, favourite players, history and achievements create return hooks. These remain design hypotheses. They are not evidence that retention improved.

### Technical evidence
Automated checks cover draft validity, duplicate prevention, seeded results, event-score agreement, API recomputation, submission rules, CORS and rate limiting. Browser interaction tests cover a full draft/run, saved progress, player detail/favourite, tactics/difficulty, match pause/speed, sharing and persisted history. Device, deployment and sound/haptic checks are listed honestly in VALIDATION.md.

### Next usability questions
Do users notice that tactics affect the model? Do they understand why chemistry changes? Is the pitch engaging at 1× or do most users choose 4×? Does the photo fallback weaken nostalgia for older eras? Test those questions before adding more game modes.


## V3 iteration — uncertainty without arbitrary chaos

The next feedback highlighted two problems: repeat outcomes felt fixed and the ball appeared disconnected from player movement. Free Play now separates a draft seed from a saved attempt key. Team performance has a shared underlying baseline; most attempts perturb it gently, with a small chance of a larger match-day shock. Replays preserve the key; daily play remains deterministic and server-verifiable.

The pitch now consumes explicit event snapshots for all 22 players. Possession chains connect the ball to a carrier, receiver or shot target, with team shape, a closing defender, goalkeeper possession, misses, saves and kick-off resets. It is still a condensed visual simulation and should not be described as a full football AI or physics engine.

An automated fixed-XI fixture compared 3,000 consecutive attempts: 1,368 scorelines were identical, 2,856 differed by at most two goals combined, and 144 differed more. This checks the intended balance in one fixture; it is not user research or a universal outcome distribution. A follow-up playtest should ask whether rematches feel plausible and whether players understand the distinction between replay and a new attempt.

## V4 iteration — becoming Nigeria's manager

The next brief asked for a tournament context: manager identity, other nations' players/managers, scorers and assisters, match details and expressive presentation. The product now uses a classic 32-team fantasy field, replacing Qatar with Nigeria in a historical 2022 draw. Data comes from FIFA's published squad list; it is explicitly historical, not presented as current. This preserves the seven-win goal without silently pretending the modern 48-team format has seven matches.

Group fixtures now use points and qualification; a setback does not automatically end the run. The shared engine generates all 63 championship fixtures and a consistent knockout path. The UI progressively reveals results so the scoring awards don't spoil future matches. Nigeria matches have full movement/commentary; other fixtures are summary simulations. A third-place match and extra time are deliberately omitted and disclosed.

The user's manager name is local, optional and carried into the dugout, match centre, history and result image. Player awards aggregate actual generated goal events, with separate stable player identifiers to avoid merging similarly named players. The match centre separates fictional pundit previews from historical squad facts.

Fredoka adds a playful tone while retaining contrast and large touch targets. Goal celebrations use a scale burst and confetti, respecting reduced-motion settings. Longer goal/half-time holds and 0.5× playback make commentary easier to follow. Late goals react to the score situation (equaliser, possible winner, consolation or sealing goal) instead of using one generic message.

This changes the pacing hypothesis: full tournaments take longer at 1×. Observe whether fans enjoy managing a tournament or prefer 4× highlights. Do not claim improved retention until measured. Next research should test manager-name discoverability, group-table comprehension, whether historical labels are noticed and whether the award tables encourage finishing a tournament.


## Patch 4.0.1 — recovering from incomplete tournament data

A reported Expo error showed an unchecked access to `result.tournament.fixtures`. The visible symptom did not prove whether stale modules, older saved state or mixed source files caused the missing field. The fix treats this as a runtime boundary: validate tournament data, preserve the XI, offer a rebuild and normalise restored match indices. Targeted rendering regressions cover the exact missing-data shapes; browser validation covers a stale saved run. Update instructions now keep the app and shared engine in the same version and clear Metro's cache.


## V5 iteration — real two-participant rooms and launch materials

The brief expanded the friend feature into actual online participation. The first challenge-code mode only shared a seed; the new mode persists two seats in MongoDB, issues opaque per-seat tokens, validates every pick on the server and saves one head-to-head result. Atomic pick-count filters prevent a replayed request from adding a second player. Opponent selections are hidden until both XIs are complete.

The MVP uses periodic HTTP requests instead of claiming live football input. Room data expires after thirty minutes. This is a deliberate simplicity/cost trade-off, not evidence of production scale. API tests exercised two independent tokens, capacity rejection, invalid/stale picks and identical results. Two browser sessions completed create/join/draft, refresh/reconnect and playback. Production proxy behaviour and high-concurrency load remain untested.

A new AI-assisted eagle/football logo was applied to the home header, loaders, icon, favicon and native splash configuration. During real screen capture, two additional UI issues were visible: old scroll positions carried between screens, and image elements did not always fit their card bounds. Screen transitions now reset to the top and portrait images have explicit dimensions.

The social pack contains six original editorial phone-mockup cards based on real captures, with copy for X, Instagram and Facebook and an extended case-study draft. It shows the missing-fixtures failure and recovery without inventing user growth, native-device validation or App Store availability. Next work remains deployment, physical-device testing, fan feedback and measured retention.
