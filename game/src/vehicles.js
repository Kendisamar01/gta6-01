import { VEHICLE_TYPES } from './config.js';
import { moveWithCollision } from './city.js';
import { notify } from './world.js';
import { addCrime } from './wanted.js';

function makeCar(world, type, x, y, angle, role) {
  const spec = VEHICLE_TYPES[type] || VEHICLE_TYPES.sedan;
  return {
    id: world.vehicles.length + 1,
    type,
    x,
    y,
    angle,
    vx: 0,
    vy: 0,
    speed: 0,
    steer: 0,
    damage: 0,
    color: role === 'police' ? '#eef2f4' : spec.color,
    horn: 0,
    smokeClock: world.random() * 4,
    driver: role,
    role,
    parked: role === 'parked',
    siren: role === 'police',
    sirenPhase: world.random() * 6.28,
    targetSpeed: 0,
    mission: false,
  };
}

export function spawnVehicle(world, type, x, y, angle, role) {
  return makeCar(world, type, x, y, angle, role);
}

export function populate(world) {
  const parked = world.city.parkedSpawns;
  const road = world.city.roadSpawns;
  for (let index = 0; index < parked.length && world.vehicles.length < 30; index += 2) {
    const spot = parked[index];
    world.vehicles.push(makeCar(world, spot.type, spot.x, spot.y, spot.angle, 'parked'));
  }
  for (let index = 0; index < road.length && world.vehicles.length < 64; index += 3) {
    const spot = road[index];
    world.vehicles.push(makeCar(world, spot.type, spot.x, spot.y, spot.angle, 'traffic'));
  }
}

function carRadius(car) {
  return (VEHICLE_TYPES[car.type] || VEHICLE_TYPES.sedan).width / 2 + 5;
}

function crash(world, car, strength, api) {
  if (strength < 18) return;
  car.damage = Math.min(100, car.damage + strength * 0.13);
  world.stats.crashes += 1;
  world.events.push({ type: 'crash', x: car.x, y: car.y, strength });
  if (car.driver === 'player') {
    api.kick(Math.min(0.4, strength / 400));
    addCrime(world, 'crash', 0.35);
  }
  if (car.damage >= 96) {
    world.events.push({ type: 'explosion', x: car.x, y: car.y, big: true });
    if (car.driver === 'player') {
      notify(world, 'Your ride cooked', 'warn');
      world.player.inVehicle = null;
    }
    car.damage = 100;
    car.dead = true;
  }
}

export function driveVehicle(world, car, throttle, steer, handbrake, dt, api) {
  const spec = VEHICLE_TYPES[car.type] || VEHICLE_TYPES.sedan;
  const forwardX = Math.cos(car.angle);
  const forwardY = Math.sin(car.angle);
  let forward = car.vx * forwardX + car.vy * forwardY;
  let lateralX = car.vx - forwardX * forward;
  let lateralY = car.vy - forwardY * forward;
  if (throttle > 0) forward += spec.accel * throttle * dt;
  else if (throttle < 0) forward -= (forward > 8 ? spec.brake : spec.accel * 0.55) * dt;
  if (handbrake) forward *= 1 - 2.1 * dt;
  forward *= 1 - (0.42 + Math.abs(forward) / (spec.top * 2.6)) * dt;
  forward = Math.max(-spec.top * 0.35, Math.min(spec.top, forward));
  const speedFactor = Math.min(1, Math.abs(forward) / 55);
  car.angle += steer * speedFactor * (handbrake ? 2.9 : 2.15) * dt * (forward < 0 ? -1 : 1);
  const grip = handbrake ? 0.55 : spec.grip;
  lateralX *= 1 - Math.min(1, grip * dt);
  lateralY *= 1 - Math.min(1, grip * dt);
  const nx = Math.cos(car.angle);
  const ny = Math.sin(car.angle);
  car.vx = nx * forward + lateralX;
  car.vy = ny * forward + lateralY;
  car.speed = forward;
  const beforeX = car.x;
  const beforeY = car.y;
  const radius = carRadius(car);
  moveWithCollision(world.city, car, car.vx * dt, car.vy * dt, radius);
  const movedX = car.x - beforeX;
  const movedY = car.y - beforeY;
  if (Math.abs(movedX) + Math.abs(movedY) < (Math.abs(car.vx) + Math.abs(car.vy)) * dt * 0.45) {
    crash(world, car, Math.abs(forward), api);
    car.vx *= -0.2;
    car.vy *= -0.2;
    car.speed *= -0.2;
  }
  for (const other of world.vehicles) {
    if (other === car || other.dead) continue;
    const dx = other.x - car.x;
    const dy = other.y - car.y;
    const distance = Math.hypot(dx, dy) || 1;
    const reach = carRadius(car) + carRadius(other) + 9;
    if (distance > reach) continue;
    const push = (reach - distance) / 2;
    car.x -= (dx / distance) * push;
    car.y -= (dy / distance) * push;
    other.x += (dx / distance) * push;
    other.y += (dy / distance) * push;
    const closing = Math.abs(car.speed - other.speed);
    if (closing > 30) {
      crash(world, car, closing, api);
      crash(world, other, closing * 0.7, api);
    }
  }
  car.smokeClock += dt;
  return car;
}

export function interact(world, api) {
  const player = world.player;
  if (player.inVehicle !== null) {
    const car = world.vehicles.find((item) => item.id === player.inVehicle);
    if (car) {
      const side = car.angle + Math.PI / 2;
      player.x = car.x + Math.cos(side) * 46;
      player.y = car.y + Math.sin(side) * 46;
      player.inVehicle = null;
      car.driver = car.role === 'police' ? 'police' : 'parked';
      notify(world, 'Left the vehicle');
      world.events.push({ type: 'exit', x: player.x, y: player.y });
    }
    return;
  }
  let nearest = null;
  let nearestDistance = 76;
  for (const car of world.vehicles) {
    if (car.dead) continue;
    const distance = Math.hypot(car.x - player.x, car.y - player.y);
    if (distance < nearestDistance) {
      nearest = car;
      nearestDistance = distance;
    }
  }
  if (!nearest) {
    notify(world, 'No vehicle nearby', 'warn');
    return;
  }
  if (nearest.driver === 'traffic' || nearest.driver === 'police') {
    world.peds.push({
      x: nearest.x + Math.cos(nearest.angle + Math.PI) * 50,
      y: nearest.y + Math.sin(nearest.angle + Math.PI) * 50,
      angle: nearest.angle,
      speed: 0,
      anim: 0,
      health: 55,
      flee: 6,
      moving: true,
      skin: Math.floor(world.random() * 6),
      dead: false,
    });
    addCrime(world, 'jack', 0.7);
    notify(world, 'Car jacked', 'warn');
  } else {
    notify(world, `Entered ${nearest.type}`);
  }
  nearest.driver = 'player';
  player.inVehicle = nearest.id;
  player.x = nearest.x;
  player.y = nearest.y;
  world.events.push({ type: 'enter', x: nearest.x, y: nearest.y });
}

export function key(code, world, api) {
  if (code === 'KeyE' || code === 'KeyF') interact(world, api);
  if (code === 'KeyH') {
    const id = world.player.inVehicle;
    const car = world.vehicles.find((item) => item.id === id);
    if (car) {
      car.horn = 0.4;
      world.events.push({ type: 'horn', x: car.x, y: car.y });
    }
  }
}

export function update(world, dt, controls, api) {
  for (let index = world.vehicles.length - 1; index >= 0; index -= 1) {
    const car = world.vehicles[index];
    if (car.horn > 0) car.horn = Math.max(0, car.horn - dt);
    if (car.dead) {
      world.vehicles.splice(index, 1);
      continue;
    }
    if (car.driver !== 'player') continue;
    const baseThrottle = controls.my < 0 ? 1 : controls.my > 0 ? -1 : 0;
    const throttle = baseThrottle === 0 ? 0 : baseThrottle * ((controls.run || false) ? 1.25 : 1);
    const steer = controls.mx || 0;
    driveVehicle(world, car, throttle, steer, controls.handbrake, dt, api);
    world.player.x = car.x;
    world.player.y = car.y;
    world.player.vx = car.vx;
    world.player.vy = car.vy;
    world.player.angle = car.angle;
  }
}

export function stageShot(name, api) {
  const world = api.world;
  if (name !== 'drive' && name !== 'chase' && name !== 'mission') return;
  world.vehicles.length = 0;
  const type = name === 'chase' ? 'sports' : name === 'mission' ? 'taxi' : 'sports';
  const car = makeCar(world, type, world.player.x, world.player.y, -0.12, 'player');
  car.speed = name === 'chase' ? 210 : 135;
  car.vx = Math.cos(car.angle) * car.speed;
  car.vy = Math.sin(car.angle) * car.speed;
  world.vehicles.push(car);
  world.player.inVehicle = car.id;
  for (let i = 0; i < 9; i += 1) {
    const spot = world.city.roadSpawns[(i * 4 + 3) % world.city.roadSpawns.length];
    world.vehicles.push(makeCar(world, spot.type, spot.x, spot.y, spot.angle, 'traffic'));
  }
}
