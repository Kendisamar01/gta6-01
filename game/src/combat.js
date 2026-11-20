import { FOOT } from './config.js';
import { rayHitsBuilding } from './city.js';
import { addCrime } from './wanted.js';
import { damagePlayer, notify } from './world.js';
import { hurtPed } from './peds.js';

const WEAPONS = {
  fists: { damage: 26, cooldown: 0.42, speed: 0, ammo: 0 },
  pistol: { damage: 34, cooldown: 0.26, speed: 760, ammo: 12 },
  smg: { damage: 19, cooldown: 0.085, speed: 820, ammo: 32 },
};

export function giveWeapon(world, weapon, rounds) {
  const spec = WEAPONS[weapon];
  if (!spec) return;
  const player = world.player;
  player.weapon = weapon;
  player.ammo = spec.ammo;
  player.reserve += weapon === 'fists' ? 0 : Math.max(rounds, spec.ammo * 2);
  notify(world, `${weapon.toUpperCase()} acquired`, 'good');
}

export function fireBullet(world, x, y, angle, options = {}) {
  const speed = options.speed ?? 760;
  world.bullets.push({
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    life: options.life ?? 1.1,
    max: options.life ?? 1.1,
    damage: options.damage ?? 25,
    owner: options.owner ?? 'player',
    color: options.color ?? '#ffe9a8',
    heavy: Boolean(options.heavy),
  });
  world.events.push({ type: 'shot', x, y, angle, owner: options.owner ?? 'player' });
}

export function reload(world) {
  const player = world.player;
  const spec = WEAPONS[player.weapon];
  if (!spec || player.weapon === 'fists' || player.reserve <= 0 || player.reload > 0) return;
  const needed = spec.ammo - player.ammo;
  const taken = Math.min(needed, player.reserve);
  player.reserve -= taken;
  player.reload = 0.9;
  player.ammo += taken;
  world.events.push({ type: 'reload', x: player.x, y: player.y });
  notify(world, 'Reloading');
}

export function init(world) {
  world.pickups.length = 0;
  const spots = [
    { x: 5 * 220 + 120, y: 6 * 220 + 120, weapon: 'pistol' },
    { x: 9 * 220 + 120, y: 3 * 220 + 120, weapon: 'smg' },
    { x: 12 * 220 + 120, y: 7 * 220 + 120, weapon: 'pistol' },
  ];
  for (const spot of spots) world.pickups.push({ ...spot, taken: false });
}

export function key(code, world) {
  if (code === 'KeyR') reload(world);
  if (code === 'Digit1') {
    world.player.weapon = 'fists';
    world.player.ammo = 0;
    notify(world, 'Fists');
  }
  if (code === 'Digit2' && world.player.reserve > 0) {
    world.player.weapon = 'pistol';
    world.player.ammo = Math.min(WEAPONS.pistol.ammo, world.player.reserve);
    notify(world, 'Pistol');
  }
  if (code === 'Digit3' && world.player.reserve > 0) {
    world.player.weapon = 'smg';
    world.player.ammo = Math.min(WEAPONS.smg.ammo, world.player.reserve);
    notify(world, 'SMG');
  }
}

function punch(world, api) {
  const player = world.player;
  let target = null;
  let best = FOOT.punchRange;
  for (const ped of world.peds) {
    if (ped.dead) continue;
    const dx = ped.x - player.x;
    const dy = ped.y - player.y;
    const distance = Math.hypot(dx, dy);
    const angle = Math.atan2(dy, dx);
    let difference = Math.abs(angle - player.angle);
    if (difference > Math.PI) difference = Math.PI * 2 - difference;
    if (distance < best && difference < 0.85) {
      target = ped;
      best = distance;
    }
  }
  world.events.push({ type: 'punch', x: player.x + Math.cos(player.angle) * 22, y: player.y + Math.sin(player.angle) * 22 });
  if (target) {
    hurtPed(world, target, WEAPONS.fists.damage, api);
    addCrime(world, 'assault', 0.45);
  }
}

function shoot(world) {
  const player = world.player;
  const spec = WEAPONS[player.weapon];
  if (!spec || spec.speed === 0) return;
  if (player.ammo <= 0) {
    reload(world);
    return;
  }
  player.ammo -= 1;
  const muzzleX = player.x + Math.cos(player.angle) * 22;
  const muzzleY = player.y + Math.sin(player.angle) * 22;
  const spread = player.weapon === 'smg' ? 0.075 : 0.025;
  const angle = player.angle + (world.random() - 0.5) * spread;
  fireBullet(world, muzzleX, muzzleY, angle, {
    speed: spec.speed,
    damage: spec.damage,
    heavy: player.weapon === 'smg',
  });
  if (!world.shotTimer || world.shotTimer <= 0) {
    addCrime(world, 'shooting', 0.4);
    world.shotTimer = 1.8;
  }
}

function updateBullets(world, dt, api) {
  for (let index = world.bullets.length - 1; index >= 0; index -= 1) {
    const bullet = world.bullets[index];
    const oldX = bullet.x;
    const oldY = bullet.y;
    bullet.x += bullet.vx * dt;
    bullet.y += bullet.vy * dt;
    bullet.life -= dt;
    let hit = false;
    if (rayHitsBuilding(world.city, oldX, oldY, bullet.x, bullet.y)) {
      world.events.push({ type: 'impact', x: bullet.x, y: bullet.y, cause: 'wall' });
      hit = true;
    }
    if (!hit && bullet.owner === 'player') {
      for (const ped of world.peds) {
        if (ped.dead) continue;
        if (Math.hypot(ped.x - bullet.x, ped.y - bullet.y) < 13) {
          hurtPed(world, ped, bullet.damage, api);
          hit = true;
          break;
        }
      }
      if (!hit) {
        for (const car of world.vehicles) {
          if (car.dead) continue;
          if (Math.hypot(car.x - bullet.x, car.y - bullet.y) < 25) {
            car.damage = Math.min(100, car.damage + bullet.damage * 0.6);
            world.events.push({ type: 'impact', x: bullet.x, y: bullet.y, cause: 'metal' });
            if (car.role === 'police') addCrime(world, 'copKill', 0.2);
            hit = true;
            break;
          }
        }
      }
    }
    if (!hit && bullet.owner === 'police' && world.player.inVehicle === null) {
      if (Math.hypot(world.player.x - bullet.x, world.player.y - bullet.y) < 13) {
        damagePlayer(world, bullet.damage, 'gunshot');
        hit = true;
      }
    }
    if (hit || bullet.life <= 0) world.bullets.splice(index, 1);
  }
}

export function update(world, dt, controls, api) {
  world.shotTimer = Math.max(0, (world.shotTimer || 0) - dt);
  const player = world.player;
  if (controls.fire && player.fireCooldown <= 0 && player.reload <= 0 && world.screen === 'play') {
    if (player.weapon === 'fists') {
      if (player.swing <= 0) {
        punch(world, api);
        player.fireCooldown = WEAPONS.fists.cooldown;
        player.swing = 1;
      }
    } else {
      shoot(world);
      player.fireCooldown = WEAPONS[player.weapon].cooldown;
      player.swing = 1;
    }
  }
  for (const pickup of world.pickups) {
    if (pickup.taken || Math.hypot(pickup.x - player.x, pickup.y - player.y) > 34) continue;
    pickup.taken = true;
    giveWeapon(world, pickup.weapon, 30);
  }
  updateBullets(world, dt, api);
}
