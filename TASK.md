# TASK: Build the entry game for gta6-01 ("Make GTA 6")

Read RULES notes below, then build a COMPLETE, POLISHED, ORIGINAL open-world crime game in `game/`,
replacing the starter "Block Dodger" entirely. This is a competition entry judged on completeness,
depth, polish, look and structure (in that order). Do not touch `vendor/` or `main.ts`.

## What the game is
A top-down 2D city crime game ("GTA 1/2 style") in vanilla JavaScript ES modules + Canvas 2D,
served as static files from game/index.html, NO network requests, NO external assets, NO libraries
(no three.js; everything drawn with Canvas 2D). Runs at 60 fps on a laptop. Keyboard + mouse.

## Required systems (all must exist and work together)
1. CITY: an original sun-soaked coastal city, "Solara Bay", with districts (Downtown, Marina,
   Palmside, Old Town, Industrial, Suburbs...), a road grid with intersections, sidewalks, parks,
   beach and water, varied building shapes/rooftops, street furniture, traffic lights, palm trees.
   Procedurally laid out from a seeded RNG so screenshots are reproducible. Seamless world, camera
   follows the player. Minimap in the HUD showing roads, player, objective blip, police.
2. PLAYER ON FOOT: WASD/arrows walk+run, mouse aim, left click punch/shoot when armed, E to enter
   or jack a nearby car (pull the driver out), F enter/exit alternative. Health, armor, money.
   Wasted (health 0) and Busted (police catch you at wanted 1+) states with respawn.
3. CARS: several original vehicle types (sedan, sports, taxi, van, police cruiser, truck) with
   distinct handling (speed, accel, grip, size). Steal parked and moving cars; drive with
   acceleration, braking, handbrake, drift feel; collisions with buildings, other cars, peds
   (peds and cars react). Damage states (dents, smoke, fire, explosion). Horn.
4. TRAFFIC AI: cars drive on the right lane, stop at lights, avoid each other, some parked.
   Pedestrians walk sidewalks, flee gunfire/car near-misses.
5. WANTED SYSTEM: 1-5 stars. Crimes raise it (jacking, hitting peds/cars, shooting, killing).
   Police respond: patrol cars pursue at 1-2 stars, roadblocks + more units at 3+, heavier at 4-5.
   Stars decay when hidden/away from police; pay n' spray style shop clears wanted for money.
6. COMBAT: fists + pistol (pickups), simple but readable: muzzle flash, hit flashes, ammo,
   reload. Peds/police/enemies have health. Blood-lite puff effects, no gore needed.
7. MISSIONS + STORY: a chain of at least 8 story missions with objectives (go to marker, steal a
   specific car and deliver it, chase and ram a fleeing car, survive a shootout, timed delivery,
   escort, escape police heat, finale) introduced by short story dialogue with ORIGINAL characters
   (e.g. your cousin Marco, fixer "La Sombra", corrupt detective). Mission markers on map+world,
   objective text on HUD, money+respect rewards, fail/retry. Plus at least 3 side activities
   (taxi fares, rampage, delivery checkpoints).
8. HUD: health/armor bars, money, wanted stars, weapon+ammo, mission objective line, area name
   popup, minimap with player arrow + objective blip + police dots. Pause menu (Esc): resume,
   controls, save, load, quit to title. Toast/notification system.
9. START SCREEN + SAVE: title with "New Game / Continue / Controls", logo art drawn in canvas,
   animated background. Save/load to localStorage (position, money, mission progress, owned stats).
10. AUDIO: WebAudio-synthesized everything (engine hum that pitches with speed, gunshots,
    explosions, police siren, UI blips) plus a simple original synthwave/chill loop for music,
    with a mute toggle (M). No audio files.
11. POLISH: day/night cycle with headlights/streetlights at night, shadows, particle effects
    (exhaust, skid marks, smoke, muzzle), screen shake, smooth camera with lookahead, nice
    typography, intro fade-ins, game feel (accel curves, drag).

## Originality (hard rule)
Everything is invented: city, district names, street names, characters, car models and names,
story, radio DJ lines. NOTHING from Rockstar/GTA or any commercial game: no names, logos,
characters, map or assets. Do not copy any existing open-source game's code.

## File structure (judge reads the file outline; names matter)
Split game/src into single-job modules with descriptive names, e.g. city.js (layout), render.js
(drawing), vehicles.js, traffic.js, peds.js, player.js, police.js, wanted.js, missions.js,
story.js, combat.js, hud.js, minimap.js, audio.js, music.js, save.js, effects.js, camera.js,
input.js, main.js, shots.js. No file over ~600 lines if avoidable.

## Screenshots (judge sees mostly these - make them SHOW the systems)
Keep/replace the ?shot= scene system in shots.js: deterministic seeded scenes that run the real
game forward briefly and screenshot. Four scenes: (1) start/title, (2) driving through Downtown
with HUD+minimap, (3) a police chase with 3+ wanted stars visible, (4) mid-mission with objective
text. Name them 1-start.jpg, 2-drive.jpg, 3-chase.jpg, 4-mission.jpg under screenshots/ as real
JPEG renders (run the game headless to capture; see serve.ts + shots flow). Max 4 screenshots,
each <= 200 KiB.

## Verify before you finish
- node serve.ts, then with a headless browser or shots flow capture the 4 screenshots.
- makefun check: `node /workspace/makefun/gta6-01-kit/cli/makefun.mjs check --kit /workspace/makefun/gta6-01-kit --repo /workspace/makefun/gta6repo` must pass.
- git add+commit when the game works.
