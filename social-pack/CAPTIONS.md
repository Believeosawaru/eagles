# Eagles 7–0 — social captions

Drafts only. Nothing has been published. Use the six numbered carousel images in order. The phone frames are presentation mockups based on browser captures, not proof of physical iPhone testing. The prototype was built with AI-assisted development. Do not add invented installs, user counts, retention, revenue or App Store availability.

## X — single post

I turned a Nigerian football draft idea into Eagles 7–0: draft your XI, manage a World Cup run, then challenge a friend online.

The hardest parts? Believable match action, stale tournament data, and keeping two players on one server result.

Which legend starts in your XI?

## X — optional six-post thread

1/ Eagles 7–0 started with a simple question: what happens when you draft an all-time Nigerian XI and try to win seven matches? It became a playable, AI-assisted Expo project for web and mobile source.

2/ The first draft screen was mostly names. I added player cards, a 4–3–3 pitch, captain selection and era chemistry. The data now includes 64 Nigerian legends, with 44 bundled photos and honest fallbacks for the rest.

3/ Random scores weren't enough. The match needed a story: recover the ball, pass, carry, shoot, save or score. Goals and assists now come from the same event timeline as the commentary and moving pitch.

4/ A real bug changed the architecture: “Cannot read properties of undefined (reading 'fixtures')”. The fix checks the data boundary, regenerates stale results and preserves the XI. Eight targeted recovery rendering checks passed.

5/ A shared seed isn't multiplayer. I added two-manager rooms with private tokens, server-validated picks, reconnect support and one saved match result. Two API clients and two browser sessions completed the flow. Playback is a shared simulation, not live football controls.

6/ The next proof is people playing it. Web, API and bundle checks passed; native installation and production hosting still need validation. No launch metrics yet. I'd love feedback from football fans: what would make you come back for another run?

## Instagram — carousel caption

A football idea became a playable build. 🦅⚽

Eagles 7–0 lets you draft an all-time Nigerian XI, name yourself as manager, and take on a classic 32-team fantasy World Cup. There’s also an online two-manager mode: create a room, invite a friend, draft independently, and let the server decide the match.

Swipe through the build story:
01 — The idea and the product
02 — Making the draft feel like building a team
03 — Giving the ball a reason to move
04 — The fixtures crash and a safer recovery
05 — Moving from a shared seed to a shared room
06 — What shipped, and what still needs proof

The hardest work was connecting the details: names to lineups, goals to assists, commentary to movement, and both players to one trustworthy result.

This was an AI-assisted development project. The screens and reported bugs are from the actual build. The phone frames are presentation mockups; physical iPhone/Android testing and production deployment remain next steps.

No invented user numbers or growth claims. Just a working prototype, repeatable checks and the next round of feedback.

My question for football fans: who is the first midfielder in your all-time Nigerian XI?

#ReactNative #Expo #TypeScript #BuildInPublic #NigerianFootball #AppDevelopment

Photo note: the draft capture uses Maduka Okoye's CC0 photo. Full photo sources/licences are in ASSETS.md. The UI uses historical 2022 opposition squads; it does not claim current team/manager data.

## Facebook

I’ve been building Eagles 7–0 — a football game centred on an all-time Nigerian XI.

You spin through eras, choose your players, name yourself as manager, and take on a classic 32-team fantasy tournament. The match plays out on a virtual pitch, with scorers, assists, commentary, group tables and a knockout path. Friends can now create a private room, draft on separate devices and watch the same server-calculated head-to-head result.

The interesting part of this project has been the iteration. Text-only selections became photo cards and a formation. A ball that wandered across the screen became connected passing and shooting sequences. A fixtures crash led to validation and recovery that keeps the player's XI. Multiplayer meant validating picks and saving one result on the server, rather than trusting either client.

The six images show that journey, including the difficult parts. This was an AI-assisted build; the screens and bugs are real. The iPhone frames are visual mockups, not a claim that it is already published or tested on a physical iPhone.

The web flow, API checks and native bundle exports have passed. Production hosting, signed app installation and feedback from real football fans are still next. I’m not claiming growth figures before there are any.

Who makes your all-time Nigerian midfield?

## Posting notes

- Do not describe the multiplayer simulation as live player control or a physics engine.
- Do not say “available on the App Store” or “tested on iPhone”. Those checks have not happened.
- For a public trial, deploy the updated API and web build first. Add the actual URL only after testing it yourself. These drafts intentionally contain no fake link.
- Do not claim production scalability from the two-client functional tests; load testing has not been performed.
- If sharing raw screens with additional player photos, retain their individual credits/licences from ASSETS.md. The carousel's chosen draft photo is CC0. Screens with other photos are included as source material, not a licence-free photo collection.
