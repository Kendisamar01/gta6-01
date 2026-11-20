import { CAR_SPECS, MAP } from './config.js';
import { junctionAt, lanePoint, laneShift, signalGreen } from './city.js';
import { between, choose, limit, whole } from './random.js';
import { driveCar, newCar } from './vehicles.js';

const STREET_CARS = ['sedan', 'sedan', 'taxi', 'van', 'sports', 'truck'];

function headingFor(axis, direction) {
  if (axis === 'h') return direction > 0 ? 0 : Math.PI;
  return direction > 0 ? Math.PI / 2 : -Math.PI / 2;
}

function steerToward(target, current) {
  return ((target - current + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
}

export function spawnFlowCar(world, forcedAxis = null) {
  const axis = forcedAxis ?? (world.rng() < 0.5 ? 'h' : 'v');
  const direction = world.rng() < 0.5 ? 1 : -1;
  const lineCount = axis === 'h' ? MAP.rows : MAP.columns;
  const line = MAP.first + whole(world.rng, 0, lineCount - 1) * MAP.step;
  const farEdge = axis === 'h' ? MAP.width : MAP.seaLine;
  const along = between(world.rng, 80, farEdge - 80);
  const spot = lanePoint(axis, line, along, direction);
  const kind = choose(world.rng, STREET_CARS);
  const spec = CAR_SPECS[kind];
  const car = newCar(world, kind, spot.x, spot.y, headingFor(axis, direction), { type: 'flow' });
  car.velocity = spec.maxSpeed * between(world.rng, 0.35, 0.62);
  car.route = {
    axis, line, direction,
    cruise: spec.maxSpeed * between(world.rng, 0.5, 0.78),
    turnWait: between(world.rng, 1, 6),
  };
  return car;
}

export function keepTraffic(world) {
  const flowing = world.vehicles.filter((car) => car.alive && car.driver?.type === 'flow').length;
  for (let i = flowing; i < 22; i += 1) spawnFlowCar(world);
}

function signalFor(world, route, nextIndex, horizontal) {
  const fixed = horizontal
    ? Math.round((route.line - MAP.first) / MAP.step)
    : Math.round((route.line - MAP.first) / MAP.step);
  const vicinity = horizontal
    ? world.city.signals.filter((light) => light.row === fixed && light.col === nextIndex)
    : world.city.signals.filter((light) => light.col === fixed && light.row === nextIndex);
  return vicinity[0] ?? null;
}

function flowOrders(world, car, dt) {
  const route = car.route;
  const horizontal = route.axis === 'h';
  const along = horizontal ? car.x : car.y;
  const across = horizontal ? car.y : car.x;
  const desiredAcross = route.line + laneShift(route.axis, route.direction);
  const laneCorrection = limit((desiredAcross - across) * 0.018, -0.4, 0.4);
  const base = headingFor(route.axis, route.direction);
  const adjusted = base + (horizontal ? route.direction * laneCorrection : -route.direction * laneCorrection);
  const wheel = limit(steerToward(adjusted, car.angle) * 2.1, -1, 1);

  route.turnWait -= dt;
  const crossingCount = horizontal ? MAP.columns : MAP.rows;
  const nextIndex = route.direction > 0
    ? Math.floor((along - MAP.first) / MAP.step) + 1
    : Math.ceil((along - MAP.first) / MAP.step) - 1;
  const nextAlong = MAP.first + nextIndex * MAP.step;
  const toCross = (nextAlong - along) * route.direction;

  if (toCross > 0 && toCross < 34 && route.turnWait <= 0 && world.rng() < dt * 0.7
    && nextIndex >= 0 && nextIndex < crossingCount) {
    route.axis = horizontal ? 'v' : 'h';
    route.line = nextAlong;
    route.direction = world.rng() < 0.5 ? 1 : -1;
    car.angle = headingFor(route.axis, route.direction);
    route.turnWait = between(world.rng, 2, 7);
  }

  let cruise = route.cruise;
  const signal = signalFor(world, route, limit(nextIndex, 0, crossingCount - 1), horizontal);
  if (signal && toCross > 0 && toCross < 88 && !signalGreen(signal, world.time)) cruise = 0;

  for (const other of world.vehicles) {
    if (other === car || !other.alive || !other.route || other.route.axis !== route.axis) continue;
    if (Math.abs(other.route.line - route.line) > 18 || other.route.direction !== route.direction) continue;
    const clearance = ((horizontal ? other.x - car.x : other.y - car.y) * route.direction);
    if (clearance > 0 && clearance < 76) cruise = Math.min(cruise, Math.max(0, (clearance - 34) * 2.2));
  }

  const gas = car.velocity < cruise - 6 ? 1 : car.velocity > cruise + 6 ? -1 : 0;
  return { gas, wheel, handbrake: false };
}

export function moveTraffic(world, dt) {
  world.flowClock -= dt;
  if (world.flowClock <= 0) {
    world.flowClock = 1.2;
    keepTraffic(world);
    if (world.vehicles.length > 76) {
      for (let i = world.vehicles.length - 1; i >= 0 && world.vehicles.length > 66; i -= 1) {
        const car = world.vehicles[i];
        if (car.route && car.driver?.type === 'flow'
          && Math.hypot(car.x - world.player.x, car.y - world.player.y) > 1400) {
          world.vehicles.splice(i, 1);
        }
      }
    }
  }

  for (const car of world.vehicles) {
    if (car.alive && car.driver?.type === 'flow' && car.route) {
      driveCar(world, car, flowOrders(world, car, dt), dt);
    }
  }
}

export function flowDriver(car) {
  return car.driver?.type === 'flow';
}

export function roadAhead(world, x, y) {
  return junctionAt(x, y);
}
