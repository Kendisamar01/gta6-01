import { spawnVehicle, driveVehicle } from './vehicles.js';
import { spawnPed } from './peds.js';
import { fireBullet } from './combat.js';
import { bustPlayer, notify } from './world.js';

function wrap(angle) {
  while (angle > Math.PI) angle -= Math.PI * 2;
  while (angle < -Math.PI) angle += Math.PI * 2;
  return angle;
}

function spawnPoint(world, player, ahead) {
  const spots = world.city.roadSpawns;
  let best = spots[0];
  let bestScore = -Infinity;
  for (let i = 0; i < 24; i += 1) {
    const spot = spots[Math.floor(world.random() * spots.length)];
    const dx = spot.x - player.x;
    const dy = spot.y - player.y;
    const distance = Math.hypot(dx, dy);
    if (distance < 260 || distance > 1250) continue;
    const dot = (dx * Math.cos(player.angle) + dy * Math.sin(player.angle)) * (ahead ? 1 : -1);
    const score = dot - Math.abs(distance - 620) * 0.25 + world.random() * 120;
    if (score > bestScore) {
      bestScore = score;
      best = spot;
    }
  }
  return best || spots[0];
}

function spawnCruiser(world, player, ahead) {
  const spot = spawnPoint(world, player, ahead);
  const car = spawnVehicle(world, 'cruiser', spot.x, spot.y, spot.angle, 'police');
  car.siren = true;
  world.events.push({ type: 'siren', x: car.x, y: car.y });
  return car;
}

function roadblock(world, player) {
  const angle = player.angle;
  const x = player.x + Math.cos(angle) * 580;
  const y = player.y + Math.sin(angle) * 580;
  const perpendicular = angle + Math.PI / 2;
  for (let i = -1; i <= 1; i += 1) {
    const car = spawnVehicle(world, 'cruiser', x + Math.cos(perpendicular) * i * 105,
      y + Math.sin(perpendicular) * i * 105, angle + Math.PI / 2, 'police');
    car.siren = true;
    car.speed = 0;
  }
  notify(world, 'Roadblock ahead', 'warn');
}

export function update(world, dt, api) {
  const player = world.player;
  const stars = world.wanted;
  const units = world.vehicles.filter((car) => car.role === 'police' && !car.dead);
  if (stars === 0) {
    for (const car of units) {
      if (Math.hypot(car.x - player.x, car.y - player.y) > 700 || car.damage > 85) car.dead = true;
    }
    for (const ped of world.peds) {
      if (ped.role === 'cop' && Math.hypot(ped.x - player.x, ped.y - player.y) > 900) ped.dead = true;
    }
    return;
  }

  const wantedUnits = Math.min(8, stars + 1);
  if (units.length < wantedUnits && Math.floor(world.elapsed * 2) % 3 === 0) {
    spawnCruiser(world, player, false);
    if (stars >= 3) spawnCruiser(world, player, true);
  }
  if (stars >= 3 && !world.roadblock && world.heat > 70) {
    roadblock(world, player);
    world.roadblock = true;
  }
  if (stars < 3) world.roadblock = false;
  if (stars >= 4) {
    const cops = world.peds.filter((ped) => ped.role === 'cop' && !ped.dead).length;
    if (cops < stars) {
      const side = player.angle + Math.PI / 2;
      spawnPed(world, player.x + Math.cos(side) * 260 + (world.random() - 0.5) * 80,
        player.y + Math.sin(side) * 260 + (world.random() - 0.5) * 80, 'cop');
    }
  }

  for (const car of world.vehicles) {
    if (car.dead || car.role !== 'police') continue;
    car.sirenPhase += dt * 12;
    const dx = player.x - car.x;
    const dy = player.y - car.y;
    const distance = Math.hypot(dx, dy) || 1;
    const desired = Math.atan2(dy, dx);
    const difference = wrap(desired - car.angle);
    const steer = Math.max(-1, Math.min(1, difference * 1.6));
    driveVehicle(world, car, car.speed < 40 ? 1 : 0.85, steer, Math.abs(difference) > 1.2 && car.speed > 110, dt, api);
    if (stars >= 3 && distance < 310 && Math.floor(world.elapsed * 2 + car.id) % 3 === 0) {
      const spread = (world.random() - 0.5) * 0.12;
      fireBullet(world, car.x + Math.cos(car.angle) * 34, car.y + Math.sin(car.angle) * 34, desired + spread,
        { owner: 'police', speed: 520, damage: 9, color: '#ffd27d' });
    }
    if (distance < 40 && Math.abs(player.vx) + Math.abs(player.vy) < 70) {
      bustPlayer(world);
      notify(world, 'Busted by the patrol', 'warn');
    }
  }
  for (const ped of world.peds) {
    if (ped.dead || ped.role !== 'cop') continue;
    const distance = Math.hypot(ped.x - player.x, ped.y - player.y);
    ped.angle = Math.atan2(player.y - ped.y, ped.x - player.x);
    ped.flee = 0;
    if (distance < 340 && Math.floor(world.elapsed * 1.6 + ped.x) % 2 === 0) {
      fireBullet(world, ped.x, ped.y, ped.angle + (world.random() - 0.5) * 0.1,
        { owner: 'police', speed: 440, damage: 8, color: '#ffd27d' });
    }
    if (distance > 120) {
      ped.x += Math.cos(ped.angle) * 55 * dt;
      ped.y += Math.sin(ped.angle) * 55 * dt;
    }
  }
}

export function stageShot(name, api) {
  if (name !== 'chase') return;
  const world = api.world;
  const player = world.player;
  world.vehicles = world.vehicles.filter((car) => car.role !== 'police');
  for (let i = 0; i < 5; i += 1) {
    const angle = player.angle + Math.PI + (i - 2) * 0.55;
    const distance = 190 + (i % 2) * 90;
    const car = spawnVehicle(world, 'cruiser', player.x + Math.cos(angle) * distance,
      player.y + Math.sin(angle) * distance, player.angle - 0.15, 'police');
    car.siren = true;
    car.speed = 170;
    car.vx = Math.cos(car.angle) * 170;
    car.vy = Math.sin(car.angle) * 170;
  }
  for (let i = 0; i < 3; i += 1) {
    spawnPed(world, player.x + (i - 1) * 150, player.y - 180, 'cop');
  }
}
