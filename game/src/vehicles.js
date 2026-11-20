import { COLORS, GRID, VEHICLE_TYPES, WORLD } from './config.js';
import { resolveCircle } from './city.js';
import { clamp, pick, range } from './random.js';
import { addFlash, addLight, addSkid, emit } from './effects.js';
import { addShake } from './camera.js';

const PAINTS = ['#d95349', '#e7b846', '#4a83bb', '#ece7d9', '#34424d', '#66a47c', '#9b6bb4', '#dc8245'];

export function spawnVehicle(world, type, x, y, angle = 0, driver = null) {
  const spec = VEHICLE_TYPES[type] ?? VEHICLE_TYPES.sedan;
  let paint;
  if (type === 'police') paint = '#e9edf2';
  else if (type === 'taxi') paint = '#f2c230';
  else paint = pick(world.random, PAINTS);
  const car = {
    id: world.nextId++,
    type,
    x,
    y,
    angle,
    speed: 0,
    slip: 0,
    hp: spec.hp,
    maxHp: spec.hp,
    driver,
    ai: null,
    parked: false,
    alive: true,
    color: paint,
    flash: 0,
    smokeTimer: 0,
    hornCooldown: 0,
    siren: false,
    sirenPhase: 0,
    crashCooldown: 0,
    lastDriverType: null,
  };
  world.vehicles.push(car);
  return car;
}

export function findVehicle(world, id) {
  return world.vehicles.find((car) => car.id === id) ?? null;
}

export function vehicleSpec(car) {
  return VEHICLE_TYPES[car.type] ?? VEHICLE_TYPES.sedan;
}

export function nearestVehicle(world, x, y, radius = 78) {
  let closest = null;
  let closestDistance = radius;
  for (const car of world.vehicles) {
    if (!car.alive) continue;
    const away = Math.hypot(car.x - x, car.y - y);
    if (away < closestDistance) {
      closest = car;
      closestDistance = away;
    }
  }
  return closest;
}

export function updateVehicle(world, car, controls, dt) {
  if (!car.alive) return;
  const spec = vehicleSpec(car);
  car.flash = Math.max(0, car.flash - dt * 4);
  car.hornCooldown = Math.max(0, car.hornCooldown - dt);
  car.crashCooldown = Math.max(0, car.crashCooldown - dt);
  car.sirenPhase += dt * 9;

  const gas = controls.throttle ?? 0;
  const wheel = controls.steer ?? 0;
  const handbrake = controls.handbrake ?? false;

  if (gas > 0) car.speed += spec.accel * gas * dt;
  else if (gas < 0) {
    if (car.speed > 4) car.speed -= spec.brake * dt;
    else car.speed -= spec.accel * 0.62 * dt;
  } else car.speed *= 1 - dt * (handbrake ? 1.5 : 0.55);

  car.speed *= 1 - dt * (0.16 + Math.abs(car.speed) * 0.0011);
  car.speed = clamp(car.speed, -spec.maxSpeed * 0.36, spec.maxSpeed);
  if (Math.abs(car.speed) < 0.6 && gas === 0) car.speed = 0;

  if (Math.abs(car.speed) > 4) {
    const authority = clamp(Math.abs(car.speed) / 62, 0, 1);
    car.angle += wheel * spec.turn * authority * Math.sign(car.speed) * dt;
  }

  const wantedSlip = -wheel * Math.abs(car.speed) * (handbrake ? 0.5 : 0.018);
  car.slip += (wantedSlip - car.slip) * Math.min(1, dt * (handbrake ? 2.1 : spec.grip));

  const cos = Math.cos(car.angle);
  const sin = Math.sin(car.angle);
  const motionX = cos * car.speed - sin * car.slip;
  const motionY = sin * car.speed + cos * car.slip;
  const next = resolveCircle(world.city, car.x + motionX * dt, car.y + motionY * dt, spec.width * 0.62);

  if (next.hit && Math.abs(car.speed) > 28 && car.crashCooldown === 0) {
    const force = Math.abs(car.speed);
    damageVehicle(world, car, force * 0.045, 'wall');
    car.speed *= -0.16;
    car.slip *= 0.4;
    car.crashCooldown = 0.25;
    emit(world, 'spark', car.x + cos * spec.length / 2, car.y + sin * spec.length / 2, 5, {
      spread: 1.3, color: COLORS.gold, size: 2.6,
    });
    if (car.driver?.type === 'player') addShake(world.camera, Math.min(12, force * 0.035));
  }

  car.x = next.x;
  car.y = next.y;
  if (car.y > 2590) car.speed *= 1 - dt * 1.5;

  if (handbrake && Math.abs(car.speed) > 90) {
    addSkid(world, car.x - cos * spec.length / 2, car.y - sin * spec.length / 2, car.angle, 0.7);
  }

  if (car.hp < car.maxHp * 0.55) {
    car.smokeTimer -= dt;
    if (car.smokeTimer <= 0) {
      const burning = car.hp < car.maxHp * 0.25;
      car.smokeTimer = burning ? 0.05 : 0.13;
      emit(world, burning ? 'fire' : 'smoke', car.x - cos * spec.length / 2, car.y - sin * spec.length / 2, 1, {
        spread: 0.7,
        size: burning ? 5 : 7,
        life: 0.9,
        color: burning ? '#ff8b3e' : '#6b6f70',
        vx: -cos * 24,
        vy: -sin * 24 - 12,
      });
    }
  }

  if (car.siren && Math.floor(car.sirenPhase) % 2 === 0) {
    addLight(world, car.x, car.y, 'rgba(90,140,255,0.8)', 70, 0.05);
  }

  if ((controls.horn ?? false) && car.hornCooldown === 0) {
    car.hornCooldown = 0.55;
    world.sfx('horn', spec.horn);
  }
}

export function resolveVehicleCollisions(world) {
  const cars = world.vehicles;
  for (let i = 0; i < cars.length; i += 1) {
    const first = cars[i];
    if (!first.alive) continue;
    for (let j = i + 1; j < cars.length; j += 1) {
      const second = cars[j];
      if (!second.alive) continue;
      const dx = second.x - first.x;
      const dy = second.y - first.y;
      const minimum = (vehicleSpec(first).width + vehicleSpec(second).width) * 0.62;
      const squared = dx * dx + dy * dy;
      if (squared >= minimum * minimum || squared < 0.001) continue;
      const away = Math.sqrt(squared);
      const nx = dx / away;
      const ny = dy / away;
      const overlap = minimum - away;
      const firstMass = vehicleSpec(first).mass;
      const secondMass = vehicleSpec(second).mass;
      const total = firstMass + secondMass;
      first.x -= nx * overlap * (secondMass / total);
      first.y -= ny * overlap * (secondMass / total);
      second.x += nx * overlap * (firstMass / total);
      second.y += ny * overlap * (firstMass / total);

      const closing = Math.abs(first.speed - second.speed) + Math.abs(first.slip - second.slip);
      if (closing <= 26 || first.crashCooldown > 0 || second.crashCooldown > 0) continue;
      first.crashCooldown = 0.25;
      second.crashCooldown = 0.25;
      damageVehicle(world, first, closing * 0.024, second.driver?.type === 'player' ? 'ram' : 'car');
      damageVehicle(world, second, closing * 0.024, first.driver?.type === 'player' ? 'ram' : 'car');
      emit(world, 'spark', (first.x + second.x) / 2, (first.y + second.y) / 2, 6, {
        spread: 1.6, color: COLORS.gold, size: 2.4,
      });
      if (first.driver?.type === 'player' || second.driver?.type === 'player') {
        addShake(world.camera, Math.min(10, closing * 0.025));
        if (closing > 95) world.reportCrime(12, 'Reckless collision');
      }
    }
  }
}

export function damageVehicle(world, car, amount, source = 'unknown') {
  if (!car.alive || amount <= 0) return;
  car.hp -= amount;
  car.flash = 0.18;
  if (car.hp > 0) return;

  car.hp = 0;
  car.alive = false;
  emit(world, 'fire', car.x, car.y, 18, { spread: 3.1, size: 9, life: 0.9, color: '#ff8a35' });
  emit(world, 'smoke', car.x, car.y, 16, { spread: 2.5, size: 13, life: 1.8, color: '#555c60' });
  emit(world, 'spark', car.x, car.y, 12, { spread: 2.8, color: COLORS.gold, size: 3 });
  addFlash(world, '#ff9a46', 0.14, 0.2);
  world.sfx('explosion');
  addShake(world.camera, 13);

  if (source === 'player' || source === 'bullet-player') world.reportCrime(30, 'Vehicle destroyed');
  if (car.driver?.type === 'player') {
    world.player.inVehicle = null;
    world.player.x = car.x + 22;
    world.player.y = car.y + 22;
    world.damagePlayer(28, 'explosion');
  } else if (car.driver) {
    world.spawnPed(car.x + 20, car.y, 'flee');
  }
  car.driver = null;
  const index = world.vehicles.indexOf(car);
  if (index !== -1) world.vehicles.splice(index, 1);
}

export function ejectDriver(world, car) {
  const driver = car.driver;
  car.driver = null;
  if (driver && driver.type !== 'player') {
    world.spawnPed(
      car.x + Math.cos(car.angle + Math.PI / 2) * 24,
      car.y + Math.sin(car.angle + Math.PI / 2) * 24,
      'flee',
    );
  }
  return driver;
}

export function randomParkedCar(world) {
  const type = pick(world.random, ['sedan', 'sedan', 'taxi', 'van', 'sports', 'truck']);
  const axis = world.random() < 0.5 ? 'h' : 'v';
  const curb = (world.random() < 0.5 ? 1 : -1) * (GRID.road / 2 - 7);
  let x;
  let y;
  let angle;
  if (axis === 'h') {
    const line = GRID.first + Math.floor(world.random() * GRID.rows) * GRID.step;
    x = range(world.random, 80, WORLD.width - 80);
    y = line + curb;
    angle = world.random() < 0.5 ? 0 : Math.PI;
  } else {
    const line = GRID.first + Math.floor(world.random() * GRID.columns) * GRID.step;
    x = line + curb;
    y = range(world.random, 80, WORLD.waterY - 80);
    angle = world.random() < 0.5 ? Math.PI / 2 : -Math.PI / 2;
  }
  const car = spawnVehicle(world, type, x, y, angle);
  car.parked = true;
  return car;
}
