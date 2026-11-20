import { GUNS, PALETTE } from './config.js';
import { buildingUnder } from './city.js';
import { between } from './random.js';
import { flashLight, spray } from './effects.js';
import { panicNear, hurtPerson, personAhead } from './peds.js';
import { hurtCar } from './vehicles.js';

export function shoot(world, bullet) {
  world.bullets.push({
    id: world.nextId++,
    life: 1.4,
    damage: 10,
    color: PALETTE.amber,
    ...bullet,
  });
  if (world.bullets.length > 180) world.bullets.shift();
}

export function fireWeapon(world, controls) {
  const player = world.player;
  if (player.reloadClock > 0 || player.fireClock > 0) return;

  if (player.weapon === 'fists') {
    if (!controls.firePressed) return;
    const rules = GUNS.fists;
    player.fireClock = rules.delay;
    const victim = personAhead(world, player.x, player.y, player.angle, rules.reach);
    if (victim) {
      hurtPerson(world, victim, rules.damage, {
        type: 'player', owner: 'player', x: player.x, y: player.y,
      });
      world.crime(6, 'Assault');
      world.notify('Punch landed');
    }
    world.sound('punch');
    return;
  }

  if (!controls.fire) return;
  if (player.ammo <= 0) {
    beginReload(world);
    return;
  }

  const rules = GUNS.pistol;
  player.fireClock = rules.delay;
  player.ammo -= 1;
  player.muzzle = 0.11;
  const angle = player.angle + between(world.rng, -0.045, 0.045);
  const x = player.x + Math.cos(angle) * 18;
  const y = player.y + Math.sin(angle) * 18;
  shoot(world, {
    x, y,
    vx: Math.cos(angle) * 720, vy: Math.sin(angle) * 720,
    owner: 'player', damage: rules.damage, life: rules.reach / 720,
  });
  spray(world, 'muzzle', x, y, 3, {
    scatter: 0.35, angle, color: '#fff0a8', size: 4, life: 0.09,
  });
  flashLight(world, x, y, 'rgba(255,220,130,0.9)', 60, 0.07);
  panicNear(world, x, y, 290);
  world.sound('gunshot', 0.8);
  world.crime(11, 'Shooting');
  if (player.ammo === 0) beginReload(world);
}

export function beginReload(world) {
  const player = world.player;
  if (player.weapon !== 'pistol' || player.reloadClock > 0) return;
  if (player.reserve <= 0 || player.ammo >= GUNS.pistol.clip) return;
  player.reloadClock = GUNS.pistol.reload;
  world.sound('reload');
}

export function tickWeapon(world, dt) {
  const player = world.player;
  player.fireClock = Math.max(0, player.fireClock - dt);
  player.muzzle = Math.max(0, player.muzzle - dt * 8);
  if (player.reloadClock <= 0) return;
  player.reloadClock -= dt;
  if (player.reloadClock > 0) return;
  player.reloadClock = 0;
  const shortage = GUNS.pistol.clip - player.ammo;
  const loaded = Math.min(shortage, player.reserve);
  player.ammo += loaded;
  player.reserve -= loaded;
  world.sound('reloadDone');
}

export function tickBullets(world, dt) {
  for (let i = world.bullets.length - 1; i >= 0; i -= 1) {
    const bullet = world.bullets[i];
    bullet.life -= dt;
    if (bullet.life <= 0) {
      world.bullets.splice(i, 1);
      continue;
    }

    const oldX = bullet.x;
    const oldY = bullet.y;
    bullet.x += bullet.vx * dt;
    bullet.y += bullet.vy * dt;

    if (buildingUnder(world.city, bullet.x, bullet.y)) {
      spray(world, 'spark', bullet.x, bullet.y, 3, {
        scatter: 1.2, color: PALETTE.amber, size: 2, life: 0.25,
      });
      world.bullets.splice(i, 1);
      continue;
    }

    if (bullet.owner === 'player') {
      let consumed = false;
      for (const person of world.peds) {
        if (!person.alive || (person.type === 'officer' && world.wanted.stars === 0)) continue;
        if (Math.hypot(person.x - bullet.x, person.y - bullet.y) > 11) continue;
        hurtPerson(world, person, bullet.damage, {
          type: 'player', owner: 'player', x: oldX, y: oldY,
        });
        consumed = true;
        break;
      }
      if (consumed) {
        world.bullets.splice(i, 1);
        continue;
      }
      for (const car of world.vehicles) {
        if (!car.alive || car.id === world.player.carId) continue;
        if (Math.hypot(car.x - bullet.x, car.y - bullet.y) > 20) continue;
        hurtCar(world, car, bullet.damage * 0.8, 'bullet-player');
        spray(world, 'spark', bullet.x, bullet.y, 4, {
          scatter: 1.4, color: PALETTE.amber, size: 2, life: 0.3,
        });
        consumed = true;
        break;
      }
      if (consumed) world.bullets.splice(i, 1);
      continue;
    }

    if (Math.hypot(world.player.x - bullet.x, world.player.y - bullet.y) < 13) {
      world.hurtPlayer(bullet.damage, bullet.owner);
      world.bullets.splice(i, 1);
    }
  }
}

export function dropPickup(world, kind, x, y) {
  world.loot.push({
    id: world.nextId++,
    kind, x, y,
    active: true,
    respawn: 0,
    bob: world.rng() * 6,
  });
}

function reviveDelay(kind) {
  return kind === 'cash' ? 22 : 38;
}

export function tickPickups(world, dt) {
  for (const item of world.loot) {
    if (!item.active) {
      item.respawn -= dt;
      if (item.respawn <= 0) item.active = true;
      continue;
    }

    item.bob += dt * 3;
    if (Math.hypot(item.x - world.player.x, item.y - world.player.y) > 24) continue;
    item.active = false;
    item.respawn = reviveDelay(item.kind);

    const player = world.player;
    if (item.kind === 'pistol') {
      player.hasGun = true;
      player.weapon = 'pistol';
      player.reserve += 36;
      world.notify('Sidearm found — 36 rounds');
    } else if (item.kind === 'armor') {
      player.armor = Math.min(100, player.armor + 55);
      world.notify('Body armor +55');
    } else if (item.kind === 'health') {
      player.hp = Math.min(100, player.hp + 45);
      world.notify('Health +45');
    } else {
      player.money += 180;
      world.notify('Petty cash +$180');
    }

    spray(world, 'spark', item.x, item.y, 8, {
      scatter: 2, color: PALETTE.amber, size: 3, life: 0.5,
    });
    world.sound('pickup');
  }
}

export function armPlayer(world) {
  world.player.hasGun = true;
  world.player.weapon = 'pistol';
  world.player.reserve = Math.max(world.player.reserve, 48);
  world.player.ammo = Math.max(world.player.ammo, GUNS.pistol.clip);
}
