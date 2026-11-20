import { MAP, PALETTE } from './config.js';
import { clearOfBuildings, closestLane, laneShift, rayBlocked } from './city.js';
import { bearingDifference, limit } from './random.js';
import { spray } from './effects.js';
import { driveCar, hurtCar, newCar } from './vehicles.js';

const UNIT_TARGETS = [0, 2, 3, 5, 7, 9];

function pursuitSpot(world, x, y) {
  const bearing = world.rng() * Math.PI * 2;
  const distance = 480 + world.rng() * 190;
  const rawX = limit(x + Math.cos(bearing) * distance, 60, MAP.first + (MAP.columns - 1) * MAP.step - 60);
  const rawY = limit(y + Math.sin(bearing) * distance, 60, 2560);
  const lane = closestLane(rawX, rawY);
  const toward = Math.atan2(y - rawY, x - rawX);
  const direction = Math.cos(toward) * (lane.axis === 'h' ? 1 : -1) >= 0 ? 1 : -1;
  const snapped = lane.axis === 'h'
    ? { x: rawX, y: lane.line + laneShift('h', direction) }
    : { x: lane.line + laneShift('v', direction), y: rawY };
  const safe = clearOfBuildings(world.city, snapped.x, snapped.y, 18);
  return { x: safe.x, y: safe.y, angle: Math.atan2(y - safe.y, x - safe.x) };
}

export function deployUnit(world, mode = 'chase', spot = null) {
  const at = spot ?? pursuitSpot(world, world.player.x, world.player.y);
  const car = newCar(world, 'police', at.x, at.y, at.angle, { type: 'officer' });
  car.siren = true;
  car.route = {
    mode,
    targetX: world.player.x,
    targetY: world.player.y,
    fireClock: world.rng() * 1.2,
    arrest: 0,
    stuck: 0,
    retire: 0,
    blockAngle: at.angle,
  };
  return car;
}

export function deployBlock(world) {
  const player = world.player;
  const car = player.carId === null ? null : world.vehicles.find((unit) => unit.id === player.carId);
  const facing = car !== null && car !== undefined
    ? car.angle
    : Math.atan2(player.aimY - player.y, player.aimX - player.x);
  const aheadX = limit(player.x + Math.cos(facing) * 440, 80, 3440);
  const aheadY = limit(player.y + Math.sin(facing) * 440, 80, 2540);
  const lane = closestLane(aheadX, aheadY);
  const x = lane.axis === 'v' ? lane.line : aheadX;
  const y = lane.axis === 'h' ? lane.line : aheadY;
  const angle = lane.axis === 'h' ? 0 : Math.PI / 2;
  world.barriers.push({ x, y, angle, life: 34, hitGlow: 0 });

  for (const offset of [-30, 30]) {
    const px = x + Math.cos(angle + Math.PI / 2) * offset;
    const py = y + Math.sin(angle + Math.PI / 2) * offset;
    const safe = clearOfBuildings(world.city, px, py, 18);
    const unit = deployUnit(world, 'block', { x: safe.x, y: safe.y, angle });
    unit.route.targetX = safe.x;
    unit.route.targetY = safe.y;
    unit.route.blockAngle = angle;
  }
  world.notify('Roadblock ahead');
}

function policeOrders(world, car, dt) {
  const route = car.route;
  route.fireClock -= dt;
  if (route.mode === 'block') {
    const dx = route.targetX - car.x;
    const dy = route.targetY - car.y;
    const distance = Math.hypot(dx, dy);
    return {
      gas: distance < 18 ? 0 : car.velocity > 0 ? -1 : 1,
      wheel: limit(bearingDifference(Math.atan2(dy, dx), car.angle) * 1.8, -1, 1),
      handbrake: false,
    };
  }

  const target = world.player.carId === null
    ? world.player
    : world.vehicles.find((unit) => unit.id === world.player.carId) ?? world.player;
  const dx = target.x - car.x;
  const dy = target.y - car.y;
  const distance = Math.hypot(dx, dy);
  const delta = bearingDifference(Math.atan2(dy, dx), car.angle);
  if (distance < 46 && world.player.carId === null) {
    return { gas: -1, wheel: limit(delta * 2, -1, 1), handbrake: false };
  }
  return {
    gas: 1,
    wheel: limit(delta * 2.2, -1, 1),
    handbrake: Math.abs(delta) > 1.6 && Math.abs(car.velocity) > 165,
  };
}

function moveBarriers(world, dt) {
  for (let i = world.barriers.length - 1; i >= 0; i -= 1) {
    const barrier = world.barriers[i];
    barrier.life -= dt;
    barrier.hitGlow = Math.max(0, barrier.hitGlow - dt * 3);
    if (barrier.life <= 0) {
      world.barriers.splice(i, 1);
      continue;
    }
    for (const car of world.vehicles) {
      if (!car.alive || car.driver?.type !== 'player') continue;
      if (Math.hypot(car.x - barrier.x, car.y - barrier.y) >= 30 || Math.abs(car.velocity) <= 32) continue;
      hurtCar(world, car, 16, 'block');
      car.velocity *= 0.45;
      barrier.hitGlow = 1;
      spray(world, 'spark', car.x, car.y, 5, { scatter: 1.8, color: PALETTE.amber, size: 2.6 });
    }
  }
}

function shootAt(world, car, target, route) {
  if (world.wanted.stars < 2 || route.fireClock > 0) return;
  const distance = Math.hypot(target.x - car.x, target.y - car.y);
  if (distance > 400 || rayBlocked(world.city, car.x, car.y, target.x, target.y)) return;

  route.fireClock = 1.1 + world.rng() * 0.6;
  const angle = Math.atan2(target.y - car.y, target.x - car.x) + (world.rng() - 0.5) * 0.14;
  const muzzleX = car.x + Math.cos(angle) * 18;
  const muzzleY = car.y + Math.sin(angle) * 18;
  world.shoot({
    x: muzzleX, y: muzzleY,
    vx: Math.cos(angle) * 480, vy: Math.sin(angle) * 480,
    owner: 'police', damage: 8, life: 1.1,
  });
  spray(world, 'muzzle', muzzleX, muzzleY, 2, {
    scatter: 0.4, angle, color: PALETTE.amber, size: 3, life: 0.1,
  });
  world.sound('gunshot', 0.28);
}

export function movePolice(world, dt) {
  const stars = world.wanted.stars;
  if (stars === 0) {
    for (const car of world.vehicles) {
      if (car.driver?.type === 'officer' && car.route) {
        car.route.retire = Math.min(3, car.route.retire || 3);
      }
    }
  } else {
    let units = 0;
    for (const car of world.vehicles) {
      if (car.alive && car.driver?.type === 'officer') units += 1;
    }
    const missing = UNIT_TARGETS[limit(stars, 0, 5)] - units;
    for (let i = 0; i < missing; i += 1) deployUnit(world);
    world.blockClock -= dt;
    const permitted = stars >= 3 && world.barriers.length < 1 + Math.floor((stars - 3) / 2);
    if (permitted && world.blockClock <= 0) {
      world.blockClock = 16;
      deployBlock(world);
    }
  }

  moveBarriers(world, dt);

  const roster = world.vehicles.slice();
  for (const car of roster) {
    if (!car.alive || car.driver?.type !== 'officer' || !car.route) continue;
    const route = car.route;

    if (route.retire > 0) {
      route.retire -= dt;
      if (route.retire <= 0) {
        const index = world.vehicles.indexOf(car);
        if (index !== -1) world.vehicles.splice(index, 1);
        continue;
      }
    }

    driveCar(world, car, policeOrders(world, car, dt), dt);

    route.stuck = Math.abs(car.velocity) < 12 && route.mode === 'chase' ? route.stuck + dt : 0;
    if (route.stuck > 3.5) {
      const at = pursuitSpot(world, world.player.x, world.player.y);
      car.x = at.x;
      car.y = at.y;
      car.angle = at.angle;
      car.velocity = 80;
      route.stuck = 0;
    }

    const target = world.player.carId === null
      ? world.player
      : world.vehicles.find((unit) => unit.id === world.player.carId);
    if (!target) continue;
    shootAt(world, car, target, route);

    if (stars > 0 && world.player.carId === null
      && Math.hypot(target.x - car.x, target.y - car.y) < 44) {
      route.arrest += dt;
      if (route.arrest > 1.25) world.arrestPlayer();
    } else route.arrest = 0;
  }
}

export function recallUnits(world) {
  for (const car of world.vehicles) {
    if (car.driver?.type === 'officer' && car.route) car.route.retire = 1.5;
  }
}
