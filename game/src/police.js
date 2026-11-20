import { FIELD } from './config.js';
import { clampWorld } from './city.js';
import { between } from './random.js';
import { angleDelta, clamp, distance } from './util.js';

const FLEET = [0, 2, 3, 5, 7, 9];

export function createPoliceSystem(api) {
  const { state, rng } = api;
  const city = state.city;
  const units = [];

  function stars() {
    return Math.max(0, Math.min(5, Math.floor(state.wantedStars || 0)));
  }

  function roadSpot(x, y) {
    const col = Math.round(clamp(x, city.cell, city.width - city.cell) / city.cell);
    const row = Math.round(clamp(y, city.cell, city.shoreY - city.cell) / city.cell);
    const vertical = rng() < 0.5;
    const point = vertical
      ? { x: col * city.cell, y: row * city.cell + between(rng, -city.cell * 0.2, city.cell * 0.2) }
      : { x: col * city.cell + between(rng, -city.cell * 0.2, city.cell * 0.2), y: row * city.cell };
    const safe = clampWorld(city, point.x, point.y, 50);
    return { x: safe.x, y: safe.y };
  }

  function createUnit(x, y, angle, roadblock = false) {
    const vehicle = state.systems.vehicles.spawn('cruiser', x, y, angle);
    vehicle.police = true;
    vehicle.siren = true;
    vehicle.aiInput = { throttle: 0, steer: 0, brake: true };
    const unit = { vehicle, roadblock, fireTimer: between(rng, 0.5, 2), officerTimer: 1.5 };
    units.push(unit);
    return unit;
  }

  function reset() {
    units.length = 0;
    for (let index = 0; index < 3; index += 1) {
      const angle = index * 2.1;
      const point = roadSpot(
        state.player.x + Math.cos(angle) * 900,
        state.player.y + Math.sin(angle) * 900,
      );
      const unit = createUnit(point.x, point.y, angle, false);
      state.systems.traffic.assign(unit.vehicle, rng() < 0.5 ? 'v' : 'h', rng() < 0.5 ? 1 : -1);
    }
  }

  function ensureFleet() {
    const wanted = stars();
    const target = FLEET[wanted];
    const active = units.filter((unit) => !unit.vehicle.dead).length;
    const player = state.player;
    for (let index = active; index < target; index += 1) {
      const angle = rng() * Math.PI * 2;
      const point = roadSpot(
        player.x + Math.cos(angle) * between(rng, 620, 1050),
        player.y + Math.sin(angle) * between(rng, 620, 1050),
      );
      createUnit(point.x, point.y, angle, false);
    }
    if (wanted === 0 && active > 3) {
      for (let index = units.length - 1; index >= 0 && units.length > 3; index -= 1) {
        if (units[index].vehicle.dead || distance(units[index].vehicle.x, units[index].vehicle.y, player.x, player.y) > 900) {
          units[index].vehicle.dead = true;
          units.splice(index, 1);
        }
      }
    }
  }

  function buildRoadblock() {
    if (stars() < 3) return;
    const blocks = units.filter((unit) => unit.roadblock && !unit.vehicle.dead).length;
    if (blocks >= (stars() >= 4 ? 3 : 1)) return;
    const car = state.systems.vehicles.playerVehicle();
    const angle = car ? car.angle : state.player.angle;
    const aheadX = state.player.x + Math.cos(angle) * 760;
    const aheadY = state.player.y + Math.sin(angle) * 760;
    const horizontal = Math.abs(Math.cos(angle)) > Math.abs(Math.sin(angle));
    const center = roadSpot(aheadX, aheadY);
    const lane = city.road * 0.3;
    for (let index = -1; index <= 1; index += 2) {
      const x = horizontal ? center.x : center.x + index * lane;
      const y = horizontal ? center.y + index * lane : center.y;
      const unit = createUnit(x, y, horizontal ? Math.PI / 2 : 0, true);
      unit.vehicle.speed = 0;
    }
  }

  function deployOfficer(unit, target) {
    if (stars() < 2) return;
    if (unit.officerTimer > 0) return;
    const gap = distance(unit.vehicle.x, unit.vehicle.y, state.player.x, state.player.y);
    if (gap > 190) return;
    unit.officerTimer = 8;
    const side = unit.vehicle.angle + Math.PI / 2;
    const offset = unit.vehicle.width + 14;
    const spot = state.systems.vehicles.freePoint(
      unit.vehicle.x + Math.cos(side) * offset,
      unit.vehicle.y + Math.sin(side) * offset,
      11,
    );
    if (spot) state.systems.peds.spawnOfficer(spot.x, spot.y);
  }

  function pursue(unit, dt, target) {
    const vehicle = unit.vehicle;
    const wanted = stars();
    const gap = distance(vehicle.x, vehicle.y, target.x, target.y);
    const desired = Math.atan2(target.y - vehicle.y, target.x - vehicle.x);
    const delta = angleDelta(vehicle.angle, desired);
    vehicle.aiInput = {
      throttle: gap < 68 && !state.player.inVehicle ? -0.4 : Math.abs(delta) > 1.3 ? 0.24 : 0.95,
      steer: clamp(delta * 2.2, -1, 1),
      brake: gap < 42 && !state.player.inVehicle,
      handbrake: false,
    };
    unit.fireTimer -= dt;
    unit.officerTimer -= dt;
    if (wanted >= 4 && gap < 400 && unit.fireTimer <= 0) {
      unit.fireTimer = between(rng, 1.1, 2.2);
      const combat = state.systems && state.systems.combat;
      if (combat) combat.spawnBullet(vehicle.x, vehicle.y, desired + between(rng, -0.12, 0.12), 510, 'police', 8);
      const audio = state.systems && state.systems.audio;
      if (audio) audio.gunshot(0.75);
    }
    if (gap < 150) deployOfficer(unit, target);
  }

  function patrol(unit) {
    const vehicle = unit.vehicle;
    if (!vehicle.route || distance(vehicle.x, vehicle.y, vehicle.route.target.x, vehicle.route.target.y) < 34) {
      state.systems.traffic.assign(vehicle, rng() < 0.5 ? 'v' : 'h', rng() < 0.5 ? 1 : -1);
    }
    if (!vehicle.route) return;
    const target = vehicle.route.target;
    const desired = Math.atan2(target.y - vehicle.y, target.x - vehicle.x);
    const delta = angleDelta(vehicle.angle, desired);
    vehicle.aiInput = {
      throttle: 0.42,
      steer: clamp(delta * 1.8, -1, 1),
      brake: false,
    };
  }

  function step(dt) {
    ensureFleet();
    buildRoadblock();
    const target = state.systems.vehicles.playerVehicle() || state.player;
    const wanted = stars();
    for (let index = units.length - 1; index >= 0; index -= 1) {
      const unit = units[index];
      if (unit.vehicle.dead) {
        units.splice(index, 1);
        continue;
      }
      unit.vehicle.siren = wanted > 0;
      if (unit.roadblock) {
        unit.vehicle.aiInput = { throttle: 0, steer: 0, brake: true };
        continue;
      }
      if (wanted > 0) pursue(unit, dt, target);
      else {
        patrol(unit);
        unit.fireTimer = 1;
      }
    }
  }

  function nearestDistance(x, y) {
    let best = Infinity;
    for (const unit of units) {
      if (unit.vehicle.dead) continue;
      best = Math.min(best, distance(x, y, unit.vehicle.x, unit.vehicle.y));
    }
    for (const ped of state.systems.peds.list) {
      if (!ped.dead && ped.behavior === 'police') best = Math.min(best, distance(x, y, ped.x, ped.y));
    }
    return best;
  }

  function clear() {
    for (const unit of units) unit.vehicle.dead = true;
    units.length = 0;
    for (const ped of state.systems.peds.list) {
      if (ped.behavior === 'police') ped.dead = true;
    }
  }

  return { units, reset, step, nearestDistance, clear };
}

export function draw(ctx, state) {
  const system = state.systems && state.systems.police;
  if (!system) return;
  const camera = state.camera.state;
  const pulse = Math.floor(state.elapsed * 6) % 2 === 0;
  for (const unit of system.units) {
    const vehicle = unit.vehicle;
    if (vehicle.dead || !vehicle.siren) continue;
    if (Math.abs(vehicle.x - camera.x) > FIELD.width / 2 + 90 || Math.abs(vehicle.y - camera.y) > FIELD.height / 2 + 90) continue;
    ctx.fillStyle = pulse ? 'rgba(80, 150, 255, 0.22)' : 'rgba(240, 70, 80, 0.22)';
    ctx.beginPath();
    ctx.arc(vehicle.x, vehicle.y, 46, 0, Math.PI * 2);
    ctx.fill();
  }
}
