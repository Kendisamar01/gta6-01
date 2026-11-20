import { PALETTE } from './config.js';
import { blockUnder, clearOfBuildings, rayBlocked, walkSample } from './city.js';
import { between, choose } from './random.js';
import { spray } from './effects.js';

const SKIN_TONES = ['#d7a47c', '#b87851', '#8c5a40', '#e6bd93', '#6f4a38'];
const SHIRTS = ['#d95b52', '#4f86b5', '#e8b949', '#5f9c78', '#8c6bb0', '#e4e0d2', '#3f4c57'];

export function newPed(world, x, y, posture = 'walk', type = 'civilian') {
  if (world.peds.length >= 90) return null;
  let hp = 38;
  if (type === 'enemy') hp = 62;
  if (type === 'officer') hp = 58;
  const person = {
    id: world.nextId++,
    x, y,
    facing: world.rng() * Math.PI * 2,
    pace: between(world.rng, 46, 76),
    hp,
    maxHp: hp,
    posture,
    type,
    destination: walkSample(world.city, world.rng),
    panicClock: between(world.rng, 3, 6),
    escapeX: x,
    escapeY: y,
    fireClock: between(world.rng, 0.6, 1.8),
    skin: choose(world.rng, SKIN_TONES),
    shirt: type === 'enemy' ? '#8e3f42' : type === 'officer' ? '#2d3e63' : choose(world.rng, SHIRTS),
    gait: world.rng() * 100,
    alive: true,
  };
  world.peds.push(person);
  return person;
}

export function keepPeds(world) {
  const civilians = world.peds.filter((person) => person.alive && person.type === 'civilian').length;
  for (let i = civilians; i < 46; i += 1) {
    const spot = walkSample(world.city, world.rng);
    newPed(world, spot.x, spot.y);
  }
}

export function panicNear(world, x, y, radius = 260) {
  for (const person of world.peds) {
    if (!person.alive || person.type === 'enemy' || person.type === 'officer') continue;
    if (Math.hypot(person.x - x, person.y - y) > radius) continue;
    person.posture = 'flee';
    person.panicClock = Math.max(person.panicClock, 3.5);
    const angle = Math.atan2(person.y - y, person.x - x) + between(world.rng, -0.5, 0.5);
    person.escapeX = person.x + Math.cos(angle) * 200;
    person.escapeY = person.y + Math.sin(angle) * 200;
  }
}

export function hurtPerson(world, person, amount, source = null) {
  if (!person.alive) return;
  person.hp -= amount;
  spray(world, 'blood', person.x, person.y, 3, {
    scatter: 1.2, size: 2.8, life: 0.45, color: '#a84949',
  });

  if (person.hp > 0) {
    person.posture = 'flee';
    person.panicClock = 4;
    const fromX = Number.isFinite(source?.x) ? source.x : person.x - 100;
    const fromY = Number.isFinite(source?.y) ? source.y : person.y;
    const angle = Math.atan2(person.y - fromY, person.x - fromX);
    person.escapeX = person.x + Math.cos(angle) * 180;
    person.escapeY = person.y + Math.sin(angle) * 180;
    return;
  }

  person.alive = false;
  spray(world, 'blood', person.x, person.y, 7, {
    scatter: 2, size: 3.6, life: 0.8, color: '#9c3f42',
  });
  const index = world.peds.indexOf(person);
  if (index !== -1) world.peds.splice(index, 1);
  if (source?.type === 'player' || source?.owner === 'player') {
    world.crime(person.type === 'civilian' ? 18 : 26, 'Homicide');
    world.personDown(person);
  }
}

function pickDestination(world, person) {
  const plot = blockUnder(world.city, person.x, person.y);
  if (plot === null) {
    person.destination = walkSample(world.city, world.rng);
    return;
  }
  const side = Math.floor(world.rng() * 4);
  const along = between(world.rng, 10, plot.size - 10);
  if (side === 0) person.destination = { x: plot.x + along, y: plot.y - 10 };
  else if (side === 1) person.destination = { x: plot.x + plot.size + 10, y: plot.y + along };
  else if (side === 2) person.destination = { x: plot.x + along, y: plot.y + plot.size + 10 };
  else person.destination = { x: plot.x - 10, y: plot.y + along };
}

function shootAtPlayer(world, person) {
  const armed = person.type === 'enemy' || (person.type === 'officer' && world.wanted.stars >= 2);
  if (!armed || person.fireClock > 0) return;
  const player = world.player;
  if (Math.hypot(player.x - person.x, player.y - person.y) > 470
    || rayBlocked(world.city, person.x, person.y, player.x, player.y)) return;

  person.fireClock = between(world.rng, 0.9, 1.7);
  const angle = Math.atan2(player.y - person.y, person.x - person.x) + between(world.rng, -0.1, 0.1);
  const muzzleX = person.x + Math.cos(angle) * 12;
  const muzzleY = person.y + Math.sin(angle) * 12;
  world.shoot({
    x: muzzleX, y: muzzleY,
    vx: Math.cos(angle) * 460, vy: Math.sin(angle) * 460,
    owner: person.type === 'officer' ? 'police' : 'enemy',
    damage: person.type === 'officer' ? 9 : 12,
    life: 1.3,
  });
  spray(world, 'muzzle', muzzleX, muzzleY, 2, {
    scatter: 0.4, angle, color: PALETTE.amber, size: 3, life: 0.1,
  });
  world.sound('gunshot', 0.35);
}

function stepPerson(world, person, dt) {
  person.gait += dt;
  person.fireClock -= dt;
  let pace = person.pace;
  let targetX = person.destination.x;
  let targetY = person.destination.y;

  if (person.posture === 'flee') {
    person.panicClock -= dt;
    targetX = person.escapeX;
    targetY = person.escapeY;
    pace = 138;
    if (person.panicClock <= 0 && Math.hypot(targetX - person.x, targetY - person.y) < 40) {
      person.posture = 'walk';
      pickDestination(world, person);
    }
  } else if (Math.hypot(targetX - person.x, targetY - person.y) < 10) {
    pickDestination(world, person);
  }

  const dx = targetX - person.x;
  const dy = targetY - person.y;
  const span = Math.hypot(dx, dy) || 1;
  person.facing = Math.atan2(dy, dx);
  const landing = clearOfBuildings(
    world.city,
    person.x + dx / span * pace * dt,
    person.y + dy / span * pace * dt,
    6,
  );
  if (landing.hit && person.posture !== 'flee') pickDestination(world, person);
  person.x = landing.x;
  person.y = landing.y;
  shootAtPlayer(world, person);
}

function peopleVersusCars(world) {
  for (const car of world.vehicles) {
    if (!car.alive || Math.abs(car.velocity) < 36) continue;
    for (const person of world.peds) {
      if (!person.alive || Math.hypot(person.x - car.x, person.y - car.y) > 22) continue;
      panicNear(world, person.x, person.y, 120);
      hurtPerson(world, person, Math.abs(car.velocity) * 0.42, {
        type: car.driver?.type === 'player' ? 'player' : 'car',
        x: car.x, y: car.y,
      });
      if (car.driver?.type === 'player') {
        world.crime(20, 'Hit and run');
        world.camera.tremor = Math.min(16, world.camera.tremor + 4);
      }
      car.velocity *= 0.88;
      break;
    }
  }
}

export function movePeople(world, dt) {
  world.pedClock -= dt;
  if (world.pedClock <= 0) {
    world.pedClock = 1.4;
    keepPeds(world);
  }
  for (const person of world.peds) stepPerson(world, person, dt);
  peopleVersusCars(world);
}

export function personAhead(world, x, y, angle, reach = 46) {
  let best = null;
  let bestGap = reach;
  for (const person of world.peds) {
    if (!person.alive) continue;
    const dx = person.x - x;
    const dy = person.y - y;
    const away = Math.hypot(dx, dy);
    if (away > bestGap) continue;
    const difference = Math.abs(((Math.atan2(dy, dx) - angle + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
    if (difference > 0.9) continue;
    best = person;
    bestGap = away;
  }
  return best;
}

export function makeSquad(world, x, y, count = 4) {
  for (let i = 0; i < count; i += 1) {
    const angle = (i / count) * Math.PI * 2;
    const person = newPed(
      world,
      x + Math.cos(angle) * between(world.rng, 40, 90),
      y + Math.sin(angle) * between(world.rng, 40, 90),
      'walk',
      'enemy',
    );
    if (person) person.fireClock = between(world.rng, 0.4, 1.4);
  }
}

export function clearSquads(world) {
  for (let i = world.peds.length - 1; i >= 0; i -= 1) {
    if (world.peds[i].type === 'enemy') world.peds.splice(i, 1);
  }
}
