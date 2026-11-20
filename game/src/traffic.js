import { GRID, VEHICLE_TYPES, WORLD } from './config.js';
import { laneOffset, roadPosition, trafficLightGreen } from './city.js';
import { clamp, integer, pick, range } from './random.js';
import { spawnVehicle, updateVehicle, vehicleSpec } from './vehicles.js';

const CIVILIAN_TYPES = ['sedan', 'sedan', 'taxi', 'van', 'sports', 'truck'];

function heading(axis, direction) {
  if (axis === 'h') return direction > 0 ? 0 : Math.PI;
  return direction > 0 ? Math.PI / 2 : -Math.PI / 2;
}

function turnDifference(target, current) {
  return ((target - current + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
}

export function spawnTrafficCar(world, axis = null) {
  const chosenAxis = axis ?? (world.random() < 0.5 ? 'h' : 'v');
  const direction = world.random() < 0.5 ? 1 : -1;
  const lines = chosenAxis === 'h' ? GRID.rows : GRID.columns;
  const line = GRID.first + integer(world.random, 0, lines - 1) * GRID.step;
  const end = chosenAxis === 'h' ? WORLD.width : WORLD.waterY;
  const along = range(world.random, 80, end - 80);
  const point = roadPosition(chosenAxis, line, along, direction);
  const type = pick(world.random, CIVILIAN_TYPES);
  const spec = VEHICLE_TYPES[type];
  const car = spawnVehicle(world, type, point.x, point.y, heading(chosenAxis, direction), { type: 'traffic' });
  car.speed = spec.maxSpeed * range(world.random, 0.35, 0.62);
  car.ai = {
    axis: chosenAxis,
    line,
    direction,
    cruise: spec.maxSpeed * range(world.random, 0.5, 0.78),
    turnCooldown: range(world.random, 1, 6),
  };
  return car;
}

export function maintainTraffic(world) {
  let moving = 0;
  for (const car of world.vehicles) {
    if (car.alive && car.driver?.type === 'traffic') moving += 1;
  }
  for (let i = moving; i < 22; i += 1) spawnTrafficCar(world);
}

function signalAhead(world, car, nextIndex, horizontal) {
  const signals = world.city.signals;
  if (horizontal) {
    const row = Math.round((car.ai.line - GRID.first) / GRID.step);
    return signals.find((light) => light.col === nextIndex && light.row === row) ?? null;
  }
  const col = Math.round((car.ai.line - GRID.first) / GRID.step);
  return signals.find((light) => light.row === nextIndex && light.col === col) ?? null;
}

function trafficControls(world, car, dt) {
  const ai = car.ai;
  const horizontal = ai.axis === 'h';
  const along = horizontal ? car.x : car.y;
  const across = horizontal ? car.y : car.x;
  const lane = ai.line + laneOffset(ai.axis, ai.direction);
  const laneError = clamp((lane - across) * 0.018, -0.4, 0.4);
  const base = heading(ai.axis, ai.direction);
  const correction = horizontal ? ai.direction * laneError : -ai.direction * laneError;
  const steer = clamp(turnDifference(base + correction, car.angle) * 2.1, -1, 1);

  ai.turnCooldown -= dt;
  const crossCount = horizontal ? GRID.columns : GRID.rows;
  const nextIndex = ai.direction > 0
    ? Math.floor((along - GRID.first) / GRID.step) + 1
    : Math.ceil((along - GRID.first) / GRID.step) - 1;
  const nextAlong = GRID.first + nextIndex * GRID.step;
  const distanceToCross = (nextAlong - along) * ai.direction;

  if (distanceToCross > 0 && distanceToCross < 34 && ai.turnCooldown <= 0 && world.random() < dt * 0.7) {
    if (nextIndex >= 0 && nextIndex < crossCount) {
      ai.axis = horizontal ? 'v' : 'h';
      ai.line = nextAlong;
      ai.direction = world.random() < 0.5 ? 1 : -1;
      car.angle = heading(ai.axis, ai.direction);
      ai.turnCooldown = range(world.random, 2, 7);
    }
  }

  let cruise = ai.cruise;
  const signal = signalAhead(world, car, clamp(nextIndex, 0, crossCount - 1), horizontal);
  if (signal && distanceToCross > 0 && distanceToCross < 88 && !trafficLightGreen(signal, world.time)) {
    cruise = 0;
  }

  for (const other of world.vehicles) {
    if (other === car || !other.alive || !other.ai || other.ai.axis !== ai.axis) continue;
    if (Math.abs(other.ai.line - ai.line) > 18 || other.ai.direction !== ai.direction) continue;
    const gap = ((horizontal ? other.x - car.x : other.y - car.y) * ai.direction);
    if (gap > 0 && gap < 76) cruise = Math.min(cruise, Math.max(0, (gap - 34) * 2.2));
  }

  const throttle = car.speed < cruise - 6 ? 1 : car.speed > cruise + 6 ? -1 : 0;
  return { throttle, steer, handbrake: false, horn: false };
}

export function updateTraffic(world, dt) {
  world.trafficTimer -= dt;
  if (world.trafficTimer <= 0) {
    world.trafficTimer = 1.2;
    maintainTraffic(world);
    if (world.vehicles.length > 76) {
      for (let i = world.vehicles.length - 1; i >= 0 && world.vehicles.length > 66; i -= 1) {
        const car = world.vehicles[i];
        if (car.ai && car.driver?.type === 'traffic'
          && Math.hypot(car.x - world.player.x, car.y - world.player.y) > 1400) {
          world.vehicles.splice(i, 1);
        }
      }
    }
  }

  for (const car of world.vehicles) {
    if (car.alive && car.driver?.type === 'traffic' && car.ai) {
      updateVehicle(world, car, trafficControls(world, car, dt), dt);
    }
  }
}

export function convertTrafficToPlayer(world, car) {
  if (car.ai?.direction !== undefined && car.driver?.type === 'traffic') {
    world.spawnPed(
      car.x + Math.cos(car.angle + Math.PI / 2) * 25,
      car.y + Math.sin(car.angle + Math.PI / 2) * 25,
      'flee',
    );
  }
  car.driver = { type: 'player' };
  car.ai = null;
  car.siren = car.type === 'police';
}

export function isTrafficCar(car) {
  return car.driver?.type === 'traffic';
}

export function trafficRouteDistance(car) {
  return car.ai ? Math.abs(car.speed) : 0;
}

export { vehicleSpec };
