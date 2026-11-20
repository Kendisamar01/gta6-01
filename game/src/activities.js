import { MAP } from './config.js';
import { lanePoint, shopByKind } from './city.js';
import { carById } from './vehicles.js';
import { clearSquads, makeSquad } from './peds.js';
import { armPlayer } from './combat.js';

export function makeSide() {
  return {
    kind: null,
    active: false,
    phase: '',
    timer: 0,
    progress: 0,
    target: 0,
    drops: [],
    pin: null,
    passenger: null,
    destination: null,
  };
}

export function sideMarkers(world) {
  const markers = [];
  const stand = shopByKind(world.city, 'taxi');
  const range = shopByKind(world.city, 'rampage');
  const depot = shopByKind(world.city, 'delivery');
  if (stand) markers.push({ ...stand, kind: 'taxi', label: 'Taxi fares' });
  if (range) markers.push({ ...range, kind: 'rampage', label: 'Rampage' });
  if (depot) markers.push({ ...depot, kind: 'delivery', label: 'Delivery run' });
  return markers;
}

function roadSpot(axis, line, along, direction = 1) {
  return lanePoint(axis, MAP.first + line * MAP.step, along, direction);
}

function drivenCar(world) {
  return world.player.carId === null ? null : carById(world, world.player.carId);
}

function startTaxi(world) {
  const car = drivenCar(world);
  if (car === null || car.kind !== 'taxi') {
    world.notify('Steal a Sunfare Cab first');
    return;
  }
  const job = world.activity;
  job.kind = 'taxi';
  job.active = true;
  job.phase = 'pickup';
  job.timer = 95;
  job.progress = 0;
  job.passenger = roadSpot('h', 6, 880, 1);
  job.pin = { ...job.passenger, radius: 60, label: 'Fare' };
  world.notify('Taxi fare — pick up the passenger');
  world.sound('mission');
}

function startRampage(world) {
  const job = world.activity;
  job.kind = 'rampage';
  job.active = true;
  job.phase = 'shoot';
  job.timer = 62;
  job.progress = 0;
  job.target = 8;
  clearSquads(world);
  makeSquad(world, 720, 920, 10);
  armPlayer(world);
  job.pin = { x: 720, y: 920, radius: 180, label: 'Targets' };
  world.notify('Rampage — 8 targets in 60 seconds');
  world.sound('mission');
}

function startDelivery(world) {
  const job = world.activity;
  job.kind = 'delivery';
  job.active = true;
  job.phase = 'drive';
  job.timer = 112;
  job.progress = 0;
  job.target = 8;
  job.drops = [
    roadSpot('v', 3, 640),
    roadSpot('h', 2, 1380),
    roadSpot('v', 10, 880),
    roadSpot('h', 8, 2380),
    roadSpot('v', 12, 1780),
    roadSpot('h', 4, 3020),
    roadSpot('v', 6, 2140),
    roadSpot('h', 10, 1640),
  ];
  job.pin = { ...job.drops[0], radius: 70, label: 'Drop 1' };
  world.notify('Delivery run — 8 drops');
  world.sound('mission');
}

export function startSide(world, kind) {
  if (kind === 'taxi') startTaxi(world);
  else if (kind === 'rampage') startRampage(world);
  else if (kind === 'delivery') startDelivery(world);
}

function finishSide(world, money) {
  const job = world.activity;
  world.player.money += money;
  world.player.respect += 4;
  world.notify(`Side job complete — $${money}`);
  world.sound('success');
  job.active = false;
  job.kind = null;
  job.pin = null;
  job.passenger = null;
  job.destination = null;
  job.drops = [];
  clearSquads(world);
}

function quitSide(world, reason) {
  const job = world.activity;
  job.active = false;
  job.kind = null;
  job.pin = null;
  clearSquads(world);
  world.notify(`Side job failed — ${reason}`);
  world.sound('fail');
}

function stepTaxi(world, car) {
  const job = world.activity;
  if (car === null || car.kind !== 'taxi') {
    quitSide(world, 'You left the cab');
    return;
  }
  if (job.phase === 'pickup') {
    if (Math.hypot(job.passenger.x - world.player.x, job.passenger.y - world.player.y) < 60
      && Math.abs(car.velocity) < 110) {
      job.phase = 'dropoff';
      job.timer = 62;
      job.destination = roadSpot('v', 14, 900 + world.rng() * 1000);
      job.pin = { ...job.destination, radius: 70, label: 'Destination' };
      world.notify('Passenger aboard — drive to the drop-off');
    }
    return;
  }
  if (Math.hypot(job.destination.x - world.player.x, job.destination.y - world.player.y) < 72
    && Math.abs(car.velocity) < 130) finishSide(world, 240);
}

function stepDelivery(world, car) {
  const job = world.activity;
  if (car === null) {
    quitSide(world, 'You left the vehicle');
    return;
  }
  const point = job.drops[job.progress];
  if (!point) {
    finishSide(world, 380);
    return;
  }
  if (Math.hypot(point.x - world.player.x, point.y - world.player.y) > 74) return;
  job.progress += 1;
  const next = job.drops[job.progress];
  job.pin = next ? { ...next, radius: 70, label: `Drop ${job.progress + 1}` } : null;
  world.sound('checkpoint');
}

export function moveSide(world, dt, controls) {
  const job = world.activity;
  if (!job.active) {
    if (!controls.leave) return;
    for (const marker of sideMarkers(world)) {
      if (Math.hypot(marker.x - world.player.x, marker.y - world.player.y) > 105) continue;
      startSide(world, marker.kind);
      return;
    }
    return;
  }

  job.timer -= dt;
  if (job.timer <= 0) {
    quitSide(world, 'Time ran out');
    return;
  }
  const car = drivenCar(world);
  if (job.kind === 'taxi') stepTaxi(world, car);
  else if (job.kind === 'delivery') stepDelivery(world, car);
  else if (job.progress >= job.target) finishSide(world, 560);
}

export function sideKill(world, person) {
  const job = world.activity;
  if (!job.active || job.kind !== 'rampage' || person.type !== 'enemy') return;
  job.progress += 1;
  world.sound('hit');
}

export function sideObjective(world) {
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

export function sideHint(world) {
  if (world.activity.active) return '';
  for (const marker of sideMarkers(world)) {
    if (Math.hypot(marker.x - world.player.x, marker.y - world.player.y) < 120) {
      return `Press F for ${marker.label}`;
    }
  }
  return '';
}
