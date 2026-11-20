import { COLORS, GRID } from './config.js';
import { laneOffset, lineBlocked, nearestRoad, resolveCircle } from './city.js';
import { clamp } from './random.js';
import { emit } from './effects.js';
import { spawnVehicle, updateVehicle, damageVehicle, vehicleSpec } from './vehicles.js';

const RESPONSE = [0, 2, 3, 5, 7, 9];

function angleDelta(target, current) {
  return ((target - current + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
}

function countUnits(world) {
  let total = 0;
  for (const car of world.vehicles) {
    if (car.alive && car.driver?.type === 'police') total += 1;
  }
  return total;
}

function pursuitSpawn(world, x, y) {
  const bearing = world.random() * Math.PI * 2;
  const distance = 480 + world.random() * 190;
  const rawX = clamp(x + Math.cos(bearing) * distance, 60, GRID.first + (GRID.columns - 1) * GRID.step - 60);
  const rawY = clamp(y + Math.sin(bearing) * distance, 60, 2560);
  const road = nearestRoad(rawX, rawY);
  const toward = Math.atan2(y - rawY, x - rawX);
  const direction = Math.cos(toward) * (road.axis === 'h' ? 1 : -1) >= 0 ? 1 : -1;
  const snapped = road.axis === 'h'
    ? { x: rawX, y: road.line + laneOffset('h', direction) }
    : { x: road.line + laneOffset('v', direction), y: rawY };
  const safe = resolveCircle(world.city, snapped.x, snapped.y, 18);
  return { x: safe.x, y: safe.y, angle: Math.atan2(y - safe.y, x - safe.x) };
}

export function spawnPoliceUnit(world, mode = 'pursue', point = null) {
  const at = point ?? pursuitSpawn(world, world.player.x, world.player.y);
  const car = spawnVehicle(world, 'police', at.x, at.y, at.angle, { type: 'police' });
  car.siren = true;
  car.ai = {
    mode,
    targetX: world.player.x,
    targetY: world.player.y,
    shootCooldown: world.random() * 1.2,
    arrest: 0,
    stuck: 0,
    despawn: 0,
    blockAngle: at.angle,
  };
  return car;
}

export function spawnRoadblock(world) {
  const player = world.player;
  const inCar = player.inVehicle !== null
    ? world.vehicles.find((car) => car.id === player.inVehicle)
    : null;
  const heading = inCar != null ? inCar.angle : Math.atan2(player.aimY - player.y, player.aimX - player.x);
  const aheadX = clamp(player.x + Math.cos(heading) * 440, 80, 3440);
  const aheadY = clamp(player.y + Math.sin(heading) * 440, 80, 2540);
  const road = nearestRoad(aheadX, aheadY);
  const x = road.axis === 'v' ? road.line : aheadX;
  const y = road.axis === 'h' ? road.line : aheadY;
  const angle = road.axis === 'h' ? 0 : Math.PI / 2;
  world.roadblocks.push({ x, y, angle, life: 34, flash: 0 });

  for (const offset of [-30, 30]) {
    const px = x + Math.cos(angle + Math.PI / 2) * offset;
    const py = y + Math.sin(angle + Math.PI / 2) * offset;
    const safe = resolveCircle(world.city, px, py, 18);
    const unit = spawnPoliceUnit(world, 'block', { x: safe.x, y: safe.y, angle });
    unit.ai.targetX = safe.x;
    unit.ai.targetY = safe.y;
    unit.ai.blockAngle = angle;
  }
  world.toast('Roadblock ahead');
}

function policeControls(world, car, dt) {
  const ai = car.ai;
  ai.shootCooldown -= dt;
  if (ai.mode === 'block') {
    const dx = ai.targetX - car.x;
    const dy = ai.targetY - car.y;
    const target = Math.atan2(dy, dx);
    const distance = Math.hypot(dx, dy);
    return {
      throttle: distance < 18 ? 0 : car.speed > 0 ? -1 : 1,
      steer: clamp(angleDelta(target, car.angle) * 1.8, -1, 1),
      handbrake: false,
    };
  }

  const target = world.player.inVehicle !== null
    ? world.vehicles.find((car) => car.id === world.player.inVehicle) ?? world.player
    : world.player;
  const dx = target.x - car.x;
  const dy = target.y - car.y;
  const distance = Math.hypot(dx, dy);
  const delta = angleDelta(Math.atan2(dy, dx), car.angle);
  if (distance < 46 && world.player.inVehicle === null) {
    return { throttle: -1, steer: clamp(delta * 2, -1, 1), handbrake: false };
  }
  return {
    throttle: 1,
    steer: clamp(delta * 2.2, -1, 1),
    handbrake: Math.abs(delta) > 1.6 && Math.abs(car.speed) > 165,
  };
}

function updateRoadblocks(world, dt) {
  for (let i = world.roadblocks.length - 1; i >= 0; i -= 1) {
    const block = world.roadblocks[i];
    block.life -= dt;
    block.flash = Math.max(0, block.flash - dt * 3);
    if (block.life <= 0) {
      world.roadblocks.splice(i, 1);
      continue;
    }
    for (const car of world.vehicles) {
      if (!car.alive || car.driver?.type !== 'player') continue;
      if (Math.hypot(car.x - block.x, car.y - block.y) >= 30 || Math.abs(car.speed) <= 32) continue;
      damageVehicle(world, car, 16, 'block');
      car.speed *= 0.45;
      block.flash = 1;
      emit(world, 'spark', car.x, car.y, 5, { spread: 1.8, color: COLORS.gold, size: 2.6 });
    }
  }
}

function fireAtTarget(world, car, target, ai) {
  if (world.wanted.level < 2 || ai.shootCooldown > 0) return;
  const distance = Math.hypot(target.x - car.x, target.y - car.y);
  if (distance > 400 || lineBlocked(world.city, car.x, car.y, target.x, target.y)) return;

  ai.shootCooldown = 1.1 + world.random() * 0.6;
  const angle = Math.atan2(target.y - car.y, target.x - car.x) + (world.random() - 0.5) * 0.14;
  const muzzleX = car.x + Math.cos(angle) * 18;
  const muzzleY = car.y + Math.sin(angle) * 18;
  world.fireBullet({
    x: muzzleX,
    y: muzzleY,
    vx: Math.cos(angle) * 480,
    vy: Math.sin(angle) * 480,
    owner: 'police',
    damage: 8,
    life: 1.1,
  });
  emit(world, 'muzzle', muzzleX, muzzleY, 2, {
    spread: 0.4, angle, color: COLORS.gold, size: 3, life: 0.1,
  });
  world.sfx('gunshot', 0.28);
}

export function updatePolice(world, dt) {
  const level = world.wanted.level;
  if (level === 0) {
    for (const car of world.vehicles) {
      if (car.driver?.type === 'police' && car.ai) car.ai.despawn = Math.min(3, car.ai.despawn || 3);
    }
  } else {
    const missing = RESPONSE[clamp(level, 0, 5)] - countUnits(world);
    for (let i = 0; i < missing; i += 1) spawnPoliceUnit(world);
    world.roadblockTimer -= dt;
    const allowed = level >= 3 && world.roadblocks.length < 1 + Math.floor((level - 3) / 2);
    if (allowed && world.roadblockTimer <= 0) {
      world.roadblockTimer = 16;
      spawnRoadblock(world);
    }
  }

  updateRoadblocks(world, dt);

  const units = world.vehicles.slice();
  for (const car of units) {
    if (!car.alive || car.driver?.type !== 'police' || !car.ai) continue;
    const ai = car.ai;

    if (ai.despawn > 0) {
      ai.despawn -= dt;
      if (ai.despawn <= 0) {
        const index = world.vehicles.indexOf(car);
        if (index !== -1) world.vehicles.splice(index, 1);
        continue;
      }
    }

    updateVehicle(world, car, policeControls(world, car, dt), dt);

    ai.stuck = Math.abs(car.speed) < 12 && ai.mode === 'pursue' ? ai.stuck + dt : 0;
    if (ai.stuck > 3.5) {
      const at = pursuitSpawn(world, world.player.x, world.player.y);
      car.x = at.x;
      car.y = at.y;
      car.angle = at.angle;
      car.speed = 80;
      ai.stuck = 0;
    }

    const target = world.player.inVehicle !== null
      ? world.vehicles.find((car) => car.id === world.player.inVehicle)
      : world.player;
    if (target === undefined || target === null) continue;
    fireAtTarget(world, car, target, ai);

    if (level > 0 && world.player.inVehicle === null
      && Math.hypot(target.x - car.x, target.y - car.y) < 44) {
      ai.arrest += dt;
      if (ai.arrest > 1.25) world.bustPlayer();
    } else ai.arrest = 0;
  }
}

export function clearPoliceUnits(world) {
  for (const car of world.vehicles) {
    if (car.driver?.type === 'police' && car.ai) car.ai.despawn = 1.5;
  }
}

export function policeSpec(car) {
  return vehicleSpec(car);
}
