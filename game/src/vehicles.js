import { clampWorld, solidsNear } from './city.js';
import { drawVehicle } from './entity-render.js';
import { ACTION_ENTER, ACTION_EXIT } from './input.js';
import { between, pick } from './random.js';
import { clamp, circleTouchesRect, distance } from './util.js';

const MODELS = [
  { id: 'sedan', label: 'Cinder Sedan', width: 34, length: 68, top: 238, accel: 180, brake: 330, grip: 5.4, hp: 100 },
  { id: 'sport', label: 'Vega Coupe', width: 32, length: 70, top: 330, accel: 265, brake: 360, grip: 6.5, hp: 85 },
  { id: 'taxi', label: 'Sunstrand Cab', width: 35, length: 70, top: 220, accel: 170, brake: 310, grip: 5.1, hp: 105 },
  { id: 'van', label: 'Driftline Van', width: 40, length: 82, top: 195, accel: 145, brake: 280, grip: 4.4, hp: 135 },
  { id: 'truck', label: 'Ironback Hauler', width: 44, length: 100, top: 165, accel: 120, brake: 250, grip: 3.9, hp: 180 },
  { id: 'cruiser', label: 'Bay Patrol', width: 36, length: 74, top: 272, accel: 215, brake: 345, grip: 5.8, hp: 125 },
];

const PAINT = {
  sedan: ['#c8694d', '#4e8db5', '#d8c58b', '#6d7b8c', '#9d6f92'],
  sport: ['#e04d46', '#f0b43c', '#3fb6a4', '#7657c4', '#e8e2d2'],
  taxi: ['#f2c33f', '#e8b32e', '#f5d05c'],
  van: ['#cfd3cf', '#8fa5b0', '#c6a579', '#7e9382'],
  truck: ['#7f9aa5', '#b9a17a', '#8c8f96'],
  cruiser: ['#e9edf0', '#dfe6ea'],
};

export const VEHICLE_MODELS = MODELS;

export function modelById(id) {
  return MODELS.find((model) => model.id === id) || MODELS[0];
}

export function createVehicleSystem(api) {
  const { state, rng } = api;
  const city = state.city;
  const list = [];
  let nextId = 1;

  function paint(type) {
    return pick(rng, PAINT[type] || PAINT.sedan);
  }

  function spawn(type, x, y, angle = 0, options = {}) {
    const model = modelById(type);
    const vehicle = {
      id: nextId++,
      type: model.id,
      model,
      name: model.label,
      x,
      y,
      angle,
      speed: 0,
      width: model.width,
      length: model.length,
      color: options.color || paint(model.id),
      hp: model.hp,
      maxHp: model.hp,
      dead: false,
      occupiedBy: null,
      driver: null,
      aiInput: null,
      parked: Boolean(options.parked),
      siren: false,
      sirenPhase: rng() * 10,
      missionTag: null,
      lastHit: -100,
    };
    list.push(vehicle);
    return vehicle;
  }

  function reset() {
    list.length = 0;
    nextId = 1;
    for (let row = 1; row < city.rows; row += 1) {
      for (let col = 1; col < city.cols; col += 1) {
        if (rng() > 0.4) continue;
        const vertical = rng() < 0.5;
        const center = (vertical ? col : row) * city.cell;
        const along = center + between(rng, -city.cell * 0.3, city.cell * 0.3);
        const x = vertical ? center + city.road * 0.26 : along;
        const y = vertical ? along : center + city.road * 0.26;
        const type = pick(rng, ['sedan', 'sedan', 'taxi', 'van', 'sport', 'truck']);
        const car = spawn(type, x, y, vertical ? -Math.PI / 2 : 0, { parked: true });
        car.aiInput = { throttle: 0, steer: 0, brake: true };
      }
    }
  }

  function freePoint(x, y, radius) {
    const spot = clampWorld(city, x, y, radius);
    if (spot.x !== x || spot.y !== y) return null;
    for (const solid of solidsNear(city, x, y, radius + 4)) {
      if (circleTouchesRect(x, y, radius, solid)) return null;
    }
    return spot;
  }

  function canDrive(x, y, radius) {
    const spot = clampWorld(city, x, y, radius);
    if (spot.x !== x || spot.y !== y) return false;
    for (const solid of solidsNear(city, x, y, radius + 4)) {
      if (circleTouchesRect(x, y, radius * 0.78, solid)) return false;
    }
    return true;
  }

  function notify(sound, strength) {
    const audio = state.systems && state.systems.audio;
    if (!audio) return;
    if (sound === 'crash') audio.crash(strength);
    else if (sound === 'explosion') audio.explosion();
    else audio.ui();
  }

  function explode(vehicle) {
    if (vehicle.dead) return;
    vehicle.dead = true;
    const fx = state.systems && state.systems.effects;
    if (fx) fx.explosion(vehicle.x, vehicle.y);
    state.camera.kick(11);
    notify('explosion');
    if (vehicle.occupiedBy === 'player') {
      state.player.health -= 48;
      state.player.inVehicle = null;
    }
    if (vehicle.driver && vehicle.driver.kind === 'ped') {
      const peds = state.systems && state.systems.peds;
      if (peds) peds.eject(vehicle.driver, vehicle);
    }
  }

  function damage(vehicle, amount, cause = 'impact') {
    if (vehicle.dead || amount <= 0) return;
    vehicle.hp -= amount;
    vehicle.lastHit = state.elapsed;
    const fx = state.systems && state.systems.effects;
    if (fx) {
      fx.spark(vehicle.x, vehicle.y, cause === 'bullet' ? '#ffd772' : '#e3e7e8', 3);
      if (vehicle.hp < vehicle.maxHp * 0.6) fx.smoke(vehicle.x, vehicle.y, 1);
      if (vehicle.hp < vehicle.maxHp * 0.3) fx.fire(vehicle.x, vehicle.y, 1);
    }
    if (amount > 3) notify('crash', amount);
    if (vehicle.hp <= 0) explode(vehicle);
  }

  function integrate(vehicle, input, dt) {
    if (vehicle.dead) return;
    const model = vehicle.model;
    const throttle = clamp(input.throttle || 0, -1, 1);
    const steer = clamp(input.steer || 0, -1, 1);
    const braking = Boolean(input.brake) || (throttle < 0 && vehicle.speed > 14);
    if (braking) vehicle.speed -= model.brake * dt;
    else if (throttle !== 0) vehicle.speed += throttle * (throttle > 0 ? model.accel : model.accel * 0.68) * dt;
    else vehicle.speed -= Math.sign(vehicle.speed) * Math.min(Math.abs(vehicle.speed), 46 * dt);
    if (input.handbrake) vehicle.speed -= Math.sign(vehicle.speed) * Math.min(Math.abs(vehicle.speed), 240 * dt);
    vehicle.speed = clamp(vehicle.speed, -model.top * 0.34, model.top);
    const turn = Math.min(1, Math.abs(vehicle.speed) / 78);
    vehicle.angle += steer * turn * (input.handbrake ? 3.1 : 2.05) * dt * (vehicle.speed < -4 ? -1 : 1);
    if (input.handbrake && Math.abs(vehicle.speed) > 90) {
      const fx = state.systems && state.systems.effects;
      if (fx) fx.skid(vehicle.x, vehicle.y, vehicle.angle);
    }
    const radius = Math.max(vehicle.width, vehicle.length) * 0.36;
    const travel = vehicle.speed * dt;
    const nx = vehicle.x + Math.cos(vehicle.angle) * travel;
    const ny = vehicle.y + Math.sin(vehicle.angle) * travel;
    if (canDrive(nx, ny, radius)) {
      vehicle.x = nx;
      vehicle.y = ny;
    } else {
      let moved = false;
      if (canDrive(nx, vehicle.y, radius)) {
        vehicle.x = nx;
        moved = true;
      }
      if (canDrive(vehicle.x, ny, radius)) {
        vehicle.y = ny;
        moved = true;
      }
      const impact = Math.abs(vehicle.speed);
      vehicle.speed *= -0.18;
      if (impact > 34) damage(vehicle, impact * 0.22);
      if (!moved) vehicle.speed *= 0.4;
    }
  }

  function playerInput(controls) {
    if (!controls || typeof controls !== 'object') return { throttle: 0, steer: 0 };
    return {
      throttle: clamp(-(controls.y || 0), -1, 1),
      steer: clamp(controls.x || 0, -1, 1),
      handbrake: Boolean(controls.handbrake),
    };
  }

  function handleInteractions(controls) {
    if (!controls || typeof controls !== 'object') return;
    const actions = controls.actions || 0;
    const player = state.player;
    const wanted = state.systems && state.systems.wanted;
    if (player.inVehicle) {
      const current = playerVehicle();
      if (!current) {
        player.inVehicle = null;
        return;
      }
      if (wanted && wanted.tryWash(current, actions)) return;
      if (actions & (ACTION_ENTER | ACTION_EXIT)) exitCar(current);
      return;
    }
    if (!(actions & (ACTION_ENTER | ACTION_EXIT))) return;
    const car = nearest(player.x, player.y, 62, (item) => !item.dead);
    if (!car) return;
    const peds = state.systems && state.systems.peds;
    if (car.driver && car.driver.kind === 'ped' && peds) peds.eject(car.driver, car);
    car.occupiedBy = 'player';
    car.driver = player;
    car.aiInput = null;
    car.siren = car.type === 'cruiser';
    player.inVehicle = car;
    player.health = Math.min(100, player.health);
    if (wanted) {
      wanted.add('jack');
      if (car.type === 'cruiser') wanted.add('police');
    }
    state.systems.toast(`You took the ${car.name}.`);
    notify('ui');
  }

  function exitCar(vehicle) {
    const player = state.player;
    const side = vehicle.angle + Math.PI / 2;
    const offset = vehicle.width * 0.9 + player.radius + 3;
    const spot = freePoint(vehicle.x + Math.cos(side) * offset, vehicle.y + Math.sin(side) * offset, player.radius);
    if (!spot) return;
    player.x = spot.x;
    player.y = spot.y;
    player.inVehicle = null;
    player.vx = 0;
    player.vy = 0;
    vehicle.occupiedBy = null;
    vehicle.driver = null;
    vehicle.speed *= 0.45;
    vehicle.siren = vehicle.type === 'cruiser';
    state.systems.toast('You left the vehicle.');
    notify('ui');
  }

  function resolveCollisions() {
    for (let first = 0; first < list.length; first += 1) {
      const a = list[first];
      if (a.dead) continue;
      for (let second = first + 1; second < list.length; second += 1) {
        const b = list[second];
        if (b.dead) continue;
        const reach = (a.length + b.length) * 0.32;
        const gap = distance(a.x, a.y, b.x, b.y);
        if (gap >= reach || gap < 0.001) continue;
        const push = (reach - gap) * 0.5;
        const dx = (a.x - b.x) / gap;
        const dy = (a.y - b.y) / gap;
        if (canDrive(a.x + dx * push, a.y + dy * push, Math.max(a.width, a.length) * 0.34)) {
          a.x += dx * push;
          a.y += dy * push;
        }
        if (canDrive(b.x - dx * push, b.y - dy * push, Math.max(b.width, b.length) * 0.34)) {
          b.x -= dx * push;
          b.y -= dy * push;
        }
        const impact = Math.abs(a.speed) + Math.abs(b.speed);
        if (impact > 55 && state.elapsed - a.lastHit > 0.4) {
          damage(a, impact * 0.08);
          damage(b, impact * 0.08);
          if ((a.occupiedBy === 'player' || b.occupiedBy === 'player') && state.systems.wanted) {
            state.systems.wanted.add('car');
          }
          a.lastHit = state.elapsed;
          b.lastHit = state.elapsed;
        } else {
          a.speed *= 0.82;
          b.speed *= 0.82;
        }
      }
    }
  }

  function step(dt, controls) {
    handleInteractions(controls);
    for (const vehicle of list) {
      if (vehicle.dead) continue;
      let input = vehicle.aiInput || { throttle: 0, steer: 0, brake: vehicle.parked };
      if (vehicle.occupiedBy === 'player') input = playerInput(controls);
      integrate(vehicle, input, dt);
      vehicle.sirenPhase += dt;
    }
    resolveCollisions();
    for (let index = list.length - 1; index >= 0; index -= 1) {
      if (list[index].dead) list.splice(index, 1);
    }
    const current = playerVehicle();
    if (current && controls && typeof controls === 'object' && controls.horn) {
      const audio = state.systems && state.systems.audio;
      if (audio) audio.horn();
    }
  }

  function nearest(x, y, radius, filter) {
    let found = null;
    let best = radius * radius;
    for (const vehicle of list) {
      if (vehicle.dead || (filter && !filter(vehicle))) continue;
      const dx = vehicle.x - x;
      const dy = vehicle.y - y;
      const squared = dx * dx + dy * dy;
      if (squared < best) {
        best = squared;
        found = vehicle;
      }
    }
    return found;
  }

  function playerVehicle() {
    return list.find((vehicle) => vehicle.occupiedBy === 'player' && !vehicle.dead) || null;
  }

  function syncPlayer() {
    const vehicle = playerVehicle();
    if (!vehicle) return false;
    const player = state.player;
    player.x = vehicle.x + Math.cos(vehicle.angle) * 3;
    player.y = vehicle.y + Math.sin(vehicle.angle) * 3;
    player.vx = Math.cos(vehicle.angle) * vehicle.speed;
    player.vy = Math.sin(vehicle.angle) * vehicle.speed;
    player.angle = vehicle.angle;
    player.moving = Math.abs(vehicle.speed) > 24;
    player.aim.x = vehicle.x + Math.cos(vehicle.angle) * 140;
    player.aim.y = vehicle.y + Math.sin(vehicle.angle) * 140;
    return true;
  }

  function resetPlayer() {
    const player = state.player;
    player.inVehicle = null;
    for (const vehicle of list) {
      if (vehicle.occupiedBy === 'player') {
        vehicle.occupiedBy = null;
        vehicle.driver = null;
        vehicle.speed = 0;
      }
    }
  }

  return {
    list,
    reset,
    step,
    spawn,
    damage,
    nearest,
    playerVehicle,
    syncPlayer,
    resetPlayer,
    freePoint,
  };
}

export function draw(ctx, state) {
  const system = state.systems && state.systems.vehicles;
  if (!system) return;
  for (const vehicle of system.list) {
    if (vehicle.dead) continue;
    drawVehicle(ctx, vehicle, state.environment.state);
    if (vehicle.hp < vehicle.maxHp * 0.6) {
      ctx.fillStyle = 'rgba(34, 36, 38, 0.5)';
      ctx.fillRect(vehicle.x - 5, vehicle.y - vehicle.width / 2 - 2, 10, 3);
    }
    if (vehicle.type === 'taxi') {
      ctx.fillStyle = '#2f3944';
      ctx.fillRect(vehicle.x - 7, vehicle.y - 4, 14, 8);
      ctx.fillStyle = '#f2c94c';
      ctx.fillRect(vehicle.x - 5, vehicle.y - 2, 10, 4);
    }
    if (vehicle.type === 'cruiser') {
      ctx.save();
      ctx.translate(vehicle.x, vehicle.y);
      ctx.rotate(vehicle.angle);
      const flash = Math.floor(vehicle.sirenPhase * 6) % 2 === 0;
      ctx.fillStyle = flash ? '#4f9cff' : '#374b70';
      ctx.fillRect(-9, -4, 8, 8);
      ctx.fillStyle = flash ? '#7a3040' : '#e05050';
      ctx.fillRect(1, -4, 8, 8);
      ctx.restore();
    }
  }
}
