# Solara Bay

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/Kendisamar01/gta6-01/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/Kendisamar01/gta6-01/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

[Open the make.fun bounty page](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

Solara Bay is a small, offline open-world crime game that runs in a desktop browser. You wander a sunlit coastal city made of roads, beaches, parks and districts, steal cars, take missions from local contacts, get into shootouts, and try to lose the police before your wanted stars fade. Everything is drawn with the canvas 2D API and all sound is synthesised in the browser; there are no network calls at play time.

## Running

The game needs Node.js 22 or later only for its local static server.

```sh
node serve.ts
```

Then open `http://localhost:8080` in a desktop browser. To build the submission output used by the competition harness, run `node main.ts`; set `MAKEFUN_OUTPUT_DIR` to write somewhere other than `/output`.

## Controls

- `W A S D` walk, drive, or steer; `Shift` runs on foot.
- Mouse aims; click attacks or fires. `1` fists, `2` pistol, `3` SMG, `R` reload.
- `E` enters a vehicle or starts a nearby mission; `F` leaves a vehicle.
- `Space` brakes while driving; `H` sounds the horn.
- `M` mutes audio; `P` or `Escape` pauses.
- `Tab` opens the pause menu. Use `W`/`S` or the arrow keys to choose, `Space` to confirm, `K` to save quickly, and `L` to load quickly.

Progress is stored in your browser's local storage. The game also saves itself periodically and when a run ends.

## Layout

- `main.ts` copies `game/` and `screenshots/` into the submission output and writes the dossier.
- `serve.ts` is a dependency-free static server for local play.
- `game/index.html` hosts the canvas and the screen-reader status line.
- `game/src/` holds the browser ES modules: world rules, city generation, rendering, input, camera, environment, vehicles, traffic, pedestrians, police, wanted level, combat, missions, story, effects, audio, music, minimap, HUD, menu, save, and screenshot staging.
- `shots.json` lists the four deterministic screenshot queries; `screenshots/` holds their JPEG output.
- `capture-shots.mjs` starts the local server and drives headless Chrome over the DevTools protocol to regenerate those four images without a browser automation library.

## How it was built

The world is generated from a numeric seed, so a given seed always creates the same streets, parked cars, pedestrians, and decoration. A fixed 60 Hz simulation advances movement, traffic, police, missions, combat, and effects independently of the display rate. Rendering layers the city, entities, particles, HUD, minimap, and optional overlays over that state. The pause menu and save file sit on top of the same state object, using additive hooks so the rest of the loop stays unchanged.

The four screenshots are staged from fresh seeded worlds: the title view, a drive through the city, a police pursuit, and a mission shootout. `capture-shots.mjs` waits for the game to announce that both the scene and its modules are ready, then captures each frame at 1280x720 as JPEG.
