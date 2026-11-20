import { CITY } from './config.js';
import { cellAt, isSolid } from './city.js';
import { hashCell } from './random.js';

export const VEHICLE_TYPES = {
  sedan: { width: 54, length: 27, maxSpeed: 305, accel: 255, brake: 420, grip: 5.4, turn: 2.15, mass: 1, color: ['#c65b52', '#d9c36a', '#6f9fb5', '#b7b2a4'] },
  sports: { width: 52, length: 25, maxSpeed: 440, accel: 410, brake: 470, grip: 6.6, turn: 2.5, mass: 0.8, color: ['#e04f4a', '#f0a63c', '#54b9c4', '#3f4d63'] },
  taxi: { width: 56, length: 28, maxSpeed: 285, accel: 235, brake: 400, grip: 5.2, turn: 2.05, mass: 1.15, color: ['#efc43e', '#e8b52f'] },
  van: { width: 62, length: 32, maxSpeed: 245, accel: 190, brake: 350, grip: 4.4, turn: 1.7, mass: 1.5, color: ['#d7d3c4', '#8fa9ae', '#c7b79a'] },
  truck: { width: 76, length: 36, maxSpeed: 215, accel: 150, brake: 300, grip: 3.8, turn: 1.4, mass: 2.1, color: ['#9d7a54', '#a7a396', '#6f8894'] },
  cruiser: { width: 56, length: 28, maxSpeed: 355, accel: 320, brake: 450, grip: 5.9, turn: 2.25, mass: 1.1, color: ['#e8ecef', '#d5dde2'] },
};

const TYPE_ORDER = ['sedan', 'sedan', 'taxi', 'van', 'sports', 'sedan', 'truck', 'sports'];

function distance(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}

function clamp(value, low, high) {
  return value < low ? low : value > high ? high : value;
}

export function createVehicles(world) {
  const state = world.state;
  const city = world.city;
  if (!Array.isArray(state.vehicles)) state.vehicles = [];
  const list = state.vehicles;
  let exhaustClock = 0;
  let spawnClock = 0;

  function system(name) {
    return state.systems ? state.systems[name] : null;
  }

  function spec(vehicle) {
    return VEHICLE_TYPES[vehicle.type] || VEHICLE_TYPES.sedan;
  }

  function spawn(type, x, y, angle = 0, options = {}) {
    const definition = VEHICLE_TYPES[type] || VEHICLE_TYPES.sedan;
    const colors = definition.color;
    const variant = hashCell(state.seed, Math.floor(x), Math.floor(y), type.length + 17) % colors.length;
    const vehicle = {
      type: VEHICLE_TYPES[type] ? type : 'sedan',
      x,
      y,
      angle,
      speed: 0,
      slide: 0,
      width: definition.width,
      length: definition.length,
      color: options.color || colors[variant],
      health: 100,
      driver: options.driver || null,
      aiControl: null,
      siren: Boolean(options.siren),
      mission: Boolean(options.mission),
      controlled: false,
      wrecked: false,
      smokeClock: 0,
      plate: `SB-${hashCell(state.seed, Math.floor(x), Math.floor(y), 31) % 900 + 100}`,
    };
    list.push(vehicle);
    return vehicle;
  }

  function remove(vehicle) {
    const index = list.indexOf(vehicle);
    if (index >= 0) list.splice(index, 1);
    if (state.player.vehicle === vehicle) {
      state.player.vehicle = null;
      state.player.inVehicle = false;
    }
  }

  function nearest(x, y, range, filter) {
    let best = null;
    let bestDistance = range;
    for (let index = 0; index < list.length; index += 1) {
      const vehicle = list[index];
      if (vehicle.wrecked || (filter && !filter(vehicle))) continue;
      const gap = distance(x, y, vehicle.x, vehicle.y);
      if (gap < bestDistance) {
        bestDistance = gap;
        best = vehicle;
      }
    }
    return best;
  }

  function parkNearby() {
    const player = state.player;
    const size = city.cellSize;
    const centerColumn = Math.floor(player.x / size);
    const centerRow = Math.floor(player.y / size);
    for (let row = centerRow - 5; row <= centerRow + 5; row += 1) {
      for (let column = centerColumn - 5; column <= centerColumn + 5; column += 1) {
        if (row < 1 || column < 1 || row >= city.grid - 1 || column >= city.grid - 1) continue;
        const cell = cellAt(city, column * size + size / 2, row * size + size / 2);
        if (!cell || cell.terrain !== 'land') continue;
        const hash = hashCell(city.seed, column, row, 77);
        if (hash % 11 >= 3) continue;
        const vertical = hash % 2 === 0;
        const lane = hash % 4 < 2 ? 0.25 : 0.75;
        const x = column * size + (vertical ? size * lane : size / 2);
        const y = row * size + (vertical ? size / 2 : size * lane);
        if (distance(player.x, player.y, x, y) < 130) continue;
        if (list.some((vehicle) => distance(vehicle.x, vehicle.y, x, y) < 58)) continue;
        const type = TYPE_ORDER[(hash >>> 5) % TYPE_ORDER.length];
        spawn(type, x, y, vertical ? -Math.PI / 2 : 0, { driver: null });
      }
    }
  }

  function ejectDriver(vehicle, offense) {
    const driver = vehicle.driver;
    if (!driver) return;
    const peds = system('peds');
    const side = vehicle.angle + Math.PI / 2;
    if (peds && peds.spawnAt) {
      const ped = peds.spawnAt(vehicle.x + Math.cos(side) * 28, vehicle.y + Math.sin(side) * 28, 'civilian');
      ped.fleeUntil = state.elapsed + 6;
    }
    if (offense) {
      const wanted = system('wanted');
      if (wanted) wanted.addCrime(vehicle.siren ? 'policejack' : 'carjacking', 1, vehicle.x, vehicle.y);
    }
    vehicle.driver = null;
  }

  function enter(vehicle) {
    const player = state.player;
    if (vehicle.wrecked || player.vehicle) return;
    ejectDriver(vehicle, true);
    vehicle.driver = 'player';
    vehicle.controlled = true;
    vehicle.aiControl = null;
    player.vehicle = vehicle;
    player.inVehicle = true;
    player.vx = 0;
    player.vy = 0;
    const audio = system('audio');
    if (audio) audio.play('blip');
    const hud = system('hud');
    if (hud) hud.toast(vehicle.siren ? 'Police cruiser — that is NOT subtle.' : `Driving the ${vehicle.type}.`, vehicle.siren ? 'warn' : 'info');
  }

  function exit() {
    const player = state.player;
    const vehicle = player.vehicle;
    if (!vehicle) return;
    const candidates = [vehicle.angle + Math.PI / 2, vehicle.angle - Math.PI / 2];
    for (let index = 0; index < candidates.length; index += 1) {
      const angle = candidates[index];
      const x = vehicle.x + Math.cos(angle) * 38;
      const y = vehicle.y + Math.sin(angle) * 38;
      if (isSolid(city, x, y)) continue;
      player.x = x;
      player.y = y;
      player.inVehicle = false;
      player.vehicle = null;
      player.vx = 0;
      player.vy = 0;
      vehicle.controlled = false;
      vehicle.driver = null;
      if (speedOf(vehicle) > 40) {
        const wanted = system('wanted');
        if (wanted) wanted.addCrime('jumping', 0, x, y);
      }
      const audio = system('audio');
      if (audio) audio.play('blip');
      return;
    }
  }

  function interact() {
    const player = state.player;
    if (player.vehicle) {
      exit();
      return true;
    }
    const wanted = system('wanted');
    if (wanted && wanted.atShop && wanted.atShop()) {
      if (wanted.cleanse()) return true;
    }
    const missions = system('missions');
    if (missions && missions.interact && missions.interact()) return true;
    const vehicle = nearest(player.x, player.y, 62);
    if (!vehicle) return false;
    enter(vehicle);
    return true;
  }

  function horn() {
    const audio = system('audio');
    if (audio) audio.play('horn');
    state.fleeUntil = state.elapsed + 2;
  }

  function speedOf(vehicle) {
    return Math.abs(vehicle.speed);
  }

  function damage(vehicle, amount, source) {
    if (vehicle.wrecked || amount <= 0) return;
    vehicle.health -= amount;
    const fx = system('effects');
    const audio = system('audio');
    if (fx) {
      if (vehicle.health < 55) fx.emit('smoke', vehicle.x, vehicle.y, 2);
      fx.emit(source === 'car' ? 'spark' : 'dust', vehicle.x, vehicle.y, 4);
    }
    if (audio && amount > 7) audio.play('crash');
    if (vehicle.health <= 0) {
      vehicle.health = 0;
      vehicle.wrecked = true;
      vehicle.speed = 0;
      vehicle.aiControl = null;
      vehicle.driver = null;
      if (fx) fx.explosion(vehicle.x, vehicle.y);
      if (audio) audio.play('explode');
      if (state.camera && state.camera.kick) state.camera.kick(16);
      if (state.player.vehicle === vehicle) {
        state.player.vehicle = null;
        state.player.inVehicle = false;
        world.damage(30);
      }
    }
  }

  function handleCollisions(vehicle) {
    const definition = spec(vehicle);
    const fx = system('effects');
    const wanted = system('wanted');
    const cos = Math.cos(vehicle.angle);
    const sin = Math.sin(vehicle.angle);
    const frontX = vehicle.x + cos * definition.width * 0.5;
    const frontY = vehicle.y + sin * definition.width * 0.5;
    const backX = vehicle.x - cos * definition.width * 0.5;
    const backY = vehicle.y - sin * definition.width * 0.5;
    const sideX = -sin * definition.length * 0.4;
    const sideY = cos * definition.length * 0.4;
    const probes = [frontX, frontY, backX, backY, frontX + sideX, frontY + sideY, frontX - sideX, frontY - sideY];
    let blocked = false;
    for (let index = 0; index < probes.length; index += 2) {
      if (isSolid(city, probes[index], probes[index + 1])) {
        blocked = true;
        break;
      }
    }
    if (blocked) {
      const impactSpeed = speedOf(vehicle);
      if (impactSpeed > 45) {
        damage(vehicle, impactSpeed * 0.09, 'wall');
        if (fx) fx.emit('spark', frontX, frontY, 5);
        if (state.camera && state.camera.kick) state.camera.kick(Math.min(8, impactSpeed * 0.02));
        if (vehicle.controlled && wanted) wanted.addCrime('crash', 0, vehicle.x, vehicle.y);
      }
      vehicle.x -= cos * 6 * Math.sign(vehicle.speed || 1);
      vehicle.y -= sin * 6 * Math.sign(vehicle.speed || 1);
      vehicle.speed *= -0.22;
      vehicle.slide *= 0.4;
    }

    for (let index = 0; index < list.length; index += 1) {
      const other = list[index];
      if (other === vehicle || other.wrecked) continue;
      const gap = distance(vehicle.x, vehicle.y, other.x, other.y);
      const limit = (definition.width + spec(other).width) * 0.44;
      if (gap > limit || gap < 0.01) continue;
      const nx = (other.x - vehicle.x) / gap;
      const ny = (other.y - vehicle.y) / gap;
      const push = (limit - gap) * 0.5;
      vehicle.x -= nx * push;
      vehicle.y -= ny * push;
      other.x += nx * push;
      other.y += ny * push;
      const closing = Math.abs(vehicle.speed - other.speed);
      if (closing > 85) {
        damage(vehicle, closing * 0.05, 'car');
        damage(other, closing * 0.05, 'car');
        if (fx) fx.emit('spark', (vehicle.x + other.x) / 2, (vehicle.y + other.y) / 2, 7);
        if (vehicle.controlled && wanted) wanted.addCrime('hitcar', 1, vehicle.x, vehicle.y);
      }
    }

    const peds = system('peds');
    if (peds && Array.isArray(state.peds) && speedOf(vehicle) > 55) {
      for (let index = 0; index < state.peds.length; index += 1) {
        const ped = state.peds[index];
        if (!ped || ped.dead || ped.inVehicle) continue;
        if (distance(vehicle.x, vehicle.y, ped.x, ped.y) > definition.width * 0.62 + 10) continue;
        peds.hurt(ped, 65 + speedOf(vehicle) * 0.14, 'car');
        vehicle.speed *= 0.82;
        if (wanted && (vehicle.controlled || vehicle.siren === false)) wanted.addCrime('hitped', 2, ped.x, ped.y);
      }
    }
  }

  function drive(vehicle, throttle, steer, handbrake, dt) {
    const definition = spec(vehicle);
    if (vehicle.wrecked) return;
    const moving = vehicle.speed;
    if (throttle > 0) vehicle.speed += definition.accel * throttle * dt;
    else if (throttle < 0) {
      if (vehicle.speed > 0) vehicle.speed -= definition.brake * dt;
      else vehicle.speed += definition.accel * 0.6 * throttle * dt;
    } else {
      vehicle.speed *= Math.pow(0.955, dt * 60);
    }
    vehicle.speed = clamp(vehicle.speed, -definition.maxSpeed * 0.35, definition.maxSpeed);
    const turnRate = definition.turn * (0.3 + Math.min(1, speedOf(vehicle) / 150));
    const direction = moving < -2 ? -1 : 1;
    vehicle.angle += steer * turnRate * direction * dt;
    const slip = steer * speedOf(vehicle) * turnRate * dt * (handbrake ? 0.95 : 0.3);
    vehicle.slide += slip;
    vehicle.slide *= Math.exp(-(handbrake ? 1.1 : definition.grip) * dt);
    const cos = Math.cos(vehicle.angle);
    const sin = Math.sin(vehicle.angle);
    vehicle.x += (cos * vehicle.speed - sin * vehicle.slide) * dt;
    vehicle.y += (sin * vehicle.speed + cos * vehicle.slide) * dt;
    vehicle.x = clamp(vehicle.x, 20, city.size - 20);
    vehicle.y = clamp(vehicle.y, 20, city.size - 20);
    handleCollisions(vehicle);
  }

  function beforeStep(control) {
    if (state.player.vehicle) {
      control.x = 0;
      control.y = 0;
      control.run = false;
    }
  }

  function step(dt, control) {
    const player = state.player;
    const audio = system('audio');
    const fx = system('effects');
    exhaustClock += dt;
    spawnClock += dt;

    if (player.vehicle && !player.vehicle.wrecked) {
      const vehicle = player.vehicle;
      const throttle = -(control.y || 0);
      const steer = control.x || 0;
      const handbrake = Boolean(control.run);
      drive(vehicle, throttle, steer, handbrake, dt);
      player.x = vehicle.x;
      player.y = vehicle.y;
      player.angle = vehicle.angle;
      player.speed = speedOf(vehicle);
      if (audio) audio.setEngine(speedOf(vehicle), spec(vehicle).maxSpeed);
      if (exhaustClock > 0.12 && fx && speedOf(vehicle) > 30) {
        exhaustClock = 0;
        fx.emit('exhaust', vehicle.x - Math.cos(vehicle.angle) * 28, vehicle.y - Math.sin(vehicle.angle) * 28, 1, 0.4, vehicle.angle + Math.PI);
      }
      if (handbrake && speedOf(vehicle) > 110 && fx) {
        fx.skid(vehicle.x, vehicle.y, vehicle.angle, Math.min(1, speedOf(vehicle) / 300));
      }
    } else if (audio) {
      audio.setEngine(0, 1);
    }

    for (let index = 0; index < list.length; index += 1) {
      const vehicle = list[index];
      if (vehicle === player.vehicle || !vehicle.aiControl || vehicle.wrecked) continue;
      const command = vehicle.aiControl;
      drive(vehicle, command.throttle || 0, command.steer || 0, false, dt);
      if (vehicle.siren && audio) audio.setSiren(true, player.wanted);
      if (fx && vehicle.health < 45 && exhaustClock > 0.1) fx.emit('smoke', vehicle.x, vehicle.y, 1);
    }

    for (let index = list.length - 1; index >= 0; index -= 1) {
      const vehicle = list[index];
      if (vehicle === player.vehicle || vehicle.mission || vehicle.siren) continue;
      if (distance(vehicle.x, vehicle.y, player.x, player.y) > 2400) remove(vehicle);
    }
    if (spawnClock > 1.5) {
      spawnClock = 0;
      if (list.length < 26) parkNearby();
    }
  }

  function reset() {
    list.length = 0;
    state.player.vehicle = null;
    state.player.inVehicle = false;
    parkNearby();
  }

  parkNearby();
  return { list, spawn, remove, nearest, enter, exit, interact, horn, damage, drive, beforeStep, step, reset, speedOf, system };
}

let current = null;

export function install(context) {
  current = createVehicles(context.world);
  context.systems.vehicles = current;
}

export function interact() {
  if (current) current.interact();
}

export function horn() {
  if (current) current.horn();
}

export function spawnVehicle(type, x, y, angle, options) {
  if (current) return current.spawn(type, x, y, angle, options);
  return null;
}
