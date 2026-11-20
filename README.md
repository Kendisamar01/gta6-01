# Solara Bay

An original top-down open-world crime game built with vanilla JavaScript ES modules and Canvas 2D. Explore a seeded coastal city, steal and drive cars, take jobs from a cast of invented characters, survive police chases and make your way through eight story missions. Everything is drawn and synthesised at runtime; the game needs no network, assets or libraries.

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/Kendisamar01/gta6-01/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/Kendisamar01/gta6-01/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

[Open the make.fun bounty page](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

## Run it

```sh
node serve.ts
```

Then open <http://localhost:8080>. No build step or install is required. `node main.ts` packages the game and screenshots for judging, and `node capture-shots.mjs` regenerates the four JPEG captures in `screenshots/`.

## Controls

WASD or arrow keys move and steer. Shift runs or accelerates, Space is the handbrake, and the mouse aims. Left click punches, shoots or sounds the horn; E and F enter or leave cars. R reloads, H honks, Q cycles side activities, M mutes audio, Tab opens the map view and Escape opens the pause menu.

## File structure

- `main.ts` packages the static game and writes the dossier.
- `serve.ts` is a small local static server for `game/`.
- `game/index.html` hosts the canvas and the module entry point.
- `game/src/config.js` and `random.js` hold tuning values and the seeded RNG.
- `city.js`, `city-render.js`, `entity-render.js`, `environment.js`, `camera.js` and `render.js` build and draw the world.
- `vehicles.js`, `traffic.js`, `peds.js`, `police.js`, `wanted.js` and `combat.js` simulate the street life.
- `missions.js`, `story.js`, `hud.js`, `minimap.js`, `effects.js`, `audio.js`, `music.js`, `menu.js` and `save.js` provide the game systems.
- `world.js`, `input.js`, `engine.js`, `main.js` and `shots.js` own state, input, the loop and deterministic screenshot scenes.
- `shots.json` lists the four screenshot queries; `capture-shots.mjs` renders them in headless Chrome.

## How it was built

The city is generated from an integer seed into a road grid with districts, parks, beach and water. Gameplay modules update a single world state in fixed 1/60-second steps, and renderers read that state without mutating it. The title, pause screens, HUD, map and all effects are canvas drawing code; audio is produced by WebAudio oscillators and noise buffers. Screenshots are produced by loading the real game with `?shot=` queries, so each frame is an actual game scene rather than a mock-up.
