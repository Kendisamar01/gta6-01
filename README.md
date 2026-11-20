# Solara Bay

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/Kendisamar01/gta6-01/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/Kendisamar01/gta6-01/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

[Bounty page](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

Solara Bay is a self-contained top-down crime sandbox. It draws a fictional coastal metropolis with Canvas 2D, then layers traffic, pedestrians, police chases, combat, dialogue-driven jobs and a day/night cycle on top. The whole entry is plain ES modules with no downloads, packages, art files or network calls.

## Running it

Use Node 22 or newer:

```sh
node serve.ts
```

Open `http://localhost:8080`. Add `--port 8081` to serve elsewhere. There is no build step to play.

For a packaged submission directory:

```sh
mkdir -p out
MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` copies `game/` and the four captured screenshots into the output folder, then writes `dossier.json` using the supplied kit helper.

## Controls

| Key | Action |
| --- | --- |
| WASD / arrows | Move, steer, accelerate and brake |
| Shift | Sprint on foot |
| Mouse | Aim |
| Left click | Punch or fire the pistol |
| E | Enter or jack a car; interact with mission markers |
| F | Exit a car; start a nearby side job |
| Space | Handbrake |
| H | Horn |
| R | Reload |
| 1 / 2 | Fists / pistol |
| Esc or P | Pause |
| M | Mute |

## Systems

The seeded city has six districts, a full road grid, intersections, traffic lights, sidewalks, parks, palm-lined beaches and water. Cars have individual size, speed, acceleration and grip values; traffic uses right-hand lanes and stops at signals. Pedestrians wander sidewalks, scatter from gunfire and react to collisions.

Crimes generate 1–5 wanted stars. Patrols arrive first, then extra cruisers and roadblocks at higher heat; hiding cools the stars, and a body shop clears them for cash. Combat supports fists, a collectible pistol, reloads, pickups and light hit effects. The campaign has eight original missions with dialogue, markers, rewards and retry, alongside taxi, rampage and delivery side jobs.

The HUD carries health, armor, cash, respect, stars, weapon state, objectives, area popups, toasts and a minimap. The pause menu resumes, shows controls, saves, loads or returns to the title. Audio is synthesized live with WebAudio, including a speed-sensitive engine, siren, shots, UI tones and an original loop.

## Layout

- `game/index.html` — canvas shell.
- `game/src/main.js` — boot, fixed-step loop, menu routing and shot mode.
- `game/src/world.js` — simulation state and update order.
- `game/src/city.js`, `city-render.js` — seeded layout and static city drawing.
- `game/src/vehicles.js`, `traffic.js`, `peds.js`, `entity-render.js` — moving actors.
- `game/src/wanted.js`, `police.js`, `combat.js` — crime and response.
- `game/src/missions.js`, `activities.js`, `story.js` — objectives and characters.
- `game/src/hud.js`, `minimap.js`, `menu.js`, `effects.js`, `environment.js` — interface and presentation.
- `game/src/input.js`, `camera.js`, `audio.js`, `music.js`, `save.js`, `config.js`, `random.js`, `shots.js` — support systems.
- `main.ts`, `serve.ts`, `shots.json`, `capture-shots.mjs` — packaging, serving and screenshot capture.
- `screenshots/` — the four reviewed JPEG frames.

## How it was built

Every module was written for this brief from scratch. A fixed 60 Hz update moves deterministic systems, while a separate renderer culls and paints the 1280×720 view. City geometry comes from a seeded generator, so the same seed recreates the same streets and the four `?shot=` scenes can be captured repeatedly. Screenshots are produced by running the real game in the supplied headless Chrome, not by drawing mock images.
