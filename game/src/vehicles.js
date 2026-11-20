import { PALETTE, VEHICLE_TYPES } from './config.js';

const TYPES = new Map(VEHICLE_TYPES.map((entry) => [entry.id, entry]));

export function createVehicles(world) {
  const city = world.city;
  const random = world.random;
  const state = world.state;
  let serial = 0;

  function spec(type) {
    return TYPES.get(type) ?? TYPES.get('sedan');
  }

  function spawn(type, x, y, angle = 0, options = {}) {
    const model = spec(type);
    const car = {
      id: ++serial,
      type: model.id,
      spec: model,
      name: model.name,
      x, y, angle,
      vx: Math.cos(angle) * (options.speed ?? 0),
      vy: Math.sin(angle) * (options.speed ?? 0),
      speed: options.speed ?? 0,
      color: options.color ?? model.color,
      length: model.length,
      width: model.width,
      damage: 0,
      braking: false,
      siren: options.police === true,
      sirenClock: random.range(0, 4),
      police: options.police === true,
      pilot: null,
      driver: null,
      occupiedByPlayer: false,
      stolen: options.stolen === true,
      locked: options.locked === true,
      dead: false,
      worth: Math.round(model.top * 3 + 400),
      lastImpact: 0,
    };
    if (car.police) state.policeCars.push(car);
    else state.vehicles.push(car);
    return car;
  }

  function allCars() {
    return state.vehicles.concat(state.policeCars);
  }

  function reset() {
    state.vehicles.length = 0;
    state.policeCars.length = 0;
    const spots = city.parking.slice();
    for (let index = spots.length - 1; index > 0; index -= 1) {
      const other = random.integer(0, index);
      const held = spots[index];
      spots[index] = spots[other];
      spots[other] = held;
    }
    const kinds = ['sedan', 'sedan', 'taxi', 'van', 'sport', 'truck', 'sedan', 'taxi'];
    for (let index = 0; index < Math.min(46, spots.length); index += 1) {
      const spot = spots[index];
      if (city.isSolid(spot.x, spot.y, 28)) continue;
      const type = random.pick(kinds);
      spawn(type, spot.x, spot.y, spot.angle, { color: random.chance(0.3) ? random.pick(['#d7d9d2', '#69a2a8', '#c4786e', '#a99ac6']) : undefined });
    }
    for (let index = 0; index < 3; index += 1) {
      const node = city.randomNode(random);
      spawn('sedan', node.x + 20, node.y + 20, random.pick([0, Math.PI / 2, Math.PI, -Math.PI / 2]));
    }
  }

  function nearest(x, y, range = 66, filter = null) {
    let best = null;
    let distance = range;
    for (const car of allCars()) {
      if (car.dead || car.occupiedByPlayer || (filter && !filter(car))) continue;
      const gap = Math.hypot(car.x - x, car.y - y);
      if (gap < distance) {
        distance = gap;
        best = car;
      }
    }
    return best;
  }

  function drive(car, throttle, steer, handbrake, dt) {
    const model = car.spec;
    const effect = world.systems.effects;

    if (throttle > 0) car.speed += model.accel * throttle * dt;
    else if (throttle < 0) car.speed -= model.accel * 1.5 * dt;
    else car.speed *= Math.max(0, 1 - dt * 0.75);

    if (handbrake) car.speed *= Math.max(0, 1 - dt * 3.4);
    car.speed = Math.max(-model.top * 0.32, Math.min(model.top, car.speed));

    const direction = car.speed >= 0 ? 1 : -1;
    const turn = steer * direction * (1.3 + Math.min(1.9, Math.abs(car.speed) / 150)) * dt;
    car.angle += turn * (handbrake ? 1.35 : 1);

    const grip = handbrake ? model.grip * 0.22 : model.grip;
    const blend = 1 - Math.exp(-grip * dt);
    car.vx += (Math.cos(car.angle) * car.speed - car.vx) * blend;
    car.vy += (Math.sin(car.angle) * car.speed - car.vy) * blend;

    const radius = Math.max(car.length, car.width) * 0.46;
    let nextX = car.x + car.vx * dt;
    let nextY = car.y + car.vy * dt;
    if (city.isSolid(nextX, car.y, radius)) {
      collide(car, car.x + Math.cos(car.angle) * radius, car.y);
      car.vx *= -0.24;
      car.speed *= -0.16;
      car.angle += 0.5;
      nextX = car.x;
    } else car.x = nextX;
    if (city.isSolid(car.x, nextY, radius)) {
      collide(car, car.x, car.y + Math.sin(car.angle) * radius);
      car.vy *= -0.24;
      car.speed *= -0.16;
      car.angle += 0.5;
    } else car.y = nextY;

    car.braking = throttle < 0 || handbrake;
    if (Math.abs(car.speed) < 4) {
      car.vx *= 0.8;
      car.vy *= 0.8;
    }
    if (handbrake && Math.abs(car.speed) > 90 && effect) {
      effect.skid(car.x - Math.cos(car.angle) * car.length * 0.35, car.y - Math.sin(car.angle) * car.length * 0.35, car.angle);
    }
    if (car.damage > 68 && random.chance(dt * 2.4) && effect) effect.smoke(car.x, car.y);
  }

  function collide(car, x, y) {
    const impact = Math.abs(car.speed);
    if (impact < 55 || state.clock - car.lastImpact < 0.25) return;
    car.lastImpact = state.clock;
    damage(car, impact / 24);
    if (world.systems.effects) world.systems.effects.spark(x, y);
    if (world.systems.audio) world.systems.audio.crash();
    world.camera.kick(Math.min(9, impact / 40));
    if (car.occupiedByPlayer && world.systems.wanted) world.systems.wanted.add(1, 'Reckless driving');
  }

  function damage(car, amount) {
    if (car.dead) return;
    car.damage += amount;
    if (car.damage > 100) {
      car.dead = true;
      if (world.systems.effects) world.systems.effects.explosion(car.x, car.y);
      if (car.occupiedByPlayer) {
        state.player.inCar = null;
        state.player.invisible = 0.8;
        state.player.health -= 45;
      }
      const list = car.police ? state.policeCars : state.vehicles;
      const index = list.indexOf(car);
      if (index >= 0) list.splice(index, 1);
    }
  }

  function enter() {
    const player = state.player;
    if (player.inCar) {
      exit();
      return false;
    }
    if (player.enterCooldown > 0) return false;
    const car = nearest(player.x, player.y, 72);
    if (!car) return false;
    if (car.locked) {
      if (world.systems.effects) world.systems.effects.toast('This car is locked.', '#f2b544');
      return false;
    }
    if (car.driver && world.systems.peds) world.systems.peds.eject(car);
    car.occupiedByPlayer = true;
    player.inCar = car;
    player.lastCar = car;
    player.x = car.x;
    player.y = car.y;
    player.aim = car.angle;
    player.enterCooldown = 0.45;
    if (world.systems.audio) world.systems.audio.blip(420);
    if (!car.stolen && !car.police && world.systems.wanted) {
      world.systems.wanted.add(1, 'Grand theft auto');
      car.stolen = true;
    }
    if (car.police && world.systems.wanted) world.systems.wanted.add(2, 'Stealing a patrol car');
    return true;
  }

  function exit() {
    const player = state.player;
    const car = player.inCar;
    if (!car) return false;
    const side = car.angle + Math.PI / 2;
    let px = car.x + Math.cos(side) * 54;
    let py = car.y + Math.sin(side) * 54;
    if (city.isSolid(px, py, 19)) {
      px = car.x - Math.cos(side) * 54;
      py = car.y - Math.sin(side) * 54;
    }
    player.x = px;
    player.y = py;
    player.inCar = null;
    player.enterCooldown = 0.45;
    car.occupiedByPlayer = false;
    car.speed *= 0.6;
    if (world.systems.audio) world.systems.audio.blip(360);
    return true;
  }

  function step(dt, control) {
    const player = state.player;
    for (const car of allCars()) {
      car.sirenClock += dt;
      const intent = car.pilot && !car.occupiedByPlayer ? car.pilot(dt, car) : null;
      const throttle = car.occupiedByPlayer ? -(control.move?.y ?? 0) : (intent?.throttle ?? 0);
      const steer = car.occupiedByPlayer ? (control.move?.x ?? 0) : (intent?.steer ?? 0);
      const handbrake = car.occupiedByPlayer ? control.handbrake === true : intent?.handbrake === true;
      drive(car, throttle, steer, handbrake, dt);
      if (car.occupiedByPlayer) {
        player.x = car.x;
        player.y = car.y;
        player.aim = car.angle;
        if (control.horn && Math.floor(state.clock * 4) % 2 === 0 && world.systems.audio) world.systems.audio.tone(330, 0.16, 'square', 0.1);
      }
    }

    const cars = allCars();
    for (let first = 0; first < cars.length; first += 1) {
      for (let second = first + 1; second < cars.length; second += 1) {
        const a = cars[first];
        const b = cars[second];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const gap = Math.hypot(dx, dy) || 1;
        const limit = (a.length + b.length) * 0.42;
        if (gap >= limit) continue;
        const push = (limit - gap) * 0.5;
        a.x -= (dx / gap) * push;
        a.y -= (dy / gap) * push;
        b.x += (dx / gap) * push;
        b.y += (dy / gap) * push;
        if (Math.abs(a.speed - b.speed) > 75) {
          damage(a, 5);
          damage(b, 5);
        }
        a.speed *= 0.9;
        b.speed *= 0.9;
      }
    }

    if (state.peds.length) {
      for (const car of cars) {
        if (Math.abs(car.speed) < 70) continue;
        for (const ped of state.peds) {
          if (Math.hypot(ped.x - car.x, ped.y - car.y) > 28) continue;
          if (world.systems.peds) world.systems.peds.hurt(ped, 42, car.occupiedByPlayer);
          car.speed *= 0.88;
          if (world.systems.effects) world.systems.effects.puff(ped.x, ped.y, PALETTE.danger, 5, 60, 0.4);
        }
      }
    }
  }

  return { spawn, spec, reset, nearest, enter, exit, damage, drive, step, allCars };
}
