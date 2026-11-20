import { FIELD } from './config.js';
import { between, pick } from './random.js';
import { angleDelta, clamp, distance } from './util.js';

const LANE = 0.26;
const TRAFFIC_TYPES = ['sedan', 'sedan', 'taxi', 'van', 'sport', 'truck'];

export function createTrafficSystem(api) {
  const { state, rng } = api;
  const city = state.city;
  const lights = [];

  function buildLights() {
    lights.length = 0;
    for (let row = 1; row < city.rows - 1; row += 2) {
      for (let col = 1; col < city.cols; col += 2) {
        lights.push({ x: col * city.cell, y: row * city.cell, phase: (row + col) % 2 });
      }
    }
  }

  function greenAxis(light, time) {
    return Math.floor(time / 5 + light.phase) % 2 === 0 ? 'v' : 'h';
  }

  function targetFor(vehicle, axis, dir) {
    const cell = city.cell;
    if (axis === 'v') {
      const centerX = Math.round(vehicle.x / cell) * cell;
      const nextY = dir > 0
        ? (Math.floor(vehicle.y / cell) + 1) * cell
        : (Math.ceil(vehicle.y / cell) - 1) * cell;
      if (nextY < cell * 0.5 || nextY > city.shoreY - cell * 0.3) return null;
      return { x: centerX - dir * city.road * LANE, y: nextY };
    }
    const centerY = Math.round(vehicle.y / cell) * cell;
    const nextX = dir > 0
      ? (Math.floor(vehicle.x / cell) + 1) * cell
      : (Math.ceil(vehicle.x / cell) - 1) * cell;
    if (nextX < cell * 0.5 || nextX > city.width - cell * 0.3) return null;
    return { x: nextX, y: centerY + dir * city.road * LANE };
  }

  function assign(vehicle, axis, dir) {
    let chosenAxis = axis;
    let chosenDir = dir;
    let target = targetFor(vehicle, chosenAxis, chosenDir);
    if (!target) {
      chosenDir = -dir;
      target = targetFor(vehicle, chosenAxis, chosenDir);
    }
    if (!target) {
      chosenAxis = axis === 'v' ? 'h' : 'v';
      chosenDir = rng() < 0.5 ? 1 : -1;
      target = targetFor(vehicle, chosenAxis, chosenDir);
    }
    vehicle.route = { axis: chosenAxis, dir: chosenDir, target: target || { x: vehicle.x, y: vehicle.y } };
    vehicle.angle = chosenAxis === 'v'
      ? (chosenDir > 0 ? Math.PI / 2 : -Math.PI / 2)
      : (chosenDir > 0 ? 0 : Math.PI);
  }

  function spawnTraffic() {
    const vehicles = state.systems.vehicles;
    for (let index = 0; index < 22; index += 1) {
      const vertical = rng() < 0.5;
      const dir = rng() < 0.5 ? 1 : -1;
      const roadIndex = Math.floor(between(rng, 1, vertical ? city.cols - 1 : city.rows - 1));
      const along = between(rng, city.cell * 0.8, (vertical ? city.shoreY : city.width) - city.cell * 0.7);
      const center = roadIndex * city.cell;
      const x = vertical ? center - dir * city.road * LANE : along;
      const y = vertical ? along : center + dir * city.road * LANE;
      if (distance(x, y, state.player.x, state.player.y) < 220) continue;
      const type = pick(rng, TRAFFIC_TYPES);
      const car = vehicles.spawn(type, x, y);
      assign(car, vertical ? 'v' : 'h', dir);
      car.speed = between(rng, 80, 160);
    }
  }

  function reset() {
    buildLights();
    spawnTraffic();
  }

  function carAhead(vehicle) {
    const vehicles = state.systems.vehicles;
    const route = vehicle.route;
    let nearest = Infinity;
    for (const other of vehicles.list) {
      if (other === vehicle || other.dead || other.parked || !other.route) continue;
      if (other.route.axis !== route.axis || other.route.dir !== route.dir) continue;
      const dx = other.x - vehicle.x;
      const dy = other.y - vehicle.y;
      const forward = route.axis === 'v' ? dy * route.dir : dx * route.dir;
      const lateral = route.axis === 'v' ? Math.abs(dx) : Math.abs(dy);
      if (forward > 4 && forward < nearest && lateral < 24) nearest = forward;
    }
    return nearest;
  }

  function lightAhead(vehicle) {
    const route = vehicle.route;
    let found = null;
    let best = 100;
    for (const light of lights) {
      const gap = distance(vehicle.x, vehicle.y, light.x, light.y);
      if (gap < best) {
        best = gap;
        found = light;
      }
    }
    if (!found) return null;
    const alongRoute = route.axis === 'v'
      ? (found.y - vehicle.y) * route.dir
      : (found.x - vehicle.x) * route.dir;
    if (alongRoute < -12 || alongRoute > 92) return null;
    return found;
  }

  function updateRoute(vehicle) {
    const route = vehicle.route;
    if (distance(vehicle.x, vehicle.y, route.target.x, route.target.y) > 34) return;
    const junctionX = Math.round(vehicle.x / city.cell) * city.cell;
    const junctionY = Math.round(vehicle.y / city.cell) * city.cell;
    if (junctionX <= 0 || junctionY <= 0 || junctionY > city.shoreY || junctionX > city.width) {
      assign(vehicle, route.axis, -route.dir);
      return;
    }
    if (rng() < 0.32) {
      const axis = route.axis === 'v' ? 'h' : 'v';
      const dir = axis === 'v' ? (junctionX % (city.cell * 2) === 0 ? 1 : -1) : (junctionY % (city.cell * 2) === 0 ? 1 : -1);
      assign(vehicle, axis, rng() < 0.5 ? dir : -dir);
    } else {
      assign(vehicle, route.axis, route.dir);
    }
  }

  function drive(vehicle) {
    const route = vehicle.route;
    if (!route) return;
    updateRoute(vehicle);
    const target = route.target;
    const desired = Math.atan2(target.y - vehicle.y, target.x - vehicle.x);
    const delta = angleDelta(vehicle.angle, desired);
    let throttle = Math.abs(delta) > 1 ? 0.2 : 0.62;
    const gap = carAhead(vehicle);
    if (gap < 74) throttle = gap < 38 ? -0.5 : 0.05;
    const light = lightAhead(vehicle);
    if (light && greenAxis(light, state.elapsed) !== route.axis) throttle = -0.55;
    vehicle.aiInput = {
      throttle,
      steer: clamp(delta * 1.9, -1, 1),
      brake: false,
    };
  }

  function step() {
    const vehicles = state.systems.vehicles;
    for (const vehicle of vehicles.list) {
      if (vehicle.dead || vehicle.parked || vehicle.occupiedBy === 'player' || vehicle.police || vehicle.missionCar) continue;
      if (vehicle.route) drive(vehicle);
    }
  }

  function lightsNear(camera) {
    return lights.filter((light) => Math.abs(light.x - camera.x) < FIELD.width / 2 + 70
      && Math.abs(light.y - camera.y) < FIELD.height / 2 + 70);
  }

  return { lights, reset, step, greenAxis, lightsNear, assign };
}

export function draw(ctx, state) {
  const system = state.systems && state.systems.traffic;
  if (!system) return;
  const camera = state.camera.state;
  for (const light of system.lightsNear(camera)) {
    const green = system.greenAxis(light, state.elapsed);
    ctx.fillStyle = '#39424e';
    ctx.fillRect(light.x - cityRoadOffset(state.city), light.y - cityRoadOffset(state.city), 4, 18);
    ctx.fillRect(light.x + cityRoadOffset(state.city) - 4, light.y + cityRoadOffset(state.city), 4, 18);
    ctx.fillStyle = green === 'v' ? '#63dd7f' : '#e0574f';
    ctx.beginPath();
    ctx.arc(light.x - cityRoadOffset(state.city) + 2, light.y - cityRoadOffset(state.city) - 3, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = green === 'h' ? '#63dd7f' : '#e0574f';
    ctx.beginPath();
    ctx.arc(light.x + cityRoadOffset(state.city) - 2, light.y + cityRoadOffset(state.city) + 21, 4, 0, Math.PI * 2);
    ctx.fill();
  }
}

function cityRoadOffset(city) {
  return city.road * 0.5 + 8;
}
