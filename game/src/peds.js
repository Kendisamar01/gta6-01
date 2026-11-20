import { CITY } from './config.js';
import { cellAt, isSolid } from './city.js';
import { hashCell } from './random.js';

const SHIRTS = ['#8fa7a0', '#c98f6b', '#7f9fc4', '#b8a3c8', '#d0b076', '#7fa88b'];
const SKINS = ['#d8b394', '#b68663', '#8d644b', '#e2c39c', '#a97758'];

function distance(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}

export function createPeds(world) {
  const state = world.state;
  const city = world.city;
  if (!Array.isArray(state.peds)) state.peds = [];
  const peds = state.peds;
  let sceneClock = 0;

  function system(name) {
    return state.systems ? state.systems[name] : null;
  }

  function spawnAt(x, y, role = 'civilian') {
    const hash = hashCell(state.seed, Math.floor(x), Math.floor(y), 404);
    const axis = hash % 2 === 0 ? 'x' : 'y';
    const ped = {
      x,
      y,
      angle: axis === 'x' ? (hash % 4 < 2 ? 0 : Math.PI) : (hash % 4 < 2 ? Math.PI / 2 : -Math.PI / 2),
      vx: 0,
      vy: 0,
      speed: 0,
      walkSpeed: 34 + (hash % 26),
      axis,
      dir: hash % 8 < 4 ? 1 : -1,
      side: hash % 16 < 8 ? 0 : 1,
      color: SKINS[(hash >>> 7) % SKINS.length],
      shirt: SHIRTS[(hash >>> 11) % SHIRTS.length],
      role,
      health: role === 'police' ? 100 : 65,
      dead: false,
      inVehicle: false,
      fleeUntil: 0,
      think: 0,
      phase: (hash >>> 17) % 100,
    };
    peds.push(ped);
    return ped;
  }

  function sidewalkSpot(column, row, axis, side) {
    const size = CITY.cell;
    const offset = CITY.road + 7 + (side % 2) * (size - CITY.road * 2 - 14);
    return axis === 'x'
      ? { x: column * size + size / 2, y: row * size + offset }
      : { x: column * size + offset, y: row * size + size / 2 };
  }

  function populate() {
    const player = state.player;
    const size = CITY.cell;
    const centerColumn = Math.floor(player.x / size);
    const centerRow = Math.floor(player.y / size);
    for (let row = centerRow - 4; row <= centerRow + 4; row += 1) {
      for (let column = centerColumn - 4; column <= centerColumn + 4; column += 1) {
        if (row < 1 || column < 1 || row >= city.grid - 1 || column >= city.grid - 1) continue;
        const hash = hashCell(city.seed, column, row, 512);
        if (hash % 10 >= 4) continue;
        const cell = cellAt(city, column * size + size / 2, row * size + size / 2);
        if (!cell || cell.terrain !== 'land') continue;
        const count = 1 + (hash % 2);
        for (let index = 0; index < count; index += 1) {
          const axis = (hash >>> (3 + index)) % 2 === 0 ? 'x' : 'y';
          const side = (hash >>> (7 + index)) % 2;
          const spot = sidewalkSpot(column, row, axis, side);
          if (peds.length > 150) break;
          if (peds.some((ped) => !ped.dead && distance(ped.x, ped.y, spot.x, spot.y) < 22)) continue;
          spawnAt(spot.x, spot.y, 'civilian');
        }
      }
    }
  }

  function hurt(ped, amount, source) {
    if (!ped || ped.dead) return;
    ped.health -= amount;
    const fx = system('effects');
    const audio = system('audio');
    if (fx) fx.impact(ped.x, ped.y, 'blood');
    if (audio) audio.play('hit');
    if (ped.health <= 0) {
      ped.dead = true;
      ped.speed = 0;
      if (fx) fx.emit('puff', ped.x, ped.y, 5);
      const wanted = system('wanted');
      if (wanted && source !== 'police' && source !== 'car') wanted.addCrime('kill', 2, ped.x, ped.y);
    } else if (ped.role !== 'police') {
      ped.fleeUntil = state.elapsed + 8;
    }
  }

  function panic(x, y, radius, seconds) {
    for (let index = 0; index < peds.length; index += 1) {
      const ped = peds[index];
      if (ped.dead || ped.role === 'police') continue;
      if (distance(ped.x, ped.y, x, y) > radius) continue;
      ped.fleeUntil = Math.max(ped.fleeUntil, state.elapsed + seconds);
      const away = Math.atan2(ped.y - y, ped.x - x);
      ped.angle = away;
      ped.axis = Math.abs(Math.cos(away)) > Math.abs(Math.sin(away)) ? 'x' : 'y';
      ped.dir = (ped.axis === 'x' ? Math.cos(away) : Math.sin(away)) > 0 ? 1 : -1;
    }
  }

  function nearest(x, y, range, filter) {
    let best = null;
    let gap = range;
    for (let index = 0; index < peds.length; index += 1) {
      const ped = peds[index];
      if (ped.dead || ped.inVehicle || (filter && !filter(ped))) continue;
      const current = distance(x, y, ped.x, ped.y);
      if (current < gap) {
        gap = current;
        best = ped;
      }
    }
    return best;
  }

  function move(ped, dt) {
    const fleeing = ped.fleeUntil > state.elapsed;
    const top = fleeing ? ped.walkSpeed * 3.1 : ped.walkSpeed;
    ped.speed += (top - ped.speed) * Math.min(1, dt * 7);
    const step = ped.speed * dt * ped.dir;
    const aheadX = ped.axis === 'x' ? ped.x + step : ped.x;
    const aheadY = ped.axis === 'y' ? ped.y + step : ped.y;
    if (isSolid(city, aheadX, aheadY)) {
      ped.dir *= -1;
      ped.angle += Math.PI;
      return;
    }
    if (ped.axis === 'x') ped.x = aheadX;
    else ped.y = aheadY;
    ped.angle = ped.axis === 'x' ? (ped.dir > 0 ? 0 : Math.PI) : (ped.dir > 0 ? Math.PI / 2 : -Math.PI / 2);
    const size = CITY.cell;
    const cross = ped.axis === 'x' ? ped.x / size : ped.y / size;
    if (Math.abs(cross - Math.round(cross)) < 0.04) {
      const cell = cellAt(city, ped.x, ped.y);
      if (!cell || cell.terrain !== 'land') {
        ped.dir *= -1;
        return;
      }
      const hash = hashCell(city.seed, Math.floor(ped.x / size), Math.floor(ped.y / size), ped.phase);
      if (hash % 9 === 0) ped.dir *= -1;
    }
  }

  function step(dt) {
    const player = state.player;
    sceneClock += dt;
    const vehicles = state.systems ? state.systems.vehicles : null;
    for (let index = peds.length - 1; index >= 0; index -= 1) {
      const ped = peds[index];
      if (ped.inVehicle) continue;
      if (distance(ped.x, ped.y, player.x, player.y) > 2500) {
        peds.splice(index, 1);
        continue;
      }
      if (ped.dead) continue;
      if (vehicles && state.fleeUntil <= state.elapsed) {
        const car = vehicles.nearest(ped.x, ped.y, 90, (vehicle) => vehicles.speedOf(vehicle) > 130);
        if (car) {
          ped.fleeUntil = state.elapsed + 3;
          ped.angle = Math.atan2(ped.y - car.y, ped.x - car.x);
        }
      }
      move(ped, dt);
      if (!ped.dead && ped.role === 'civilian' && distance(ped.x, ped.y, player.x, player.y) < 16 && !player.inVehicle) {
        const push = Math.atan2(ped.y - player.y, ped.x - player.x);
        ped.x += Math.cos(push) * 22 * dt;
        ped.y += Math.sin(push) * 22 * dt;
      }
    }
    if (sceneClock > 1.5) {
      sceneClock = 0;
      populate();
    }
  }

  function reset() {
    peds.length = 0;
    populate();
  }

  populate();
  return { peds, spawnAt, hurt, panic, nearest, step, reset };
}

let current = null;

export function install(context) {
  current = createPeds(context.world);
  context.systems.peds = current;
}

export function hurtPed(ped, amount, source) {
  if (current) current.hurt(ped, amount, source);
}

export function panicPeds(x, y, radius, seconds) {
  if (current) current.panic(x, y, radius, seconds);
}
