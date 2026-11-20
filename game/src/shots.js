// Deterministic scene setup for ?shot=... pages. A scene advances the real simulation a fixed
// number of steps with a scripted control snapshot, then leaves the world in a repeatable pose. No
// drawing happens here; the caller paints one frame after staging and signals that it is ready.
import { CITY, STEP } from './config.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const WALK_STEPS = 150;

function vehicleList(world) {
  if (!Array.isArray(world.state.vehicles)) world.state.vehicles = [];
  return world.state.vehicles;
}

function stagedCar(type, x, y, angle, options) {
  return {
    type,
    x,
    y,
    angle,
    speed: options.speed || 0,
    slide: options.slide || 0,
    width: options.width || 54,
    length: options.length || 27,
    color: options.color || '#c65b52',
    health: 100,
    driver: options.driver || null,
    aiControl: options.aiControl || null,
    siren: Boolean(options.siren),
    mission: false,
    controlled: Boolean(options.controlled),
    wrecked: false,
    smokeClock: 0,
    plate: options.plate || 'SB-214',
  };
}

function stageDrive(world, player) {
  const cars = vehicleList(world);
  const sports = stagedCar('sports', player.x, player.y, 0, {
    speed: 220, slide: 5, width: 52, length: 25, color: '#e04f4a', controlled: true, plate: 'SB-417',
  });
  cars.unshift(sports);
  player.vehicle = sports;
  player.inVehicle = true;
  player.speed = sports.speed;
  player.angle = sports.angle;
  cars.push(stagedCar('sedan', player.x - 230, player.y - 104, 0, {
    speed: 145, width: 54, length: 27, color: '#d9c36a', driver: 'ai',
    aiControl: { throttle: 0.7, steer: 0 }, plate: 'SB-182',
  }));
}

function stageChase(world, player) {
  const cars = vehicleList(world);
  const positions = [
    [-268, -148, 0.5], [232, -176, 2.4], [-196, 192, -0.8], [286, 156, 3.5],
  ];
  for (let index = 0; index < positions.length; index += 1) {
    const place = positions[index];
    cars.push(stagedCar('cruiser', player.x + place[0], player.y + place[1], place[2], {
      speed: 158, width: 56, length: 28, color: '#e8ecef', driver: 'police', siren: true,
      aiControl: { throttle: 0.7, steer: 0 }, plate: `SB-${910 + index}`,
    }));
  }
  if (world.state.wantedState) {
    world.state.wantedState.heat = 94;
    world.state.wantedState.stars = 3;
  }
}

function walk(world, steps, control) {
  for (let index = 0; index < steps; index += 1) world.step(STEP, control);
}

export function stageShot(name, world) {
  world.reset();
  const player = world.player;
  const driving = name === 'drive';
  if (driving) name = 'play';

  if (name === 'play' || name === 'chase' || name === 'mission' || name === 'end') {
    walk(world, WALK_STEPS, { x: 0.7, y: 0.1, run: true, aimX: player.x + 260, aimY: player.y - 40 });
    if (driving) stageDrive(world, player);
    if (name === 'chase') player.wanted = 3;
    if (name === 'chase') stageChase(world, player);
    if (name === 'mission') {
      world.state.mission = { marker: { x: 18 * CITY.cell, y: 12 * CITY.cell }, objective: 'Reach the contact' };
      world.state.message = 'Meet your contact in Downtown';
    }
    if (name === 'end') {
      world.damage(200);
      walk(world, 2, { x: 0, y: 0, run: false });
      return { screen: SCREEN_OVER };
    }
    return { screen: SCREEN_PLAY };
  }

  walk(world, 60, { x: 0, y: 0, run: false });
  return { screen: SCREEN_TITLE };
}

export function holdShot(name, world) {
  const player = world.player;
  if (name === 'chase') {
    player.wanted = 3;
    if (world.state.wantedState) {
      world.state.wantedState.stars = 3;
      world.state.wantedState.heat = 94;
    }
  }
  if (name === 'drive' && player.vehicle) {
    player.speed = player.vehicle.speed;
    player.angle = player.vehicle.angle;
  }
  if (name === 'mission') {
    world.state.mission = {
      marker: { x: 18 * CITY.cell + 64, y: 12 * CITY.cell + 64 },
      objective: 'Meet Nia at the Downtown warehouse',
    };
    world.state.message = 'Side job: Three Stops';
  }
}
