import { FONT } from './config.js';
import { clampWorld, solidsNear } from './city.js';
import { ACTION_RELOAD } from './input.js';
import { between } from './random.js';
import { spot } from './story.js';
import { circleTouchesRect, distance } from './util.js';

const WEAPONS = {
  fists: { label: 'Fists', damage: 18, rate: 0.38, range: 42 },
  pistol: { label: 'Pistol', damage: 26, rate: 0.23, speed: 660, spread: 0.035, clip: 12, reserve: 84 },
  smg: { label: 'Ripple SMG', damage: 14, rate: 0.085, speed: 720, spread: 0.09, clip: 32, reserve: 180 },
};

const PICKUP_SPOTS = [
  { weapon: 'pistol', where: spot(6, 4, 30, 20) },
  { weapon: 'pistol', where: spot(2, 3, -20, 10) },
  { weapon: 'smg', where: spot(10, 2, 0, 20) },
  { weapon: 'smg', where: spot(4, 9, 20, 0) },
];

export function weaponInfo(name) {
  return WEAPONS[name] || WEAPONS.fists;
}

export function createCombatSystem(api) {
  const { state, rng } = api;
  const city = state.city;
  const bullets = [];
  const pickups = [];
  const owned = { fists: true, pistol: false, smg: false };
  const reserves = { pistol: 0, smg: 0 };
  let cooldown = 0;
  let reloadTimer = 0;
  let lastReport = -100;

  function publish() {
    state.weapon = state.weapon || 'fists';
    state.ammo = state.weapon === 'fists' ? 0 : state.ammo;
  }

  function reset() {
    bullets.length = 0;
    pickups.length = 0;
    owned.fists = true;
    owned.pistol = false;
    owned.smg = false;
    reserves.pistol = 0;
    reserves.smg = 0;
    cooldown = 0;
    reloadTimer = 0;
    lastReport = -100;
    state.weapon = 'fists';
    state.ammo = 0;
    for (const entry of PICKUP_SPOTS) {
      pickups.push({ weapon: entry.weapon, x: entry.where.x, y: entry.where.y, taken: false, phase: rng() * 6 });
    }
    publish();
  }

  function give(weapon, rounds) {
    if (!WEAPONS[weapon]) return;
    owned[weapon] = true;
    if (weapon !== 'fists') {
      reserves[weapon] += rounds;
      state.weapon = weapon;
      state.ammo = Math.min(WEAPONS[weapon].clip, rounds);
      reserves[weapon] -= state.ammo;
    }
    state.systems.toast(`${WEAPONS[weapon].label} picked up.`);
    const audio = state.systems && state.systems.audio;
    if (audio) audio.pickup();
    publish();
  }

  function spawnBullet(x, y, angle, speed, owner, damage, color = '#ffdf86') {
    if (bullets.length > 180) bullets.shift();
    bullets.push({
      x, y, angle, speed, owner, damage, color,
      life: 1.35,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
    });
  }

  function reload() {
    if (state.weapon === 'fists' || reloadTimer > 0) return;
    const weapon = WEAPONS[state.weapon];
    if (!weapon || state.ammo >= weapon.clip || reserves[state.weapon] <= 0) return;
    reloadTimer = 1.15;
    const audio = state.systems && state.systems.audio;
    if (audio) audio.reload();
  }

  function finishReload() {
    const weapon = WEAPONS[state.weapon];
    if (!weapon) return;
    const needed = weapon.clip - state.ammo;
    const loaded = Math.min(needed, reserves[state.weapon] || 0);
    state.ammo += loaded;
    reserves[state.weapon] = Math.max(0, (reserves[state.weapon] || 0) - loaded);
    publish();
  }

  function switchWeapon(choice) {
    if (choice === 1) {
      state.weapon = 'fists';
      state.ammo = 0;
    } else if (choice === 2 && owned.pistol) {
      state.weapon = 'pistol';
      state.ammo = Math.min(WEAPONS.pistol.clip, state.ammo || WEAPONS.pistol.clip);
    } else if (choice === 3 && owned.smg) {
      state.weapon = 'smg';
      state.ammo = Math.min(WEAPONS.smg.clip, state.ammo || WEAPONS.smg.clip);
    } else return;
    reloadTimer = 0;
    const audio = state.systems && state.systems.audio;
    if (audio) audio.ui();
    publish();
  }

  function punch() {
    const player = state.player;
    const fistX = player.x + Math.cos(player.angle) * 24;
    const fistY = player.y + Math.sin(player.angle) * 24;
    const fx = state.systems && state.systems.effects;
    if (fx) fx.burst(fistX, fistY, '#f7e4c8', 4, 70);
    const audio = state.systems && state.systems.audio;
    if (audio) audio.punch();
    const victim = state.systems.peds.nearest(fistX, fistY, WEAPONS.fists.range, (ped) => !ped.dead);
    if (victim) {
      state.systems.peds.damage(victim, WEAPONS.fists.damage, 'fist');
      if (victim.behavior === 'police') state.systems.wanted.add('hitpolice');
      else state.systems.wanted.add('attack');
    }
  }

  function fire() {
    const player = state.player;
    const name = state.weapon;
    const weapon = WEAPONS[name];
    const audio = state.systems && state.systems.audio;
    if (name === 'fists') {
      cooldown = weapon.rate;
      punch();
      return;
    }
    if (reloadTimer > 0) return;
    if (state.ammo <= 0) {
      reload();
      return;
    }
    cooldown = weapon.rate;
    state.ammo -= 1;
    const originX = player.x + Math.cos(player.angle) * 17;
    const originY = player.y + Math.sin(player.angle) * 17;
    const spread = between(rng, -weapon.spread, weapon.spread);
    spawnBullet(originX, originY, player.angle + spread, weapon.speed, 'player', weapon.damage, '#fff0b0');
    const fx = state.systems && state.systems.effects;
    if (fx) fx.muzzle(originX, originY, player.angle);
    if (audio) audio.gunshot(name === 'smg' ? 0.55 : 1);
    if (state.elapsed - lastReport > 2.2) {
      lastReport = state.elapsed;
      state.systems.wanted.add('shoot');
    }
    state.systems.peds.alert(player.x, player.y, 200);
    publish();
  }

  function damagePlayer(amount, source) {
    if (amount <= 0) return;
    const player = state.player;
    let hurt = amount;
    if (player.armor > 0) {
      const absorbed = Math.min(player.armor, hurt * 0.7);
      player.armor -= absorbed;
      hurt -= absorbed;
    }
    player.health -= hurt;
    const fx = state.systems && state.systems.effects;
    if (fx) fx.blood(player.x, player.y, 6);
    state.camera.kick(hurt > 12 ? 5 : 2.5);
    const audio = state.systems && state.systems.audio;
    if (audio) audio.hurt();
    if (source === 'police' && state.wantedStars < 4) state.systems.wanted.add('hitpolice');
    if (player.health <= 0) state.wasted = true;
  }

  function bulletHitsBuilding(bullet) {
    const scratch = [];
    for (const solid of solidsNear(city, bullet.x, bullet.y, 5, scratch)) {
      if (circleTouchesRect(bullet.x, bullet.y, 3, solid)) return true;
    }
    return false;
  }

  function updateBullets(dt) {
    const vehicles = state.systems.vehicles;
    const peds = state.systems.peds;
    const fx = state.systems && state.systems.effects;
    for (let index = bullets.length - 1; index >= 0; index -= 1) {
      const bullet = bullets[index];
      bullet.life -= dt;
      bullet.x += bullet.vx * dt;
      bullet.y += bullet.vy * dt;
      let consumed = bullet.life <= 0 || bulletHitsBuilding(bullet);
      const outside = clampWorld(city, bullet.x, bullet.y, 0);
      if (outside.x !== bullet.x || outside.y !== bullet.y) consumed = true;
      if (!consumed && bullet.owner === 'player') {
        const victim = peds.nearest(bullet.x, bullet.y, 12, (ped) => !ped.dead);
        if (victim) {
          peds.damage(victim, bullet.damage, 'bullet');
          consumed = true;
        }
        if (!consumed) {
          const car = vehicles.nearest(bullet.x, bullet.y, 22, (item) => item.occupiedBy !== 'player');
          if (car) {
            vehicles.damage(car, bullet.damage * 1.3, 'bullet');
            consumed = true;
          }
        }
      } else if (!consumed && (bullet.owner === 'enemy' || bullet.owner === 'police')) {
        const target = state.player.inVehicle ? vehicles.playerVehicle() : state.player;
        if (target && distance(bullet.x, bullet.y, target.x, target.y) < 15) {
          if (state.player.inVehicle && target) vehicles.damage(target, bullet.damage * 0.8, 'bullet');
          else damagePlayer(bullet.damage, bullet.owner);
          consumed = true;
        }
      }
      if (consumed) {
        if (fx) fx.spark(bullet.x, bullet.y, bullet.color, 3);
        bullets.splice(index, 1);
      }
    }
  }

  function collectPickups() {
    const player = state.player;
    for (const pickup of pickups) {
      if (pickup.taken) continue;
      if (distance(player.x, player.y, pickup.x, pickup.y) > 24) continue;
      pickup.taken = true;
      const weapon = WEAPONS[pickup.weapon];
      give(pickup.weapon, Math.max(weapon.clip, Math.round(weapon.clip * 1.5)));
    }
  }

  function step(dt, controls) {
    cooldown = Math.max(0, cooldown - dt);
    if (reloadTimer > 0) {
      reloadTimer -= dt;
      if (reloadTimer <= 0) finishReload();
    }
    if (controls && typeof controls === 'object') {
      if (controls.actions & ACTION_RELOAD) reload();
      if (controls.weapon) switchWeapon(controls.weapon);
      if (controls.attack && cooldown <= 0) fire();
    }
    updateBullets(dt);
    collectPickups();
    publish();
  }

  return {
    bullets,
    pickups,
    reset,
    step,
    give,
    reload,
    spawnBullet,
    damagePlayer,
    reloading() { return reloadTimer > 0; },
    reserveFor(name) { return reserves[name] || 0; },
    owns: (name) => Boolean(owned[name]),
    restore(loadout) {
      const data = loadout || {};
      owned.fists = true;
      owned.pistol = Boolean(data.pistol);
      owned.smg = Boolean(data.smg);
      reserves.pistol = Math.max(0, Math.min(9999, Math.floor(data.pistolReserve || 0)));
      reserves.smg = Math.max(0, Math.min(9999, Math.floor(data.smgReserve || 0)));
      const weapon = data.weapon;
      state.weapon = (weapon === 'pistol' && owned.pistol) || (weapon === 'smg' && owned.smg) ? weapon : 'fists';
      const limit = state.weapon === 'fists' ? 0 : WEAPONS[state.weapon].clip;
      state.ammo = Math.max(0, Math.min(limit, Math.floor(data.ammo || 0)));
      cooldown = 0;
      reloadTimer = 0;
      publish();
    },
  };
}

export function draw(ctx, state) {
  const system = state.systems && state.systems.combat;
  if (!system) return;
  for (const pickup of system.pickups) {
    if (pickup.taken) continue;
    const bob = Math.sin(state.elapsed * 3 + pickup.phase) * 3;
    ctx.fillStyle = 'rgba(18, 26, 34, 0.3)';
    ctx.beginPath();
    ctx.ellipse(pickup.x, pickup.y + 8, 13, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = pickup.weapon === 'pistol' ? '#e0b553' : '#6ec3c9';
    ctx.fillRect(pickup.x - 10, pickup.y - 9 + bob, 20, 15);
    ctx.fillStyle = '#28333e';
    ctx.fillRect(pickup.x - 6, pickup.y - 5 + bob, 12, 4);
  }
  for (const bullet of system.bullets) {
    ctx.strokeStyle = bullet.color;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(bullet.x, bullet.y);
    ctx.lineTo(bullet.x - Math.cos(bullet.angle) * 11, bullet.y - Math.sin(bullet.angle) * 11);
    ctx.stroke();
  }
  ctx.font = `700 11px ${FONT}`;
}
