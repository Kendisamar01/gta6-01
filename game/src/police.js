import { CITY } from './config.js';
import { hashCell } from './random.js';

function deltaAngle(target, current) {
  let delta = (target - current) % (Math.PI * 2);
  if (delta > Math.PI) delta -= Math.PI * 2;
  if (delta < -Math.PI) delta += Math.PI * 2;
  return delta;
}

function distance(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}

export function createPolice(world) {
  const state = world.state;
  const force = { units: [], level: 0, roadblocks: 0, clock: 0, fireClock: 0, active: false };
  state.policeForce = force;

  function system(name) {
    return state.systems ? state.systems[name] : null;
  }

  function spawnCruiser(x, y, chase) {
    const manager = system('vehicles');
    if (!manager) return null;
    const vehicle = manager.spawn('cruiser', x, y, Math.atan2(state.player.y - y, state.player.x - x), { siren: true, driver: 'police' });
    vehicle.aiControl = { throttle: 0.6, steer: 0 };
    vehicle.chase = Boolean(chase);
    force.units.push(vehicle);
    return vehicle;
  }

  function roadPoint(ahead) {
    const size = CITY.cell;
    const column = Math.floor(state.player.x / size);
    const row = Math.floor(state.player.y / size);
    const angle = Math.atan2(state.player.vy || 0, state.player.vx || 1);
    const x = Math.max(size, Math.min(CITY.grid * size - size, state.player.x + Math.cos(angle) * ahead));
    const y = Math.max(size, Math.min(CITY.grid * size - size, state.player.y + Math.sin(angle) * ahead));
    const line = hashCell(state.seed, column, row, 611) % 3 === 0 ? y : x;
    return { x, y, line, horizontal: hashCell(state.seed, column, row, 612) % 2 === 0 };
  }

  function spawnRoadblock() {
    const point = roadPoint(430);
    for (let index = -1; index <= 1; index += 1) {
      const offset = index * CITY.road * 1.5;
      const x = point.horizontal ? point.x + offset : point.x;
      const y = point.horizontal ? point.y : point.y + offset;
      spawnCruiser(x, y, false);
    }
    force.roadblocks += 1;
    const hud = system('hud');
    if (hud) hud.toast('Roadblock ahead. Do not stop.', 'danger');
  }

  function spawnOfficers(count) {
    const peds = system('peds');
    if (!peds) return;
    const player = state.player;
    for (let index = 0; index < count; index += 1) {
      const hash = hashCell(state.seed, Math.floor(player.x), Math.floor(player.y), 700 + index + force.level);
      const angle = (hash % 360) * Math.PI / 180;
      const radius = 210 + (hash % 140);
      const x = Math.max(40, Math.min(world.city.size - 40, player.x + Math.cos(angle) * radius));
      const y = Math.max(40, Math.min(world.city.size - 40, player.y + Math.sin(angle) * radius));
      const ped = peds.spawnAt(x, y, 'police');
      ped.shirt = '#3c5878';
      ped.color = '#d9b18d';
      ped.walkSpeed = 78;
      ped.fleeUntil = 0;
      force.units.push(ped);
    }
  }

  function alert(stars) {
    force.level = stars;
    force.active = stars > 0;
    if (stars <= 0) return;
    const wanted = system('wanted');
    const gap = wanted && wanted.policeGap ? wanted.policeGap() : 900;
    const cruisers = force.units.filter((unit) => unit && !unit.dead && unit.siren).length;
    const target = Math.min(8, 1 + stars);
    if (cruisers < target && gap > 260) {
      const hash = hashCell(state.seed, Math.floor(state.player.x), Math.floor(state.player.y), 650 + force.clock | 0);
      for (let index = cruisers; index < target; index += 1) {
        const angle = (hash + index * 91) % 360 * Math.PI / 180;
        const radius = 340 + (hash % 180);
        const x = Math.max(60, Math.min(world.city.size - 60, state.player.x + Math.cos(angle) * radius));
        const y = Math.max(60, Math.min(world.city.size - 60, state.player.y + Math.sin(angle) * radius));
        spawnCruiser(x, y, true);
      }
    }
    if (stars >= 2) {
      const officers = force.units.filter((unit) => unit && unit.role === 'police' && !unit.dead).length;
      if (officers < Math.min(6, stars + 1)) spawnOfficers(Math.min(2, stars + 1 - officers));
    }
    if (stars >= 3 && force.roadblocks < Math.floor((stars - 1) / 2)) spawnRoadblock();
  }

  function standDown() {
    force.level = 0;
    force.active = false;
    for (let index = 0; index < force.units.length; index += 1) {
      const unit = force.units[index];
      if (!unit) continue;
      if (unit.aiControl) {
        unit.aiControl.throttle = 0;
        unit.chase = false;
        unit.retire = state.elapsed + 4;
      } else {
        unit.fleeUntil = state.elapsed + 4;
        unit.retire = state.elapsed + 4;
      }
    }
  }

  function shootAt(target) {
    const combat = system('combat');
    if (combat && combat.enemyFire) combat.enemyFire(target.x, target.y, state.player, force.level >= 4 ? 0.55 : 0.42);
  }

  function step(dt) {
    const player = state.player;
    force.clock += dt;
    force.fireClock += dt;
    for (let index = force.units.length - 1; index >= 0; index -= 1) {
      const unit = force.units[index];
      if (!unit || unit.dead || unit.retire < state.elapsed && unit.retire > 0) {
        if (unit && unit.aiControl) {
          const manager = system('vehicles');
          if (manager) manager.remove(unit);
        } else if (unit && Array.isArray(state.peds)) {
          const pedIndex = state.peds.indexOf(unit);
          if (pedIndex >= 0) state.peds.splice(pedIndex, 1);
        }
        force.units.splice(index, 1);
        continue;
      }
      if (unit.aiControl) {
        if (!unit.chase || force.level === 0) {
          unit.aiControl.throttle = unit.retire ? 0.6 : 0;
          continue;
        }
        const targetAngle = Math.atan2(player.y - unit.y, player.x - unit.x);
        const error = deltaAngle(targetAngle, unit.angle);
        const gap = distance(unit.x, unit.y, player.x, player.y);
        unit.aiControl.steer = Math.max(-1, Math.min(1, error * 2.2));
        unit.aiControl.throttle = gap < 46 && !player.inVehicle ? -0.3 : 1;
        if (unit.health < 30) unit.aiControl.throttle *= 0.6;
      } else {
        const gap = distance(unit.x, unit.y, player.x, player.y);
        if (force.level > 0 && gap < 620 && !unit.retire) {
          unit.fleeUntil = 0;
          unit.walkSpeed = 90;
          const aim = Math.atan2(player.y - unit.y, player.x - unit.x);
          unit.angle = aim;
          unit.axis = Math.abs(Math.cos(aim)) > Math.abs(Math.sin(aim)) ? 'x' : 'y';
          unit.dir = (unit.axis === 'x' ? Math.cos(aim) : Math.sin(aim)) > 0 ? 1 : -1;
          if (gap < 330 && gap > 34 && force.fireClock > (force.level >= 4 ? 0.42 : 0.75)) {
            force.fireClock = 0;
            shootAt(unit);
          }
        }
      }
    }
    if (force.active && force.level > 0 && (!state.wantedState || state.wantedState.quiet < 9) && force.units.filter((unit) => unit && unit.siren).length < 1) {
      force.clock = 0;
      alert(force.level);
    }
  }

  function reset() {
    force.units.length = 0;
    force.level = 0;
    force.roadblocks = 0;
    force.active = false;
  }

  return { force, alert, standDown, step, reset, spawnCruiser, spawnOfficers };
}

let current = null;

export function install(context) {
  current = createPolice(context.world);
  context.systems.police = current;
}

export function alertPolice(stars) {
  if (current) current.alert(stars);
}
