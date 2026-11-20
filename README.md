# Solara Bay

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/Kendisamar01/gta6-01/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/Kendisamar01/gta6-01/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[Bounty page](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

Solara Bay is an original top-down open-world crime game drawn entirely with Canvas 2D. You walk and drive around a seeded coastal city of six districts, steal cars, outrun a five-star police response, take story jobs from Marisol Vega and Oz Renard, and try to stay alive through eight missions and three side activities. Everything is invented for this entry: the city, characters, vehicles, dialogue and music.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080. There is no build step, no dependency install, no network access and no external asset; the browser loads only the files under `game/`. Keyboard and mouse are required. Press Enter on the title screen, WASD to move, the mouse to aim and click to fire, E or F to enter and exit cars, Shift to run, Space to handbrake, R to reload, 1/2/3 to change weapon, Q to start a side activity, M to mute and Esc for the pause menu.

`node main.ts` prepares a submission folder under `/output` (or `MAKEFUN_OUTPUT_DIR`) and writes the judge's `dossier.json` there.

## Layout

- `game/index.html` hosts the canvas and status text.
- `game/src/city.js` lays out roads, blocks, buildings, parks, lights and parking from the seed.
- `game/src/city-render.js`, `entity-render.js`, `render.js` and `camera.js` draw the world and follow the player.
- `game/src/world.js`, `input.js`, `config.js`, `random.js`, `environment.js` and `main.js` form the fixed-step engine.
- `vehicles.js`, `traffic.js`, `peds.js`, `police.js`, `wanted.js` and `combat.js` run the simulation's systems.
- `missions.js`, `story.js`, `effects.js`, `audio.js`, `music.js`, `minimap.js`, `hud.js`, `menu.js` and `save.js` add objectives, feedback, sound and interface.
- `shots.js` stages the deterministic screenshot scenes listed in `shots.json`.
- `serve.ts` is the local static server; `main.ts` packages the finished entry.

## How it was built

The city is generated from one integer seed, so a given seed always produces the same streets and buildings. The loop advances the simulation in fixed 1/60-second steps, then paints the visible slice of the world. Later systems attach to the world through step and reset hooks, which keeps drawing, rules and content in separate single-job modules. All audio is synthesized at runtime with WebAudio; all art is drawn in code, including the title logo, vehicle liveries, rooftops and the minimap.
