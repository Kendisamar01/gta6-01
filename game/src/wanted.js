import { notify } from './world.js';

const THRESHOLDS = [0, 13, 34, 62, 100, 148];
const CRIME_BASE = {
  crash: 2,
  jack: 12,
  hitCar: 8,
  kill: 16,
  copKill: 26,
  shooting: 4,
  assault: 6,
  chase: 8,
};

export function addCrime(world, type, severity = 1) {
  const gain = (CRIME_BASE[type] ?? 6) * severity;
  world.heat += gain;
  world.crimeTimer = Math.max(world.crimeTimer, 12);
  while (world.wanted < 5 && world.heat >= THRESHOLDS[world.wanted + 1]) {
    world.wanted += 1;
    notify(world, `${world.wanted} star${world.wanted === 1 ? '' : 's'} — heat is on`, 'warn');
    world.events.push({ type: 'wanted', stars: world.wanted });
  }
}

export function clearWanted(world, reason = 'Heat cleared') {
  if (world.wanted === 0) return false;
  world.wanted = 0;
  world.heat = 0;
  world.hiddenTimer = 0;
  world.crimeTimer = 0;
  notify(world, reason, 'good');
  world.events.push({ type: 'wanted', stars: 0 });
  return true;
}

function nearestPolice(world) {
  let nearest = Infinity;
  for (const car of world.vehicles) {
    if (car.dead || car.role !== 'police') continue;
    nearest = Math.min(nearest, Math.hypot(car.x - world.player.x, car.y - world.player.y));
  }
  for (const ped of world.peds) {
    if (ped.dead || ped.role !== 'cop') continue;
    nearest = Math.min(nearest, Math.hypot(ped.x - world.player.x, ped.y - world.player.y));
  }
  return nearest;
}

export function update(world, dt) {
  world.crimeTimer = Math.max(0, world.crimeTimer - dt);
  if (world.wanted === 0) {
    world.heat = Math.max(0, world.heat - dt * 4);
    return;
  }
  const distance = nearestPolice(world);
  const hidden = distance > 310;
  if (hidden) {
    world.hiddenTimer += dt;
    world.heat -= dt * (world.hiddenTimer > 2 ? 6.5 : 2.5);
  } else {
    world.hiddenTimer = 0;
    world.heat = Math.max(world.heat, THRESHOLDS[world.wanted] + 2);
    world.heat -= dt * 0.4;
  }
  if (world.hiddenTimer > 2.5 && world.heat < THRESHOLDS[world.wanted] - 4) {
    world.wanted -= 1;
    world.hiddenTimer = 0;
    world.heat = Math.max(0, world.heat - 3);
    notify(world, `${world.wanted} star${world.wanted === 1 ? '' : 's'} remaining`, 'good');
    world.events.push({ type: 'wanted', stars: world.wanted });
  }
  world.heat = Math.max(0, world.heat);
}
