import { CITY } from './config.js';
import { hashCell } from './random.js';
import { trafficLightPhase } from './city-render.js';

const SPEEDS = { sedan: 150, taxi: 135, van: 125, sports: 215, truck: 105, cruiser: 180 };

function angleDelta(target, current) {
  let delta = (target - current) % (Math.PI * 2);
  if (delta > Math.PI) delta -= Math.PI * 2;
  if (delta < -Math.PI) delta += Math.PI * 2;
  return delta;
}

function clamp(value, low, high) {
  return value < low ? low : value > high ? high : value;
}

export function createTraffic(world) {
  const state = world.state;
  if (!Array.isArray(state.traffic)) state.traffic = [];
  const routes = state.traffic;

  function system(name) {
    return state.systems ? state.systems[name] : null;
  }

  function orientation(route) {
    if (route.axis === 'x') return route.dir > 0 ? 0 : Math.PI;
    return route.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
  }

  function laneFor(line, dir) {
    return line * CITY.cell + CITY.road * (dir > 0 ? 0.28 : 0.72);
  }

  function spawnAt(column, row, axis, dir, type) {
    const manager = system('vehicles');
    if (!manager) return null;
    const line = axis === 'x' ? row : column;
    const lane = laneFor(line, dir);
    const along = column * CITY.cell + (dir > 0 ? 10 : CITY.cell - 10);
    const x = axis === 'x' ? along : lane;
    const y = axis === 'x' ? lane : row * CITY.cell + (dir > 0 ? 10 : CITY.cell - 10);
    const vehicle = manager.spawn(type, x, y, orientation({ axis, dir }), { driver: 'ai' });
    const route = { vehicle, axis, dir, line, column, row, stop: false, think: 0 };
    vehicle.aiControl = { throttle: 0.7, steer: 0 };
    vehicle.aiRoute = route;
    routes.push(route);
    return route;
  }

  function retire(route) {
    const index = routes.indexOf(route);
    if (index >= 0) routes.splice(index, 1);
    const manager = system('vehicles');
    if (manager) manager.remove(route.vehicle);
  }

  function spawnNearPlayer() {
    const manager = system('vehicles');
    if (!manager) return;
    const player = state.player;
    const size = CITY.cell;
    const centerColumn = Math.floor(player.x / size);
    const centerRow = Math.floor(player.y / size);
    for (let attempt = 0; attempt < 16 && routes.length < 16; attempt += 1) {
      const seed = hashCell(state.seed, centerColumn + attempt * 7, centerRow - attempt * 3, 233);
      const angle = (seed % 360) * Math.PI / 180;
      const column = centerColumn + Math.round(Math.cos(angle) * 6);
      const row = centerRow + Math.round(Math.sin(angle) * 6);
      if (column < 2 || row < 2 || column > CITY.grid - 3 || row > CITY.grid - 3) continue;
      const axis = seed % 2 === 0 ? 'x' : 'y';
      const dir = seed % 4 < 2 ? 1 : -1;
      const type = ['sedan', 'sedan', 'taxi', 'van', 'sports', 'truck'][(seed >>> 6) % 6];
      const x = axis === 'x' ? column * size : laneFor(column, dir);
      const y = axis === 'x' ? laneFor(row, dir) : row * size;
      if (manager.nearest(x, y, 60)) continue;
      spawnAt(column, row, axis, dir, type);
    }
  }

  function maybeTurn(route, cell) {
    const hash = hashCell(state.seed, route.column, route.row, 91);
    if (hash % 7 > 1) return;
    const axis = route.axis;
    const dir = route.dir;
    const nextLine = axis === 'x' ? route.row : route.column;
    route.axis = axis === 'x' ? 'y' : 'x';
    route.dir = ((hash >>> 4) % 2 === 0 ? 1 : -1) * (dir > 0 ? 1 : -1);
    route.line = nextLine;
    const lane = laneFor(nextLine, route.dir);
    if (axis === 'x') {
      route.vehicle.x = lane;
      route.vehicle.y = route.row * CITY.cell + CITY.road / 2;
    } else {
      route.vehicle.x = route.column * CITY.cell + CITY.road / 2;
      route.vehicle.y = lane;
    }
    route.vehicle.angle = orientation(route);
    if (cell && cell.terrain === 'water') retire(route);
  }

  function step(dt) {
    const player = state.player;
    for (let index = routes.length - 1; index >= 0; index -= 1) {
      const route = routes[index];
      const vehicle = route.vehicle;
      if (!vehicle || vehicle.wrecked || Math.hypot(vehicle.x - player.x, vehicle.y - player.y) > 2300) {
        retire(route);
        continue;
      }
      const cellColumn = Math.floor(vehicle.x / CITY.cell);
      const cellRow = Math.floor(vehicle.y / CITY.cell);
      route.column = cellColumn;
      route.row = cellRow;
      const targetAngle = orientation(route);
      const steer = clamp(angleDelta(targetAngle, vehicle.angle) * 2.4, -1, 1);
      const desired = SPEEDS[vehicle.type] || 150;
      let throttle = 0.75;
      const localX = vehicle.x - cellColumn * CITY.cell;
      const localY = vehicle.y - cellRow * CITY.cell;
      const along = route.axis === 'x' ? (route.dir > 0 ? localX : CITY.cell - localX) : (route.dir > 0 ? localY : CITY.cell - localY);
      const light = trafficLightPhase(cellColumn, cellRow, state.elapsed);
      if (light === 'stop' && along < 78 && along > CITY.road) {
        route.stop = true;
      } else if (light === 'go' && along < CITY.road + 4) {
        route.stop = false;
      }
      for (let otherIndex = 0; otherIndex < routes.length; otherIndex += 1) {
        const other = routes[otherIndex];
        if (other === route || other.axis !== route.axis || other.dir !== route.dir || Math.abs(other.line - route.line) > 18) continue;
        const delta = route.axis === 'x'
          ? (other.vehicle.x - vehicle.x) * route.dir
          : (other.vehicle.y - vehicle.y) * route.dir;
        if (delta > 4 && delta < 74) throttle = Math.min(throttle, -0.55);
      }
      const playerAhead = route.axis === 'x'
        ? (player.x - vehicle.x) * route.dir
        : (player.y - vehicle.y) * route.dir;
      if (playerAhead > 0 && playerAhead < 44 && !player.inVehicle) throttle = Math.min(throttle, -0.4);
      vehicle.aiControl.throttle = route.stop && along > CITY.road + 8 ? -0.8 : throttle;
      vehicle.aiControl.steer = Math.abs(vehicle.speed) > desired ? 0 : steer;
      if (along > CITY.cell - 8 && route.think <= 0) {
        route.think = 1.2;
        maybeTurn(route, null);
      }
      route.think -= dt;
      if (vehicle.health < 18 && !vehicle.wrecked && route.think < -3) retire(route);
    }
    if (routes.length < 12) spawnNearPlayer();
  }

  function reset() {
    while (routes.length) retire(routes[0]);
    spawnNearPlayer();
  }

  spawnNearPlayer();
  return { routes, spawnAt, retire, step, reset, orientation };
}

let current = null;

export function install(context) {
  current = createTraffic(context.world);
  context.systems.traffic = current;
}
