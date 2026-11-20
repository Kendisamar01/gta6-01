import { blockAt, clampWorld, solidsNear } from './city.js';
import { drawPed } from './entity-render.js';
import { between, pick } from './random.js';
import { angleDelta, circleTouchesRect, clamp, distance } from './util.js';

const SHIRTS = ['#8d6aa5', '#4c9c93', '#c36e63', '#d1a24d', '#7486b8', '#b77393', '#6b9a5d', '#d7d2c2'];
const WALK_SPEED = 74;

export function createPedSystem(api) {
  const { state, rng } = api;
  const city = state.city;
  const list = [];

  function sidewalkPoint(block) {
    const inset = city.road / 2 + 8;
    const span = city.cell - city.road - 16;
    const along = between(rng, 12, Math.max(16, span - 12));
    const side = Math.floor(rng() * 4);
    if (side === 0) return { x: block.x + inset + along, y: block.y + inset };
    if (side === 1) return { x: block.x + city.cell - inset, y: block.y + inset + along };
    if (side === 2) return { x: block.x + inset + along, y: block.y + city.cell - inset };
    return { x: block.x + inset, y: block.y + inset + along };
  }

  function freePoint(x, y) {
    const spot = clampWorld(city, x, y, 11);
    for (const solid of solidsNear(city, spot.x, spot.y, 14)) {
      if (circleTouchesRect(spot.x, spot.y, 11, solid)) return null;
    }
    return spot;
  }

  function spawnPed(x, y, options = {}) {
    const ped = {
      kind: 'ped',
      x,
      y,
      angle: rng() * Math.PI * 2,
      step: rng() * 6,
      moving: false,
      speed: between(rng, 0.8, 1.25),
      color: options.color || pick(rng, SHIRTS),
      health: options.health || 40,
      maxHealth: options.health || 40,
      behavior: options.behavior || 'walker',
      fear: 0,
      threat: null,
      target: null,
      hitFlash: 0,
      lastHit: -10,
      cooldown: between(rng, 0.4, 2),
      tag: options.tag || null,
      dead: false,
    };
    list.push(ped);
    return ped;
  }

  function reset() {
    list.length = 0;
    for (const block of city.blocks) {
      if (rng() > 0.46) continue;
      const point = sidewalkPoint(block);
      spawnPed(point.x, point.y);
    }
  }

  function chooseTarget(ped) {
    let block = blockAt(city, ped.x, ped.y);
    if (!block && ped.target) block = blockAt(city, ped.target.x, ped.target.y);
    if (!block) {
      ped.target = { x: clamp(ped.x, 40, city.width - 40), y: clamp(ped.y, 40, city.shoreY - 40) };
      return;
    }
    const point = sidewalkPoint(block);
    ped.target = freePoint(point.x, point.y) || point;
  }

  function alert(x, y, radius) {
    for (const ped of list) {
      if (ped.dead) continue;
      if (distance(ped.x, ped.y, x, y) > radius) continue;
      ped.fear = 3.6;
      ped.threat = { x, y };
      chooseTarget(ped);
    }
  }

  function eject(driver, vehicle) {
    if (!driver || driver.kind !== 'ped' || driver.dead) return;
    const side = vehicle.angle + Math.PI / 2;
    const offset = vehicle.width + 14;
    const spot = freePoint(vehicle.x + Math.cos(side) * offset, vehicle.y + Math.sin(side) * offset);
    if (spot) {
      driver.x = spot.x;
      driver.y = spot.y;
    }
    driver.fear = 5;
    driver.threat = { x: vehicle.x, y: vehicle.y };
    driver.target = null;
    driver.moving = true;
    vehicle.driver = null;
  }

  function spawnEnemy(x, y, tag = null) {
    const ped = spawnPed(x, y, { color: '#b4504c', health: 70, behavior: 'enemy', tag });
    ped.fear = 0;
    return ped;
  }

  function spawnOfficer(x, y) {
    const ped = spawnPed(x, y, { color: '#3a5e96', health: 90, behavior: 'police' });
    ped.fear = 0;
    return ped;
  }

  function damage(ped, amount, cause = 'bullet') {
    if (ped.dead || amount <= 0 || state.elapsed - ped.lastHit < 0.08) return;
    ped.lastHit = state.elapsed;
    ped.health -= amount;
    ped.hitFlash = 0.16;
    const fx = state.systems && state.systems.effects;
    if (fx) fx.blood(ped.x, ped.y, 5);
    ped.fear = 4;
    ped.threat = { x: state.player.x, y: state.player.y };
    if (ped.health > 0) return;
    ped.dead = true;
    if (fx) fx.blood(ped.x, ped.y, 12);
    const missions = state.systems && state.systems.missions;
    if (missions) missions.onKill(ped);
    if (ped.behavior === 'enemy') {
      state.respect += 2;
    } else if (cause === 'bullet' || cause === 'car') {
      const wanted = state.systems && state.systems.wanted;
      if (wanted) wanted.add('kill');
    }
  }

  function enemyFire(ped, dt) {
    ped.cooldown -= dt;
    if (ped.cooldown > 0) return;
    const target = state.player.inVehicle ? state.systems.vehicles.playerVehicle() : state.player;
    if (!target) return;
    const gap = distance(ped.x, ped.y, target.x, target.y);
    if (gap > 430) return;
    ped.cooldown = between(rng, 0.85, 1.7);
    ped.angle = Math.atan2(target.y - ped.y, target.x - ped.x);
    const combat = state.systems && state.systems.combat;
    if (combat) combat.spawnBullet(ped.x, ped.y, ped.angle + between(rng, -0.08, 0.08), 520, 'enemy', 9);
    const audio = state.systems && state.systems.audio;
    if (audio) audio.gunshot(0.6);
  }

  function policeApproach(ped, dt) {
    const vehicles = state.systems && state.systems.vehicles;
    if (!vehicles) return;
    const car = vehicles.playerVehicle();
    const target = car || state.player;
    const gap = distance(ped.x, ped.y, target.x, target.y);
    ped.cooldown -= dt;
    if (gap < 26 && state.wantedStars > 0) {
      state.busted = true;
      return;
    }
    if (ped.cooldown > 0 || gap > 420) return;
    ped.cooldown = between(rng, 1, 2);
    ped.angle = Math.atan2(target.y - ped.y, target.x - ped.x);
    const combat = state.systems && state.systems.combat;
    if (combat && state.wantedStars >= 3) combat.spawnBullet(ped.x, ped.y, ped.angle, 500, 'police', 8);
  }

  function step(dt) {
    const vehicles = state.systems && state.systems.vehicles;
    for (const ped of list) {
      if (ped.dead) continue;
      ped.hitFlash = Math.max(0, ped.hitFlash - dt);
      if (ped.behavior === 'enemy') enemyFire(ped, dt);
      if (ped.behavior === 'police') {
        policeApproach(ped, dt);
        if (state.busted) continue;
      }
      for (const vehicle of vehicles ? vehicles.list : []) {
        if (vehicle.dead || Math.abs(vehicle.speed) < 70) continue;
        if (distance(ped.x, ped.y, vehicle.x, vehicle.y) > 48) continue;
        ped.fear = Math.max(ped.fear, 2.6);
        ped.threat = { x: vehicle.x, y: vehicle.y };
        if (distance(ped.x, ped.y, vehicle.x, vehicle.y) < 28) {
          damage(ped, Math.abs(vehicle.speed) * 0.32, 'car');
          vehicle.speed *= 0.78;
          const wanted = state.systems && state.systems.wanted;
          if (wanted && vehicle.occupiedBy === 'player') wanted.add('ped');
        }
      }
      let directionX = 0;
      let directionY = 0;
      let speed = WALK_SPEED * ped.speed;
      if (ped.fear > 0) {
        ped.fear -= dt;
        if (ped.threat) {
          directionX = ped.x - ped.threat.x;
          directionY = ped.y - ped.threat.y;
          speed *= 3.05;
        }
      } else {
        if (!ped.target || distance(ped.x, ped.y, ped.target.x, ped.target.y) < 14) chooseTarget(ped);
        if (ped.target) {
          directionX = ped.target.x - ped.x;
          directionY = ped.target.y - ped.y;
        }
      }
      const length = Math.hypot(directionX, directionY);
      if (length < 1) {
        ped.moving = false;
        continue;
      }
      directionX /= length;
      directionY /= length;
      const facing = Math.atan2(directionY, directionX);
      const turn = clamp(angleDelta(ped.angle, facing), -5 * dt, 5 * dt);
      ped.angle += turn;
      const nx = ped.x + Math.cos(ped.angle) * speed * dt;
      const ny = ped.y + Math.sin(ped.angle) * speed * dt;
      const spot = freePoint(nx, ny);
      if (spot) {
        ped.x = spot.x;
        ped.y = spot.y;
        ped.moving = true;
        ped.step += dt * (ped.fear > 0 ? 16 : 8);
      } else {
        ped.moving = false;
        chooseTarget(ped);
        ped.angle += 1.2;
      }
    }
    for (let index = list.length - 1; index >= 0; index -= 1) {
      if (list[index].dead) list.splice(index, 1);
    }
  }

  function nearest(x, y, radius, filter) {
    let found = null;
    let best = radius * radius;
    for (const ped of list) {
      if (ped.dead || (filter && !filter(ped))) continue;
      const dx = ped.x - x;
      const dy = ped.y - y;
      const squared = dx * dx + dy * dy;
      if (squared < best) {
        best = squared;
        found = ped;
      }
    }
    return found;
  }

  return { list, reset, step, spawnPed, spawnEnemy, spawnOfficer, damage, alert, eject, nearest };
}

export function draw(ctx, state) {
  const system = state.systems && state.systems.peds;
  if (!system) return;
  for (const ped of system.list) {
    if (ped.dead) continue;
    drawPed(ctx, ped, state.environment.state);
    if (ped.hitFlash > 0) {
      ctx.fillStyle = `rgba(240, 90, 76, ${(ped.hitFlash / 0.16 * 0.6).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(ped.x, ped.y - 2, 11, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
