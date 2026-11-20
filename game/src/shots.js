import { MAP, TICK } from './config.js';
import { lanePoint } from './city.js';
import { idle } from './input.js';
import { SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { carById, newCar } from './vehicles.js';
import { forceStars } from './wanted.js';
import { deployBlock } from './police.js';
import { beginStory } from './missions.js';
import { armPlayer } from './combat.js';

function roll(world, seconds, orders) {
  const steps = Math.round(seconds / TICK);
  for (let i = 0; i < steps; i += 1) {
    const custom = typeof orders === 'function' ? orders(i) : orders;
    world.step(TICK, idle(custom));
  }
}

function commandeer(world, x, y, angle, velocity) {
  if (world.player.carId !== null) {
    const old = carById(world, world.player.carId);
    if (old) old.driver = null;
  }
  let car = world.vehicles.find((unit) => unit.kind === 'sports'
    && unit.alive && unit.driver === null) ?? null;
  if (car === null) car = newCar(world, 'sports', x, y, angle, { type: 'player' });
  car.x = x;
  car.y = y;
  car.angle = angle;
  car.velocity = velocity;
  car.sideways = 0;
  car.hp = car.maxHp;
  car.driver = { type: 'player' };
  car.siren = false;
  car.route = null;
  world.player.carId = car.id;
  world.player.x = x;
  world.player.y = y;
  world.player.angle = angle;
  world.camera.x = x;
  world.camera.y = y;
  return car;
}

function stageStart(world) {
  world.tickHint = 210;
  world.dayClock = 0.42;
  world.camera.x = world.player.x;
  world.camera.y = world.player.y;
  return SCREEN_TITLE;
}

function stageDrive(world) {
  const spot = lanePoint('h', MAP.first + 4 * MAP.step, 1480, 1);
  commandeer(world, spot.x, spot.y, 0, 118);
  world.dayClock = 0.44;
  roll(world, 3.2, (i) => ({
    y: -1,
    x: i > 60 && i < 112 ? 0.12 : 0,
    aimX: world.player.x + 420,
    aimY: world.player.y + 40,
  }));
  return SCREEN_PLAY;
}

function stageChase(world) {
  const spot = lanePoint('v', MAP.first + 8 * MAP.step, 1340, 1);
  commandeer(world, spot.x, spot.y, Math.PI / 2, 235);
  world.dayClock = 0.72;
  world.player.hp = 100;
  world.player.armor = 100;
  forceStars(world, 5, 'Highway pursuit');
  roll(world, 0.35, { y: -1 });
  deployBlock(world);
  roll(world, 1.6, (i) => ({
    y: -1,
    x: i % 90 < 36 ? -0.08 : 0.05,
    aimX: world.player.x + Math.cos(world.player.angle) * 500,
    aimY: world.player.y + Math.sin(world.player.angle) * 500,
  }));
  return SCREEN_PLAY;
}

function stageMission(world) {
  world.player.x = 620;
  world.player.y = 980;
  world.player.hp = 100;
  world.player.armor = 35;
  world.player.money = 1340;
  world.player.respect = 46;
  armPlayer(world);
  world.dayClock = 0.55;
  beginStory(world, 3);
  for (let i = 0; i < 8 && world.dialogue !== null; i += 1) {
    world.step(TICK, idle({ confirm: true }));
  }
  world.dialogue = null;
  world.camera.x = world.player.x;
  world.camera.y = world.player.y;

  const first = world.peds.find((person) => person.type === 'enemy') ?? null;
  if (first !== null) {
    world.player.angle = Math.atan2(first.y - world.player.y, first.x - world.player.x);
  }
  roll(world, 1.1, () => {
    const target = world.peds.find((person) => person.type === 'enemy') ?? first;
    return {
      fire: true,
      aimX: target ? target.x : world.player.x + 300,
      aimY: target ? target.y : world.player.y,
    };
  });
  return SCREEN_PLAY;
}

export function stageShot(name, world) {
  if (name === 'drive') return stageDrive(world);
  if (name === 'chase') return stageChase(world);
  if (name === 'mission') return stageMission(world);
  return stageStart(world);
}
