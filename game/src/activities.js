import { GRID } from './config.js';
import { roadPosition, shopAt } from './city.js';
import { clearEnemies, spawnEnemySquad } from './peds.js';
import { givePistol } from './combat.js';
import { findVehicle } from './vehicles.js';

export function createActivityState() {
  return {
    kind: null,
    active: false,
    phase: '',
    timer: 0,
    progress: 0,
    target: 0,
    checkpoints: [],
    blip: null,
    passenger: null,
    reward: 0,
    failReason: '',
    retryTimer: 0,
    failed: false,
  };
}

export function activityMarkers(world) {
  const markers = [];
  const taxi = shopAt(world.city, 'taxi');
  const range = shopAt(world.city, 'rampage');
  const depot = shopAt(world.city, 'delivery');
  if (taxi) markers.push({ ...taxi, kind: 'taxi', label: 'Taxi fares' });
  if (range) markers.push({ ...range, kind: 'rampage', label: 'Rampage' });
  if (depot) markers.push({ ...depot, kind: 'delivery', label: 'Delivery run' });
  return markers;
}

function roadPoint(axis, line, along, direction = 1) {
  return roadPosition(axis, GRID.first + line * GRID.step, along, direction);
}

function playerCar(world) {
  return world.player.inVehicle === null ? null : findVehicle(world, world.player.inVehicle);
}

function beginTaxi(world) {
  const car = playerCar(world);
  if (car === null || car.type !== 'taxi') {
    world.toast('Steal a Sunbeam Cab first');
    return;
  }
  const job = world.activity;
  job.kind = 'taxi';
  job.active = true;
  job.phase = 'pickup';
  job.timer = 95;
  job.progress = 0;
  job.passenger = roadPoint('h', 6, 880, 1);
  job.blip = { ...job.passenger, radius: 60, label: 'Fare' };
  world.toast('Taxi fare — pick up the passenger');
  world.sfx('mission');
}

function beginRampage(world) {
  const job = world.activity;
  job.kind = 'rampage';
  job.active = true;
  job.phase = 'shoot';
  job.timer = 62;
  job.progress = 0;
  job.target = 8;
  clearEnemies(world);
  spawnEnemySquad(world, 720, 920, 10);
  givePistol(world);
  job.blip = { x: 720, y: 920, radius: 180, label: 'Targets' };
  world.toast('Rampage — 8 targets in 60 seconds');
  world.sfx('mission');
}

function beginDelivery(world) {
  const job = world.activity;
  job.kind = 'delivery';
  job.active = true;
  job.phase = 'drive';
  job.timer = 112;
  job.progress = 0;
  job.target = 8;
  job.checkpoints = [
    roadPoint('v', 3, 640),
    roadPoint('h', 2, 1380),
    roadPoint('v', 10, 880),
    roadPoint('h', 8, 2380),
    roadPoint('v', 12, 1780),
    roadPoint('h', 4, 3020),
    roadPoint('v', 6, 2140),
    roadPoint('h', 10, 1640),
  ];
  job.blip = { ...job.checkpoints[0], radius: 70, label: 'Drop 1' };
  world.toast('Delivery run — 8 drops');
  world.sfx('mission');
}

export function startActivity(world, kind) {
  if (kind === 'taxi') beginTaxi(world);
  else if (kind === 'rampage') beginRampage(world);
  else if (kind === 'delivery') beginDelivery(world);
}

function finishJob(world, amount) {
  const job = world.activity;
  world.player.money += amount;
  world.player.respect += 4;
  world.toast(`Side job complete — $${amount}`);
  world.sfx('success');
  job.active = false;
  job.kind = null;
  job.blip = null;
  job.passenger = null;
  job.checkpoints = [];
  clearEnemies(world);
}

function abandonJob(world, reason) {
  const job = world.activity;
  job.active = false;
  job.kind = null;
  job.blip = null;
  clearEnemies(world);
  world.toast(`Side job failed — ${reason}`);
  world.sfx('fail');
}

function updateTaxi(world, dt, car) {
  const job = world.activity;
  if (car === null || car.type !== 'taxi') {
    abandonJob(world, 'You left the cab');
    return;
  }
  if (job.phase === 'pickup') {
    if (Math.hypot(job.passenger.x - world.player.x, job.passenger.y - world.player.y) < 60
      && Math.abs(car.speed) < 110) {
      job.phase = 'dropoff';
      job.timer = 62;
      job.target = roadPoint('v', 14, 900 + world.random() * 1000);
      job.blip = { ...job.target, radius: 70, label: 'Destination' };
      world.toast('Passenger aboard — drive to the drop-off');
    }
    return;
  }
  if (Math.hypot(job.target.x - world.player.x, job.target.y - world.player.y) < 72
    && Math.abs(car.speed) < 130) finishJob(world, 240);
}

function updateDelivery(world, car) {
  const job = world.activity;
  if (car === null) {
    abandonJob(world, 'You left the vehicle');
    return;
  }
  const point = job.checkpoints[job.progress];
  if (!point) {
    finishJob(world, 380);
    return;
  }
  if (Math.hypot(point.x - world.player.x, point.y - world.player.y) > 74) return;
  job.progress += 1;
  const next = job.checkpoints[job.progress];
  job.blip = next ? { ...next, radius: 70, label: `Drop ${job.progress + 1}` } : null;
  world.sfx('checkpoint');
}

export function updateActivities(world, dt, controls) {
  const job = world.activity;
  if (!job.active) {
    if (!controls.interactAlt) return;
    for (const marker of activityMarkers(world)) {
      if (Math.hypot(marker.x - world.player.x, marker.y - world.player.y) > 105) continue;
      startActivity(world, marker.kind);
      return;
    }
    return;
  }

  job.timer -= dt;
  if (job.timer <= 0) {
    abandonJob(world, 'Time ran out');
    return;
  }
  const car = playerCar(world);
  if (job.kind === 'taxi') updateTaxi(world, dt, car);
  else if (job.kind === 'delivery') updateDelivery(world, car);
  else if (job.progress >= job.target) finishJob(world, 560);
}

export function onActivityPedKilled(world, ped) {
  const job = world.activity;
  if (!job.active || job.kind !== 'rampage' || ped.type !== 'enemy') return;
  job.progress += 1;
  world.sfx('hit');
}

export function activityObjective(world) {
  const job = world.activity;
  if (!job.active) return '';
  const remaining = Math.ceil(job.timer);
  if (job.kind === 'taxi') {
    return job.phase === 'pickup'
      ? `Taxi: collect your fare · ${remaining}s`
      : `Taxi: drive to the drop-off · ${remaining}s`;
  }
  if (job.kind === 'rampage') return `Rampage: ${job.progress}/${job.target} targets · ${remaining}s`;
  return `Delivery: ${job.progress}/${job.target} drops · ${remaining}s`;
}

export function currentActivityBlip(world) {
  return world.activity.active ? world.activity.blip : null;
}

export function sideJobHint(world) {
  if (world.activity.active) return '';
  for (const marker of activityMarkers(world)) {
    if (Math.hypot(marker.x - world.player.x, marker.y - world.player.y) < 120) {
      return `Press F for ${marker.label}`;
    }
  }
  return '';
}

export function taxiAvailable(world) {
  return world.vehicles.some((car) => car.type === 'taxi' && car.alive);
}
