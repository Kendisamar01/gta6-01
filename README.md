# Solara Bay

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/Kendisamar01/gta6-01/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/Kendisamar01/gta6-01/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

[Bounty page](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

Solara Bay is an offline, top-down crime sandbox built with plain Canvas 2D and ES modules. A seeded generator lays out a coastal city of six districts, then a 60 Hz simulation fills it with lane-following traffic, wandering pedestrians, wanted stars, police pursuits, shootouts, day/night lighting, and a dialogue-driven campaign. No packages, network calls, or asset downloads are needed.

## Play

Node 22 or newer is enough:

```sh
node serve.ts
```

Visit `http://localhost:8080`. Pass `--port 9000` to use a different port. There is no build step for playing.

To create a packaged submission folder:

```sh
mkdir -p out
MAKEFUN_OUTPUT_DIR=out node main.ts
```

That copies `game/` and the captured JPEGs into the output folder and writes `dossier.json` with the provided kit helper.

## Controls

| Input | Action |
| --- | --- |
| WASD / arrows | Move on foot; steer and accelerate in traffic |
| Shift | Sprint |
| Mouse | Aim |
| Left click | Punch or fire the sidearm |
| E | Mission interaction; enter or jack a car; buy paint |
| F | Start nearby side jobs; leave the current car |
| Space | Handbrake |
| H | Horn |
| R | Reload |
| 1 / 2 | Fists / sidearm |
| Esc or P | Pause |
| M | Mute |

## What is inside

The city generator produces blocks, buildings, parks, lamps, traffic lights, palms, beaches, water, and ten named venues from a single seed. Vehicles have distinct mass, grip, acceleration, and damage; traffic uses lanes and signals while pedestrians flee from danger. Crime escalates through five stars, drawing cruisers, armed officers, and roadblocks; hiding or visiting Hushcoat Body Shop cools the heat.

Eight story missions move from a cafe handshake to a final club assault, with original characters, dialogue, checkpoints, payouts, and retries. Taxi fares, rampage targets, and depot deliveries provide repeatable side jobs. Fists, a collectible sidearm, armor, health, cash pickups, particles, skid marks, muzzle flashes, and screen tints cover the action layer.

The HUD shows health, armor, cash, respect, stars, weapon state, objectives, area banners, notices, and a live minimap. The title and pause menus support save/load and controls. All sound is synthesized in WebAudio: engine, siren, gunfire, impacts, UI cues, and an original looping score.

## Layout

- `game/index.html` — canvas shell and live status region.
- `game/src/main.js` — boot loop, menu routing, and deterministic shot mode.
- `game/src/world.js` — state container, simulation order, interactions, respawn.
- `game/src/city.js` and `city-render.js` — layout generation and static painting.
- `game/src/vehicles.js`, `traffic.js`, `peds.js`, `entity-render.js` — moving actors.
- `game/src/wanted.js`, `police.js`, `combat.js` — crime and response.
- `game/src/story.js`, `missions.js`, `activities.js` — characters and objectives.
- `game/src/hud.js`, `minimap.js`, `menu.js`, `render.js` — interface and compositor.
- `game/src/effects.js`, `environment.js`, `audio.js`, `music.js`, `save.js` — feedback systems.
- `game/src/config.js`, `random.js`, `camera.js`, `input.js`, `shots.js` — support utilities.
- `main.ts`, `serve.ts`, `shots.json`, `capture-shots.mjs`, `screenshots/` — packaging and capture.

Every module was written for this entry. The four reviewed frames come from running the real game in headless Chrome with fixed seeds and `?shot=` queries, so they can be reproduced exactly.
