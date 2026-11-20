import { CITY } from './config.js';
import { cellAt, isSolid } from './city.js';
import { hashCell } from './random.js';

function distance(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}

function rayHit(px, py, dx, dy, tx, ty, tolerance) {
  const vx = tx - px;
  const vy = ty - py;
  const along = vx * dx + vy * dy;
  if (along < 0 || along > 560) return null;
  const across = Math.abs(vx * -dy + vy * dx);
  return across < tolerance ? along : null;
}

export function createCombat(world) {
  const state = world.state;
  const combat = {
    weapon: 'fists',
    mag: 0,
    reserve: 0,
    cooldown: 0,
    reloadTimer: 0,
    pickups: [],
    triggerHeld: false,
  };
  state.combat = combat;
  let input = null;
  let setScreen = null;
  let pickupClock = 0;

  function system(name) {
    return state.systems ? state.systems[name] : null;
  }

  function sync() {
    state.player.weapon = combat.weapon;
    state.player.ammo = combat.mag;
  }

  function wanted(type, severity, x, y) {
    const manager = system('wanted');
    if (manager) manager.addCrime(type, severity, x, y);
  }

  function witness(x, y) {
    const peds = Array.isArray(state.peds) ? state.peds : [];
    for (let index = 0; index < peds.length; index += 1) {
      const ped = peds[index];
      if (ped.dead) continue;
      if (distance(ped.x, ped.y, x, y) < 270) return true;
    }
    return false;
  }

  function dropPickup(x, y, kind) {
    combat.pickups.push({ x, y, kind, life: 45, phase: hashCell(state.seed, x | 0, y | 0, 819) % 60 });
  }

  function seedPickups() {
    const size = CITY.cell;
    const player = state.player;
    const centerColumn = Math.floor(player.x / size);
    const centerRow = Math.floor(player.y / size);
    for (let row = centerRow - 4; row <= centerRow + 4; row += 1) {
      for (let column = centerColumn - 4; column <= centerColumn + 4; column += 1) {
        if (row < 1 || column < 1 || row >= CITY.grid - 1 || column >= CITY.grid - 1) continue;
        const hash = hashCell(state.seed, column, row, 831);
        if (hash % 29 !== 0) continue;
        const cell = cellAt(state.city || world.city, (column + 0.5) * size, (row + 0.5) * size);
        if (!cell || cell.terrain !== 'land') continue;
        const x = (column + 0.5) * size + (hash % 28) - 14;
        const y = (row + 0.5) * size + ((hash >>> 7) % 28) - 14;
        if (isSolid(world.city, x, y)) continue;
        if (combat.pickups.some((pickup) => distance(pickup.x, pickup.y, x, y) < 40)) continue;
        dropPickup(x, y, hash % 3 === 0 ? 'armor' : 'pistol');
      }
    }
  }

  function fire() {
    if (state.player.wasted || state.player.inVehicle || combat.cooldown > 0 || combat.reloadTimer > 0) return;
    const player = state.player;
    const angle = player.angle;
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    const fx = system('effects');
    const audio = system('audio');
    if (combat.weapon === 'fists') {
      combat.cooldown = 0.38;
      if (audio) audio.play('punch');
      const peds = system('peds');
      if (peds) {
        let target = null;
        let nearest = 46;
        const crowd = Array.isArray(state.peds) ? state.peds : [];
        for (let index = 0; index < crowd.length; index += 1) {
          const ped = crowd[index];
          if (ped.dead) continue;
          const along = (ped.x - player.x) * dx + (ped.y - player.y) * dy;
          const across = Math.abs((ped.x - player.x) * -dy + (ped.y - player.y) * dx);
          if (along > 4 && along < nearest && across < 26) {
            nearest = along;
            target = ped;
          }
        }
        if (target) {
          peds.hurt(target, 26, 'fists');
          if (fx) fx.emit('puff', target.x, target.y, 3);
        }
      }
      if (witness(player.x, player.y)) wanted('attack', 1, player.x, player.y);
      return;
    }
    if (combat.mag <= 0) {
      if (audio) audio.play('fail');
      reload();
      return;
    }
    combat.mag -= 1;
    combat.cooldown = 0.16;
    if (fx) fx.muzzle(player.x, player.y, angle);
    if (audio) audio.play('shot');
    if (state.camera && state.camera.kick) state.camera.kick(3.5);
    const spread = (state.random() - 0.5) * 0.045;
    const aim = angle + spread;
    const ax = Math.cos(aim);
    const ay = Math.sin(aim);
    let best = null;
    let bestRange = Infinity;
    let kind = null;
    const peds = system('peds');
    if (peds) {
      const crowd = Array.isArray(state.peds) ? state.peds : [];
      for (let index = 0; index < crowd.length; index += 1) {
        const ped = crowd[index];
        if (ped.dead) continue;
        const range = rayHit(player.x, player.y, ax, ay, ped.x, ped.y, 13);
        if (range !== null && range < bestRange) {
          bestRange = range;
          best = ped;
          kind = 'ped';
        }
      }
    }
    const vehicles = system('vehicles');
    if (vehicles) {
      for (let index = 0; index < state.vehicles.length; index += 1) {
        const vehicle = state.vehicles[index];
        if (vehicle.wrecked) continue;
        const range = rayHit(player.x, player.y, ax, ay, vehicle.x, vehicle.y, vehicle.width * 0.5);
        if (range !== null && range < bestRange) {
          bestRange = range;
          best = vehicle;
          kind = 'car';
        }
      }
    }
    if (best && kind === 'ped') {
      peds.hurt(best, 48, 'bullet');
      if (fx) fx.impact(best.x, best.y, 'blood');
    } else if (best && kind === 'car' && vehicles) {
      vehicles.damage(best, 16, 'bullet');
      if (fx) fx.impact(best.x, best.y, 'metal');
    } else if (fx) {
      const range = 260 + state.random() * 260;
      const wallX = player.x + ax * range;
      const wallY = player.y + ay * range;
      fx.impact(wallX, wallY, isSolid(world.city, wallX, wallY) ? 'metal' : 'dust');
    }
    wanted(witness(player.x, player.y) ? 'shooting' : 'crash', 1, player.x, player.y);
    sync();
  }

  function reload() {
    if (combat.weapon !== 'pistol' || combat.reloadTimer > 0 || combat.reserve <= 0 || combat.mag >= 12) return;
    combat.reloadTimer = 1.05;
    const audio = system('audio');
    if (audio) audio.play('reload');
  }

  function give(kind) {
    if (kind === 'pistol') {
      combat.weapon = 'pistol';
      combat.mag = 12;
      combat.reserve += 24;
      const hud = system('hud');
      if (hud) hud.toast('Pistol found. Left click to fire, R to reload.', 'good');
    } else {
      state.player.armor = Math.min(100, state.player.armor + 45);
      const hud = system('hud');
      if (hud) hud.toast('Body armor collected.', 'good');
    }
    const audio = system('audio');
    if (audio) audio.play('pickup');
    sync();
  }

  function enemyFire(x, y, target, accuracy) {
    const fx = system('effects');
    const audio = system('audio');
    const angle = Math.atan2(target.y - y, target.x - x) + (state.random() - 0.5) * (1.1 - accuracy);
    if (fx) fx.muzzle(x, y, angle);
    if (audio) audio.play('shot');
    const hit = state.random() < accuracy && distance(x, y, target.x, target.y) < 400;
    if (hit) {
      world.damage(6 + Math.floor(state.random() * 6));
      if (fx) fx.impact(target.x, target.y, 'blood');
      if (state.camera && state.camera.kick) state.camera.kick(4);
    } else if (fx) {
      fx.emit('dust', target.x + (state.random() - 0.5) * 70, target.y + (state.random() - 0.5) * 70, 2);
    }
  }

  function onDamage(amount) {
    const fx = system('effects');
    if (fx) fx.flash('shot');
    if (state.camera && state.camera.kick) state.camera.kick(Math.min(9, amount * 0.3));
  }

  function step(dt) {
    combat.cooldown = Math.max(0, combat.cooldown - dt);
    if (combat.reloadTimer > 0) {
      combat.reloadTimer -= dt;
      if (combat.reloadTimer <= 0) {
        const needed = 12 - combat.mag;
        const loaded = Math.min(needed, combat.reserve);
        combat.mag += loaded;
        combat.reserve -= loaded;
      }
    }
    if (input && input.pointerState().down && !state.player.wasted) fire();
    pickupClock += dt;
    if (pickupClock > 3) {
      pickupClock = 0;
      if (combat.pickups.length < 7) seedPickups();
    }
    for (let index = combat.pickups.length - 1; index >= 0; index -= 1) {
      const pickup = combat.pickups[index];
      pickup.life -= dt;
      if (pickup.life <= 0 || distance(pickup.x, pickup.y, state.player.x, state.player.y) > 1800) {
        combat.pickups.splice(index, 1);
        continue;
      }
      if (distance(pickup.x, pickup.y, state.player.x, state.player.y) < 24) {
        give(pickup.kind);
        combat.pickups.splice(index, 1);
      }
    }
    sync();
  }

  function reset() {
    combat.weapon = 'fists';
    combat.mag = 0;
    combat.reserve = 0;
    combat.cooldown = 0;
    combat.reloadTimer = 0;
    combat.pickups.length = 0;
    seedPickups();
    sync();
  }

  seedPickups();
  sync();
  return {
    combat,
    give,
    fire,
    reload,
    giveWeapon(kind) { give(kind); },
    enemyFire,
    onDamage,
    step,
    reset,
    setInput(value, screenSetter) { input = value; setScreen = screenSetter; },
  };
}

let current = null;

export function install(context) {
  current = createCombat(context.world);
  current.setInput(context.input, context.setScreen);
  context.systems.combat = current;
}

export function reload() {
  if (current) current.reload();
}

export function fire() {
  if (current) current.fire();
}

export function enemyFire(x, y, target, accuracy) {
  if (current) current.enemyFire(x, y, target, accuracy);
}

export function drawPickups(context, state, now) {
  const pickups = state.combat ? state.combat.pickups : [];
  for (let index = 0; index < pickups.length; index += 1) {
    const pickup = pickups[index];
    const bob = Math.sin(now * 3 + pickup.phase) * 3;
    context.save();
    context.translate(pickup.x, pickup.y + bob);
    context.fillStyle = 'rgba(18, 26, 36, 0.3)';
    context.beginPath();
    context.ellipse(3, 8, 12, 5, 0, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = pickup.kind === 'pistol' ? '#4c5b6a' : '#5aa9c4';
    context.fillRect(-8, -6, 16, 12);
    context.fillStyle = pickup.kind === 'pistol' ? '#e8c46a' : '#dff3f7';
    context.fillRect(-4, -3, 8, 4);
    context.strokeStyle = 'rgba(255, 226, 146, 0.7)';
    context.lineWidth = 2;
    context.strokeRect(-11, -9, 22, 18);
    context.restore();
  }
}
