# Solara Bay

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/Kendisamar01/gta6-01/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/Kendisamar01/gta6-01/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

Bounty: https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01

Solara Bay is a top-down open-world crime game that runs entirely in the browser. It is built from vanilla JavaScript ES modules and Canvas 2D: no frameworks, no downloaded art, no audio files and no network calls. A seeded generator lays out a coastal city of seven districts, roads, parks, beach and water; you explore it on foot or in one of several original vehicles, take jobs from Marco, La Sombra, Nia and Detective Vale, and try to stay ahead of the wanted stars.

## Running it

Use Node 22 or newer. To play locally:

```sh
node serve.ts
```

Then open `http://localhost:8080` in a desktop browser. The static server only reads files inside `game/`.

To produce the submission bundle in `/output` (or in `MAKEFUN_OUTPUT_DIR` when set), run `node main.ts`. It copies the game and screenshots and writes `dossier.json`.

To regenerate the four JPEGs from `shots.json` with the headless Chrome binary used by the competition environment:

```sh
LD_LIBRARY_PATH=/workspace/chrome-libs node tools/capture-shots.mjs
```

The capture script starts its own local server, renders each `?shot=...&seed=1` scene at 1280x720, and only replaces files after all four captures succeed.

## Controls

WASD or the arrow keys move and steer, Shift runs or uses the handbrake, and the mouse aims. Left click punches or fires; E or F enters a car, talks to a contact, or advances dialogue. H sounds the horn, R reloads, M toggles sound, and Escape or P opens the pause menu. The menu offers New Game, Continue, Controls, Save Game, Load Game and Quit to Title; progress is kept in this browser's localStorage.

## Layout

- `main.ts`, `serve.ts` — submission packaging and the small static server.
- `game/index.html` — canvas host and the only HTML in the project.
- `game/src/city.js`, `city-render.js`, `environment.js` — seeded city layout and drawing.
- `game/src/world.js`, `camera.js`, `render.js`, `input.js`, `main.js` — state, fixed-step loop, camera, input and frame drawing.
- `game/src/vehicles.js`, `traffic.js`, `peds.js`, `police.js`, `wanted.js` — driving, traffic, civilians and the law.
- `game/src/combat.js`, `missions.js`, `story.js`, `effects.js` — fights, nine story jobs, three side activities and particles.
- `game/src/audio.js`, `music.js`, `hud.js`, `minimap.js` — synthesized sound, in-game radio-like loops and the interface.
- `game/src/menu.js`, `save.js`, `shots.js` — menus, persistence and deterministic screenshot scenes.
- `shots.json`, `screenshots/`, `tools/capture-shots.mjs` — the four required views and their capture tooling.
- `vendor/makefun-game.ts` — kit-supplied dossier builder; left untouched.

## How it was built

The world is generated from one integer seed, so a given `?seed=` always produces the same blocks, traffic and shot composition. Simulation runs at a fixed 60 Hz while drawing happens once per animation frame; optional gameplay systems install themselves through a small shared context, which lets the core boot even if a system is absent. All visuals are procedural Canvas 2D shapes, and every sound is produced at runtime with WebAudio oscillators, noise buffers and envelopes. Saves are compact JSON snapshots of position, vitals, money, weapons, heat and mission progress.
