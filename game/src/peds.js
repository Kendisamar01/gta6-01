import { moveWithCollision } from './city.js';
import { addCrime } from './wanted.js';
import { notify } from './world.js';

export function spawnPed(world, x, y, role = 'civilian') {
  const ped = {
    x,
    y,
    angle: world.random() * Math.PI * 2,
    vx: 0,
    vy: 0,
    speed: 0,
    anim: world.random() * 6,
    turn: 0,
    health: role === 'cop' ? 95 : 55,
    flee: 0,
    moving: true,
    skin: Math.floor(world.random() * 6),
    role,
    armed: role === 'cop',
    dead: false,
    fade: 1,
    goal: world.random() * 2,
  };
  world.peds.push(ped);
  return ped;
}

export function populate(world) {
  const spots = world.city.pedSpawns;
  for (let index = 0; index < spots.length; index += 2) {
    const spot = spots[index];
    spawnPed(world, spot.x, spot.y);
  }
}

export function hurtPed(world, ped, amount, api, cause = 'hit') {
  if (ped.dead) return;
  ped.health -= amount;
  ped.flee = 8;
  world.events.push({ type: 'impact', x: ped.x, y: ped.y, cause });
  if (ped.health <= 0) {
    ped.dead = true;
    ped.fade = 1;
    world.stats.kills += 1;
    world.events.push({ type: 'down', x: ped.x, y: ped.y, role: ped.role });
    if (ped.role === 'cop') addCrime(world, 'copKill', 1.9);
    else addCrime(world, 'kill', 1.2);
    if (api) api.notify(world.muted ? '' : 'Witness down', 'warn');
  }
}

function fleeFrom(world, ped, x, y, dt) {
  const dx = ped.x - x;
  const dy = ped.y - y;
  const length = Math.hypot(dx, dy) || 1;
  const angle = Math.atan2(dy, dx);
  ped.angle = angle;
  const speed = 215;
  const beforeX = ped.x;
  const beforeY = ped.y;
  moveWithCollision(world.city, ped, Math.cos(angle) * speed * dt, Math.sin(angle) * speed * dt, 9);
  if (Math.abs(ped.x - beforeX) + Math.abs(ped.y - beforeY) < 1) {
    ped.angle += 1.1;
    moveWithCollision(world.city, ped, Math.cos(ped.angle) * speed * dt, Math.sin(ped.angle) * speed * dt, 9);
  }
  ped.speed = speed;
}

export function update(world, dt, api) {
  const shots = world.events.filter((event) => event.type === 'shot' || event.type === 'explosion');
  for (let index = world.peds.length - 1; index >= 0; index -= 1) {
    const ped = world.peds[index];
    ped.anim += dt;
    if (ped.dead) {
      ped.fade -= dt * 0.22;
      if (ped.fade <= 0 && ped.role !== 'cop') world.peds.splice(index, 1);
      continue;
    }
    for (const shot of shots) {
      if (Math.hypot(ped.x - shot.x, ped.y - shot.y) < 260) ped.flee = Math.max(ped.flee, 7);
    }
    for (const car of world.vehicles) {
      if (car.dead || Math.abs(car.speed || 0) < 45) continue;
      const distance = Math.hypot(car.x - ped.x, car.y - ped.y);
      if (distance < 52) {
        ped.flee = Math.max(ped.flee, 8);
        if (distance < 24) {
          hurtPed(world, ped, 26 + Math.abs(car.speed) * 0.28, api, 'car');
          car.speed *= 0.86;
          addCrime(world, 'hitCar', 0.6);
        }
      }
    }
    if (ped.flee > 0) {
      ped.flee -= dt;
      const threat = world.player;
      const playerDistance = Math.hypot(threat.x - ped.x, threat.y - ped.y);
      fleeFrom(world, ped, playerDistance < 220 ? threat.x : ped.x + Math.cos(ped.angle) * 100,
        playerDistance < 220 ? threat.y : ped.y + Math.sin(ped.angle) * 100, dt);
      continue;
    }
    ped.turn -= dt;
    if (ped.turn <= 0) {
      ped.turn = 1.2 + world.random() * 2.8;
      ped.angle += (world.random() - 0.5) * 1.5;
    }
    const speed = 48 + ped.goal * 18;
    const beforeX = ped.x;
    const beforeY = ped.y;
    moveWithCollision(world.city, ped, Math.cos(ped.angle) * speed * dt, Math.sin(ped.angle) * speed * dt, 9);
    if (Math.abs(ped.x - beforeX) + Math.abs(ped.y - beforeY) < 0.6) ped.angle += 1.4;
    ped.speed = speed;
    ped.moving = true;
  }
}
