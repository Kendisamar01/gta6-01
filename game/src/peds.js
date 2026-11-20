import { COLORS } from './config.js';
import { blockAt, lineBlocked, resolveCircle, sidewalkPoint } from './city.js';
import { clamp, pick, range } from './random.js';
import { emit } from './effects.js';

const COMPLEXIONS = ['#d7a47c', '#b87851', '#8c5a40', '#e6bd93', '#6f4a38'];
const CASUAL_SHIRTS = ['#d95b52', '#4f86b5', '#e8b949', '#5f9c78', '#8c6bb0', '#e4e0d2', '#3f4c57'];

export function spawnPed(world, x, y, mode = 'walk', type = 'ped') {
  if (world.peds.length >= 90) return null;
  let hp = 38;
  if (type === 'enemy') hp = 62;
  if (type === 'police') hp = 58;
  const ped = {
    id: world.nextId++,
    x,
    y,
    angle: world.random() * Math.PI * 2,
    speed: range(world.random, 46, 76),
    hp,
    maxHp: hp,
    mode,
    type,
    target: sidewalkPoint(world.city, world.random),
    fleeTimer: range(world.random, 3, 6),
    fleeX: x,
    fleeY: y,
    shootCooldown: range(world.random, 0.6, 1.8),
    skin: pick(world.random, COMPLEXIONS),
    shirt: type === 'enemy' ? '#8e3f42' : type === 'police' ? '#2d3e63' : pick(world.random, CASUAL_SHIRTS),
    stepHint: world.random() * 100,
    alive: true,
  };
  world.peds.push(ped);
  return ped;
}

export function maintainPeds(world) {
  let civilians = 0;
  for (const ped of world.peds) {
    if (ped.alive && ped.type === 'ped') civilians += 1;
  }
  for (let i = civilians; i < 46; i += 1) {
    const spot = sidewalkPoint(world.city, world.random);
    spawnPed(world, spot.x, spot.y);
  }
}

export function alertPeds(world, x, y, radius = 260) {
  for (const ped of world.peds) {
    if (!ped.alive || ped.type === 'enemy' || ped.type === 'police') continue;
    const away = Math.hypot(ped.x - x, ped.y - y);
    if (away > radius) continue;
    ped.mode = 'flee';
    ped.fleeTimer = Math.max(ped.fleeTimer, 3.5);
    const direction = Math.atan2(ped.y - y, ped.x - x) + range(world.random, -0.5, 0.5);
    ped.fleeX = ped.x + Math.cos(direction) * 200;
    ped.fleeY = ped.y + Math.sin(direction) * 200;
  }
}

export function damagePed(world, ped, amount, source = null) {
  if (!ped.alive) return;
  ped.hp -= amount;
  emit(world, 'blood', ped.x, ped.y, 3, { spread: 1.2, size: 2.8, life: 0.45, color: '#a84949' });

  if (ped.hp > 0) {
    ped.mode = 'flee';
    ped.fleeTimer = 4;
    const fromX = Number.isFinite(source?.x) ? source.x : ped.x - 100;
    const fromY = Number.isFinite(source?.y) ? source.y : ped.y;
    const away = Math.atan2(ped.y - fromY, ped.x - fromX);
    ped.fleeX = ped.x + Math.cos(away) * 180;
    ped.fleeY = ped.y + Math.sin(away) * 180;
    return;
  }

  ped.alive = false;
  emit(world, 'blood', ped.x, ped.y, 7, { spread: 2, size: 3.6, life: 0.8, color: '#9c3f42' });
  const index = world.peds.indexOf(ped);
  if (index !== -1) world.peds.splice(index, 1);
  if (source?.type === 'player' || source?.owner === 'player') {
    world.reportCrime(ped.type === 'ped' ? 18 : 26, 'Homicide');
    world.onPedKilled(ped);
  }
}

function chooseTarget(world, ped) {
  const block = blockAt(world.city, ped.x, ped.y);
  if (block === null) {
    ped.target = sidewalkPoint(world.city, world.random);
    return;
  }
  const side = Math.floor(world.random() * 4);
  const along = range(world.random, 10, block.size - 10);
  if (side === 0) ped.target = { x: block.x + along, y: block.y - 10 };
  else if (side === 1) ped.target = { x: block.x + block.size + 10, y: block.y + along };
  else if (side === 2) ped.target = { x: block.x + along, y: block.y + block.size + 10 };
  else ped.target = { x: block.x - 10, y: block.y + along };
}

function updatePed(world, ped, dt) {
  ped.stepHint += dt;
  ped.shootCooldown -= dt;
  let speed = ped.speed;
  let targetX = ped.target.x;
  let targetY = ped.target.y;

  if (ped.mode === 'flee') {
    ped.fleeTimer -= dt;
    targetX = ped.fleeX;
    targetY = ped.fleeY;
    speed = 138;
    if (ped.fleeTimer <= 0 && Math.hypot(targetX - ped.x, targetY - ped.y) < 40) {
      ped.mode = 'walk';
      chooseTarget(world, ped);
    }
  } else if (Math.hypot(targetX - ped.x, targetY - ped.y) < 10) {
    chooseTarget(world, ped);
  }

  const dx = targetX - ped.x;
  const dy = targetY - ped.y;
  const length = Math.hypot(dx, dy) || 1;
  ped.angle = Math.atan2(dy, dx);
  const next = resolveCircle(world.city, ped.x + dx / length * speed * dt, ped.y + dy / length * speed * dt, 6);
  if (next.hit && ped.mode !== 'flee') chooseTarget(world, ped);
  ped.x = next.x;
  ped.y = next.y;

  const armed = ped.type === 'enemy' || (ped.type === 'police' && world.wanted.level >= 2);
  if (!armed || ped.shootCooldown > 0) return;
  const player = world.player;
  const away = Math.hypot(player.x - ped.x, player.y - ped.y);
  if (away > 470 || lineBlocked(world.city, ped.x, ped.y, player.x, player.y)) return;

  ped.shootCooldown = range(world.random, 0.9, 1.7);
  const angle = Math.atan2(player.y - ped.y, player.x - ped.x) + range(world.random, -0.1, 0.1);
  const muzzleX = ped.x + Math.cos(angle) * 12;
  const muzzleY = ped.y + Math.sin(angle) * 12;
  world.fireBullet({
    x: muzzleX,
    y: muzzleY,
    vx: Math.cos(angle) * 460,
    vy: Math.sin(angle) * 460,
    owner: ped.type === 'police' ? 'police' : 'enemy',
    damage: ped.type === 'police' ? 9 : 12,
    life: 1.3,
  });
  emit(world, 'muzzle', muzzleX, muzzleY, 2, {
    spread: 0.4, angle, color: COLORS.gold, size: 3, life: 0.1,
  });
  world.sfx('gunshot', 0.35);
}

export function updatePeds(world, dt) {
  world.pedTimer -= dt;
  if (world.pedTimer <= 0) {
    world.pedTimer = 1.4;
    maintainPeds(world);
  }
  for (const ped of world.peds) updatePed(world, ped, dt);
  resolvePedVehicleCollisions(world);
}

export function resolvePedVehicleCollisions(world) {
  for (const car of world.vehicles) {
    if (!car.alive || Math.abs(car.speed) < 36) continue;
    for (const ped of world.peds) {
      if (!ped.alive || Math.hypot(ped.x - car.x, ped.y - car.y) > 22) continue;
      alertPeds(world, ped.x, ped.y, 120);
      damagePed(world, ped, Math.abs(car.speed) * 0.42, {
        type: car.driver?.type === 'player' ? 'player' : 'car',
        x: car.x,
        y: car.y,
      });
      if (car.driver?.type === 'player') {
        world.reportCrime(20, 'Hit and run');
        world.camera.shake = Math.min(16, world.camera.shake + 4);
      }
      car.speed *= 0.88;
      break;
    }
  }
}

export function pedInFront(world, x, y, angle, rangeLimit = 46) {
  let best = null;
  let bestDistance = rangeLimit;
  for (const ped of world.peds) {
    if (!ped.alive) continue;
    const dx = ped.x - x;
    const dy = ped.y - y;
    const away = Math.hypot(dx, dy);
    if (away > bestDistance) continue;
    const difference = Math.abs(((Math.atan2(dy, dx) - angle + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
    if (difference > 0.9) continue;
    best = ped;
    bestDistance = away;
  }
  return best;
}

export function spawnEnemySquad(world, x, y, count = 4) {
  for (let i = 0; i < count; i += 1) {
    const angle = (i / count) * Math.PI * 2;
    const ped = spawnPed(
      world,
      x + Math.cos(angle) * range(world.random, 40, 90),
      y + Math.sin(angle) * range(world.random, 40, 90),
      'walk',
      'enemy',
    );
    if (ped) ped.shootCooldown = range(world.random, 0.4, 1.4);
  }
}

export function clearEnemies(world) {
  for (let i = world.peds.length - 1; i >= 0; i -= 1) {
    if (world.peds[i].type === 'enemy') world.peds.splice(i, 1);
  }
}
