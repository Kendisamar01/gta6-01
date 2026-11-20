import { GRID, STEP } from './config.js';
import { roadPosition, resolveCircle } from './city.js';
import { neutralControls } from './input.js';
import { SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { spawnVehicle } from './vehicles.js';
import { setWantedLevel } from './wanted.js';
import { spawnRoadblock } from './police.js';
import { startMission } from './missions.js';
import { givePistol } from './combat.js';

const DRIVE_SECONDS = 3.2;
const CHASE_SECONDS = 1.6;
const FIGHT_SECONDS = 1.1;

function advance(world, seconds, controlsForStep) {
  const steps = Math.round(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    const custom = typeof controlsForStep === 'function' ? controlsForStep(i) : controlsForStep;
    world.step(STEP, { ...neutralControls(), ...custom });
  }
}

function takeCar(world, type, x, y, angle, speed) {
  for (const car of world.vehicles) {
    if (car.driver?.type === 'player') car.driver = null;
  }
  let car = world.vehicles.find((vehicle) => vehicle.alive
    && vehicle.type === type
    && vehicle.driver === null);
  if (car === undefined) car = spawnVehicle(world, type, x, y, angle);
  car.x = x;
  car.y = y;
  car.angle = angle;
  car.speed = speed;
  car.slip = 0;
  car.hp = car.maxHp;
  car.driver = { type: 'player' };
  car.ai = null;
  car.siren = false;
  world.player.inVehicle = car.id;
  world.player.x = x;
  world.player.y = y;
  world.player.angle = angle;
  world.player.aimX = x + Math.cos(angle) * 400;
  world.player.aimY = y + Math.sin(angle) * 400;
  world.camera.x = x;
  world.camera.y = y;
  return car;
}

function stageStart(world) {
  world.stepHint = 210;
  world.timeOfDay = 0.4;
  world.camera.x = world.player.x;
  world.camera.y = world.player.y;
  return SCREEN_TITLE;
}

function stageDrive(world) {
  const point = roadPosition('h', GRID.first + 4 * GRID.step, 1480, 1);
  takeCar(world, 'sports', point.x, point.y, 0, 120);
  world.timeOfDay = 0.44;
  advance(world, DRIVE_SECONDS, (i) => ({
    y: -1,
    x: i > 60 && i < 110 ? 0.12 : 0,
    aimX: world.player.x + 420,
    aimY: world.player.y + 40,
  }));
  return SCREEN_PLAY;
}

function stageChase(world) {
  const point = roadPosition('v', GRID.first + 8 * GRID.step, 1340, 1);
  takeCar(world, 'sports', point.x, point.y, Math.PI / 2, 235);
  world.timeOfDay = 0.72;
  world.player.hp = 100;
  world.player.armor = 100;
  setWantedLevel(world, 5, 'Highway pursuit');
  advance(world, 0.35, { y: -1 });
  spawnRoadblock(world);
  advance(world, CHASE_SECONDS, (i) => ({
    y: -1,
    x: i % 90 < 35 ? -0.08 : 0.05,
    aimX: world.player.x + Math.cos(world.player.angle) * 500,
    aimY: world.player.y + Math.sin(world.player.angle) * 500,
  }));
  return SCREEN_PLAY;
}

function stageMission(world) {
  const spot = resolveCircle(world.city, 830, 980, 14);
  world.player.x = spot.x;
  world.player.y = spot.y;
  world.player.hp = 100;
  world.player.armor = 35;
  givePistol(world);
  world.player.money = 1340;
  world.player.respect = 46;
  world.timeOfDay = 0.55;
  startMission(world, 3);
  for (let i = 0; i < 20 && world.dialogue; i += 1) {
    world.step(STEP, neutralControls({ confirm: true }));
  }
  world.dialogue = null;
  world.camera.x = world.player.x;
  world.camera.y = world.player.y;

  const foe = world.peds.find((person) => person.type === 'enemy');
  if (foe) {
    world.player.angle = Math.atan2(foe.y - world.player.y, foe.x - world.player.x);
  }
  advance(world, FIGHT_SECONDS, () => {
    const target = world.peds.find((person) => person.type === 'enemy') ?? foe;
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
