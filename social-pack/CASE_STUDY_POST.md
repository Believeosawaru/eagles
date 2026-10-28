# Eagles 7–0: turning a nostalgic football idea into a playable MVP

I wanted the starting point to feel familiar to Nigerian football fans: an all-time XI, a few difficult choices, and the hope of winning every match.

That became Eagles 7–0, an independent football draft game built with AI-assisted development. The product lets a player draft Nigerian legends across eras, manage a classic 32-team fantasy World Cup, and challenge another manager in an online room.

The source is one Expo/React Native application for web and mobile targets, with TypeScript and a Node.js/Express/MongoDB backend. The case study is about the choices and corrections that made the prototype coherent. It is not a claim about launch success or production scale.

## 1. Making the draft feel like a team

The earliest version was text-heavy. It explained the rules but didn't give the player enough of the feeling of assembling an XI.

The next iteration added a visible 4–3–3, era spins, player cards, a captain and chemistry. A draft also needed firm rules: three legal options, the right broad position, and no duplicate selections. The choices use a seeded algorithm, with remaining-player pools checked before an era is offered.

The bundled Nigerian pool contains 64 footballers. Forty-four have sourced photos with reuse metadata; the other twenty have labelled silhouettes. I kept the missing-data state visible instead of substituting a different person's face.

## 2. Giving the match a believable story

A score reveal was too thin. Simply moving a ball from one side of the pitch to the other also looked disconnected from football.

The simulation now builds connected possession scenes: recover the ball, find midfield, carry into space, play a forward in, shoot, then save, miss or score. Player-position snapshots keep the ball aligned with its carrier or receiving target. Goals and assists are tied to those events, and the displayed score comes from the same sequence.

The commentary reacts to the situation. An equaliser near full-time should sound different from an early opening goal or a late consolation. Goal holds, a scale celebration and confetti give those moments more weight. Reduced motion is respected, and players can pause or change speed.

This is still a condensed 2D simulation. It is not a football physics engine or live control of the players.

## 3. Fixing the fixtures crash

One reported screen showed: “Cannot read properties of undefined (reading 'fixtures')”.

The immediate problem was an unchecked assumption that every result contained the newer tournament structure. The screenshot alone did not prove whether old saved data, mixed source files or cached modules caused the missing field.

The fix was to treat that boundary explicitly: validate the tournament before reading fixtures, regenerate saved results with the current engine, normalise outdated match indices, and offer a rebuild that preserves the drafted XI. Eight targeted rendering checks passed, along with a browser restoration check.

This was a useful reminder that adding features also changes the shape of saved state. The transition needs design as well as code.

## 4. Making multiplayer mean two actual participants

A friend challenge seed lets two people compare a draft, but it is not a shared multiplayer session.

The online mode now has two-manager rooms. Each participant receives a private room token; the server validates their draft choices, hides the opponent's selections until both teams are locked, and calculates one match result. Both clients receive that same saved timeline. Room data lives in MongoDB with a thirty-minute expiry, so reconnects can recover a valid room.

The current transport is periodic HTTP polling. That keeps the MVP simple and compatible with the existing deployment path, but it is not a claim of real-time player input or large-scale performance. Playback can be paused independently. Two independent API clients and two browser sessions completed create, join, draft, finish and reconnect checks.

## 5. Adding a tournament context and an identity

The solo mode now has group points, qualification, a knockout tree, match information, lineups, scorer and assist tables. Opponents use a clearly labelled historical 2022 squad/manager snapshot from FIFA's published list. Nigeria replaces Qatar in the classic field. The modern 48-team format is not silently presented as a seven-match run.

I also added a playful Fredoka type direction and an eagle/football mark across the app's home, loaders, splash configuration and icon assets. The six-image carousel uses real browser captures in presentation phone mockups to explain the product and the engineering work behind it.

## What the checks prove — and what they don't

The project has draft, simulation, recovery and API checks, plus browser interaction checks and web/native bundle exports. Those give useful evidence that the implemented flows agree with one another.

They do not prove physical-device quality, reliable production hosting, long-term retention or demand. Signed APK installation, iOS device testing, production deployment and user research remain next steps. There are no invented install, revenue or engagement numbers in this case study.

The next experiment is simple: let a small group of football fans play, observe where they hesitate, and see whether they voluntarily draft again or share a result. A feature list is only a hypothesis until people choose to use it.
