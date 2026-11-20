import { STEP } from './config.js';
import { SCREEN_PLAY, SCREEN_TITLE } from './render.js';

export const sceneHooks = {};

function advance(world, count, control) {
  for (let index = 0; index < count; index += 1) world.step(STEP, control);
}

function place(world, x, y, aim) {
  world.state.player.x = x;
  world.state.player.y = y;
  world.state.player.aim = aim;
  world.camera.center(x, y);
}

export function stageShot(name, world) {
  world.reset();
  const scene = name ?? 'start';

  if (scene === 'start') {
    advance(world, 90, { move: { x: 0, y: 0 } });
    return SCREEN_TITLE;
  }

  if (scene === 'drive') {
    const roadX = world.city.roadsX[5];
    const roadY = world.city.roadsY[4];
    place(world, roadX, roadY, 0);
    const driveCar = world.systems.vehicles.spawn('sport', roadX, roadY, 0, { speed: 215 });
    world.systems.vehicles.enter();
    driveCar.damage = 4;
    advance(world, 70, { move: { x: 1, y: 0 }, run: false });
  } else if (scene === 'chase') {
    const roadX = world.city.roadsX[7];
    const roadY = world.city.roadsY[3];
    place(world, roadX, roadY, 0);
    world.state.wanted = 5;
    world.systems.vehicles.spawn('sport', roadX, roadY, 0, { speed: 245 });
    world.systems.vehicles.enter();
    for (let index = 0; index < 4; index += 1) world.systems.police.spawnUnit(true);
    for (let index = 0; index < 2; index += 1) world.systems.police.spawnFootOfficer();
    advance(world, 100, { move: { x: 1, y: 0 }, run: true });
  } else {
    const roadX = world.city.roadsX[3];
    const roadY = world.city.roadsY[5];
    place(world, roadX + 54, roadY + 52, -0.4);
    world.state.objective = 'Meet your cousin at the Harbor Gate';
    world.state.area = world.city.districtAt(world.state.player.x, world.state.player.y);
    world.state.areaTimer = 4;
    world.systems.missions.start(1);
    world.systems.combat.give('pistol');
    advance(world, 60, { move: { x: 0, y: 0 } });
  }

  if (sceneHooks[scene]) sceneHooks[scene](world);
  return SCREEN_PLAY;
}
