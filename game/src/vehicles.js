import { CAR_SPECS, MAP, PALETTE } from './config.js';
import { clearOfBuildings } from './city.js';
import { between, choose, limit } from './random.js';
import { flashLight, markTire, screenTint, spray } from './effects.js';
import { kickCamera } from './camera.js';

const BODY_COLORS = ['#d95349', '#e7b846', '#4a83bb', '#ece7d9', '#34424d', '#66a47c', '#9b6bb4', '#dc8245'];

export function newCar(world, kind, x, y, angle = 0, driver = null) {
  const spec = CAR_SPECS[kind] ?? CAR_SPECS.sedan;
  let body = BODY_COLORS[Math.floor(world.rng() * BODY_COLORS.length)];
  if (kind === 'police') body = '#e9edf2';
  if (kind === 'taxi') body = '#f2c230';
  const car = {
    id: world.nextId++,
    kind, x, y, angle,
    velocity: 0,
    sideways: 0,
    hp: spec.hp,
    maxHp: spec.hp,
    driver,
    route: null,
    parked: false,
    alive: true,
    body,
    hitGlow: 0,
    fumeClock: 0,
    hornClock: 0,
    siren: false,
    sirenWave: 0,
    impactClock: 0,
  };
  world.vehicles.push(car);
  return car;
}

export function carSpec(car) {
  return CAR_SPECS[car.kind] ?? CAR_SPECS.sedan;
}

export function carById(world, id) {
  return world.vehicles.find((car) => car.id === id) ?? null;
}

export function carNearby(world, x, y, radius = 78) {
  let best = null;
  let bestGap = radius;
  for (const car of world.vehicles) {
    if (!car.alive) continue;
    const away = Math.hypot(car.x - x, car.y - y);
    if (away < bestGap) {
      best = car;
      bestGap = away;
    }
  }
  return best;
}

export function driveCar(world, car, orders, dt) {
  if (!car.alive) return;
  const spec = carSpec(car);
  car.hitGlow = Math.max(0, car.hitGlow - dt * 4);
  car.hornClock = Math.max(0, car.hornClock - dt);
  car.impactClock = Math.max(0, car.impactClock - dt);
  car.sirenWave += dt * 9;

  const gas = orders.gas ?? 0;
  const wheel = orders.wheel ?? 0;
  const handbrake = orders.handbrake ?? false;

  if (gas > 0) car.velocity += spec.accel * gas * dt;
  else if (gas < 0) {
    car.velocity -= (car.velocity > 4 ? spec.brake : spec.accel * 0.62) * dt;
  } else car.velocity *= 1 - dt * (handbrake ? 1.5 : 0.55);

  car.velocity *= 1 - dt * (0.16 + Math.abs(car.velocity) * 0.0011);
  car.velocity = limit(car.velocity, -spec.maxSpeed * 0.36, spec.maxSpeed);
  if (Math.abs(car.velocity) < 0.6 && gas === 0) car.velocity = 0;

  if (Math.abs(car.velocity) > 4) {
    const authority = limit(Math.abs(car.velocity) / 62, 0, 1);
    car.angle += wheel * spec.turn * authority * Math.sign(car.velocity) * dt;
  }

  const targetSlip = -wheel * Math.abs(car.velocity) * (handbrake ? 0.5 : 0.018);
  car.sideways += (targetSlip - car.sideways) * Math.min(1, dt * (handbrake ? 2.1 : spec.grip));

  const forward = Math.cos(car.angle);
  const lateral = Math.sin(car.angle);
  const movementX = forward * car.velocity - lateral * car.sideways;
  const movementY = lateral * car.velocity + forward * car.sideways;
  const landing = clearOfBuildings(
    world.city,
    car.x + movementX * dt,
    car.y + movementY * dt,
    spec.width * 0.62,
  );

  if (landing.hit && Math.abs(car.velocity) > 28 && car.impactClock === 0) {
    const power = Math.abs(car.velocity);
    hurtCar(world, car, power * 0.045, 'wall');
    car.velocity *= -0.16;
    car.sideways *= 0.4;
    car.impactClock = 0.25;
    spray(world, 'spark', car.x + forward * spec.length / 2, car.y + lateral * spec.length / 2, 5, {
      scatter: 1.3, color: PALETTE.amber, size: 2.6,
    });
    if (car.driver?.type === 'player') kickCamera(world.camera, Math.min(12, power * 0.035));
  }

  car.x = landing.x;
  car.y = landing.y;
  if (car.y > MAP.seaLine - 170) car.velocity *= 1 - dt * 1.5;

  if (handbrake && Math.abs(car.velocity) > 90) {
    markTire(world, car.x - forward * spec.length / 2, car.y - lateral * spec.length / 2, car.angle, 0.7);
  }

  if (car.hp < car.maxHp * 0.55) {
    car.fumeClock -= dt;
    if (car.fumeClock <= 0) {
      const burning = car.hp < car.maxHp * 0.25;
      car.fumeClock = burning ? 0.05 : 0.13;
      spray(world, burning ? 'fire' : 'smoke',
        car.x - forward * spec.length / 2, car.y - lateral * spec.length / 2, 1, {
          scatter: 0.7, size: burning ? 5 : 7, life: 0.9,
          color: burning ? '#ff8b3e' : '#6b6f70',
          vx: -forward * 24, vy: -lateral * 24 - 12,
        });
    }
  }

  if (car.siren && Math.floor(car.sirenWave) % 2 === 0) {
    flashLight(world, car.x, car.y, 'rgba(90,140,255,0.8)', 70, 0.05);
  }

  if (orders.horn && car.hornClock === 0) {
    car.hornClock = 0.55;
    world.sound('horn', spec.horn);
  }
}

export function crashCars(world) {
  const cars = world.vehicles;
  for (let i = 0; i < cars.length; i += 1) {
    const first = cars[i];
    if (!first.alive) continue;
    for (let j = i + 1; j < cars.length; j += 1) {
      const second = cars[j];
      if (!second.alive) continue;
      const dx = second.x - first.x;
      const dy = second.y - first.y;
      const minimum = (carSpec(first).width + carSpec(second).width) * 0.62;
      const squared = dx * dx + dy * dy;
      if (squared >= minimum * minimum || squared < 0.001) continue;
      const apart = Math.sqrt(squared);
      const nx = dx / apart;
      const ny = dy / apart;
      const overlap = minimum - apart;
      const aMass = carSpec(first).mass;
      const bMass = carSpec(second).mass;
      const sum = aMass + bMass;
      first.x -= nx * overlap * (bMass / sum);
      first.y -= ny * overlap * (bMass / sum);
      second.x += nx * overlap * (aMass / sum);
      second.y += ny * overlap * (aMass / sum);

      const closing = Math.abs(first.velocity - second.velocity)
        + Math.abs(first.sideways - second.sideways);
      if (closing <= 26 || first.impactClock > 0 || second.impactClock > 0) continue;
      first.impactClock = 0.25;
      second.impactClock = 0.25;
      hurtCar(world, first, closing * 0.024, second.driver?.type === 'player' ? 'ram' : 'car');
      hurtCar(world, second, closing * 0.024, first.driver?.type === 'player' ? 'ram' : 'car');
      spray(world, 'spark', (first.x + second.x) / 2, (first.y + second.y) / 2, 6, {
        scatter: 1.6, color: PALETTE.amber, size: 2.4,
      });
      if (first.driver?.type === 'player' || second.driver?.type === 'player') {
        kickCamera(world.camera, Math.min(10, closing * 0.025));
        if (closing > 95) world.crime(12, 'Reckless collision');
      }
    }
  }
}

export function hurtCar(world, car, amount, source = 'unknown') {
  if (!car.alive || amount <= 0) return;
  car.hp -= amount;
  car.hitGlow = 0.18;
  if (car.hp > 0) return;

  car.hp = 0;
  car.alive = false;
  spray(world, 'fire', car.x, car.y, 18, { scatter: 3.1, size: 9, life: 0.9, color: '#ff8a35' });
  spray(world, 'smoke', car.x, car.y, 16, { scatter: 2.5, size: 13, life: 1.8, color: '#555c60' });
  spray(world, 'spark', car.x, car.y, 12, { scatter: 2.8, color: PALETTE.amber, size: 3 });
  screenTint(world, '#ff9a46', 0.14, 0.2);
  world.sound('explosion');
  kickCamera(world.camera, 13);

  if (source === 'player' || source === 'bullet-player') world.crime(30, 'Vehicle destroyed');
  if (car.driver?.type === 'player') {
    world.player.carId = null;
    world.player.x = car.x + 22;
    world.player.y = car.y + 22;
    world.hurtPlayer(28, 'explosion');
  } else if (car.driver) {
    world.spawnPerson(car.x + 20, car.y, 'flee');
  }
  car.driver = null;
  const index = world.vehicles.indexOf(car);
  if (index !== -1) world.vehicles.splice(index, 1);
}

export function evictDriver(world, car) {
  const driver = car.driver;
  car.driver = null;
  if (driver && driver.type !== 'player') {
    world.spawnPerson(
      car.x + Math.cos(car.angle + Math.PI / 2) * 24,
      car.y + Math.sin(car.angle + Math.PI / 2) * 24,
      'flee',
    );
  }
  return driver;
}

export function parkedCar(world) {
  const kind = choose(world.rng, ['sedan', 'sedan', 'taxi', 'van', 'sports', 'truck']);
  const alongX = world.rng() < 0.5;
  const curb = (world.rng() < 0.5 ? 1 : -1) * (MAP.road / 2 - 7);
  let x;
  let y;
  let angle;
  if (alongX) {
    const line = MAP.first + Math.floor(world.rng() * MAP.rows) * MAP.step;
    x = between(world.rng, 80, MAP.width - 80);
    y = line + curb;
    angle = world.rng() < 0.5 ? 0 : Math.PI;
  } else {
    const line = MAP.first + Math.floor(world.rng() * MAP.columns) * MAP.step;
    x = line + curb;
    y = between(world.rng, 80, MAP.seaLine - 80);
    angle = world.rng() < 0.5 ? Math.PI / 2 : -Math.PI / 2;
  }
  const car = newCar(world, kind, x, y, angle);
  car.parked = true;
  return car;
}
