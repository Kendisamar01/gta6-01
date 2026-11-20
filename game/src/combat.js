import { COLORS, WEAPONS } from './config.js';
import { pointInBuilding } from './city.js';
import { range } from './random.js';
import { alertPeds, damagePed, pedInFront } from './peds.js';
import { addLight, emit } from './effects.js';
import { damageVehicle } from './vehicles.js';

export function fireBullet(world, bullet) {
  world.bullets.push({
    id: world.nextId++,
    life: 1.4,
    damage: 10,
    color: COLORS.gold,
    ...bullet,
  });
  if (world.bullets.length > 180) world.bullets.shift();
}

export function firePlayerWeapon(world, controls) {
  const player = world.player;
  if (player.reloading > 0 || player.fireCooldown > 0) return;

  if (player.weapon === 'fists') {
    if (!controls.firePressed) return;
    const spec = WEAPONS.fists;
    player.fireCooldown = spec.delay;
    const target = pedInFront(world, player.x, player.y, player.angle, spec.range);
    if (target) {
      damagePed(world, target, spec.damage, {
        type: 'player', owner: 'player', x: player.x, y: player.y,
      });
      world.reportCrime(6, 'Assault');
      world.toast('Punch landed');
    }
    world.sfx('punch');
    return;
  }

  if (!controls.fire) return;
  if (player.ammo <= 0) {
    startReload(world);
    return;
  }

  const spec = WEAPONS.pistol;
  player.fireCooldown = spec.delay;
  player.ammo -= 1;
  player.flash = 0.11;
  const angle = player.angle + range(world.random, -0.045, 0.045);
  const x = player.x + Math.cos(angle) * 18;
  const y = player.y + Math.sin(angle) * 18;
  fireBullet(world, {
    x,
    y,
    vx: Math.cos(angle) * 720,
    vy: Math.sin(angle) * 720,
    owner: 'player',
    damage: spec.damage,
    life: spec.range / 720,
  });
  emit(world, 'muzzle', x, y, 3, {
    spread: 0.35, angle, color: '#fff0a8', size: 4, life: 0.09,
  });
  addLight(world, x, y, 'rgba(255,220,130,0.9)', 60, 0.07);
  alertPeds(world, x, y, 290);
  world.sfx('gunshot', 0.8);
  world.reportCrime(11, 'Shooting');
  if (player.ammo === 0) startReload(world);
}

export function startReload(world) {
  const player = world.player;
  if (player.weapon !== 'pistol' || player.reloading > 0) return;
  if (player.reserve <= 0 || player.ammo >= WEAPONS.pistol.clip) return;
  player.reloading = WEAPONS.pistol.reload;
  world.sfx('reload');
}

export function updateWeapon(world, dt) {
  const player = world.player;
  player.fireCooldown = Math.max(0, player.fireCooldown - dt);
  player.flash = Math.max(0, (player.flash ?? 0) - dt * 8);

  if (player.reloading <= 0) return;
  player.reloading -= dt;
  if (player.reloading > 0) return;

  player.reloading = 0;
  const needed = WEAPONS.pistol.clip - player.ammo;
  const loaded = Math.min(needed, player.reserve);
  player.ammo += loaded;
  player.reserve -= loaded;
  world.sfx('reloadDone');
}

export function updateBullets(world, dt) {
  for (let i = world.bullets.length - 1; i >= 0; i -= 1) {
    const bullet = world.bullets[i];
    bullet.life -= dt;
    if (bullet.life <= 0) {
      world.bullets.splice(i, 1);
      continue;
    }

    const previousX = bullet.x;
    const previousY = bullet.y;
    bullet.x += bullet.vx * dt;
    bullet.y += bullet.vy * dt;

    if (pointInBuilding(world.city, bullet.x, bullet.y)) {
      emit(world, 'spark', bullet.x, bullet.y, 3, {
        spread: 1.2, color: COLORS.gold, size: 2, life: 0.25,
      });
      world.bullets.splice(i, 1);
      continue;
    }

    if (bullet.owner === 'player') {
      let hit = false;
      for (const person of world.peds) {
        if (!person.alive || person.type === 'police' && world.wanted.level === 0) continue;
        if (Math.hypot(person.x - bullet.x, person.y - bullet.y) > 11) continue;
        damagePed(world, person, bullet.damage, {
          type: 'player', owner: 'player', x: previousX, y: previousY,
        });
        hit = true;
        break;
      }
      if (hit) {
        world.bullets.splice(i, 1);
        continue;
      }
      for (const car of world.vehicles) {
        if (!car.alive || car.id === world.player.inVehicle) continue;
        if (Math.hypot(car.x - bullet.x, car.y - bullet.y) > 20) continue;
        damageVehicle(world, car, bullet.damage * 0.8, 'bullet-player');
        emit(world, 'spark', bullet.x, bullet.y, 4, {
          spread: 1.4, color: COLORS.gold, size: 2, life: 0.3,
        });
        hit = true;
        break;
      }
      if (hit) world.bullets.splice(i, 1);
      continue;
    }

    if (Math.hypot(world.player.x - bullet.x, world.player.y - bullet.y) < 13) {
      world.damagePlayer(bullet.damage, bullet.owner);
      world.bullets.splice(i, 1);
    }
  }
}

export function spawnPickup(world, type, x, y) {
  world.pickups.push({
    id: world.nextId++,
    type,
    x,
    y,
    active: true,
    respawn: 0,
    bob: world.random() * 6,
  });
}

function respawnDelay(type) {
  return type === 'cash' ? 22 : 38;
}

export function updatePickups(world, dt) {
  for (const pickup of world.pickups) {
    if (!pickup.active) {
      pickup.respawn -= dt;
      if (pickup.respawn <= 0) pickup.active = true;
      continue;
    }

    pickup.bob += dt * 3;
    if (Math.hypot(pickup.x - world.player.x, pickup.y - world.player.y) > 24) continue;
    pickup.active = false;
    pickup.respawn = respawnDelay(pickup.type);

    const player = world.player;
    if (pickup.type === 'pistol') {
      player.hasPistol = true;
      player.weapon = 'pistol';
      player.reserve += 36;
      world.toast('Pistol found — 36 rounds');
    } else if (pickup.type === 'armor') {
      player.armor = Math.min(100, player.armor + 55);
      world.toast('Body armor +55');
    } else if (pickup.type === 'health') {
      player.hp = Math.min(100, player.hp + 45);
      world.toast('Health +45');
    } else {
      player.money += 180;
      world.toast('Petty cash +$180');
    }

    emit(world, 'spark', pickup.x, pickup.y, 8, {
      spread: 2, color: COLORS.gold, size: 3, life: 0.5,
    });
    world.sfx('pickup');
  }
}

export function givePistol(world) {
  world.player.hasPistol = true;
  world.player.weapon = 'pistol';
  world.player.reserve = Math.max(world.player.reserve, 48);
  world.player.ammo = Math.max(world.player.ammo, WEAPONS.pistol.clip);
}
