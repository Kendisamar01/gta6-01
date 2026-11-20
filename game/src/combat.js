import { WEAPONS } from './config.js';

export function createCombat(world) {
  const city = world.city;
  const random = world.random;
  const state = world.state;
  let cooldown = 0;
  let pickupClock = 0;

  function spawnPickup(kind, x, y) {
    if (city.isSolid(x, y, 16)) return;
    state.pickups.push({ kind, x, y, active: true, bob: random.range(0, 6), life: 0 });
  }

  function reset() {
    state.bullets.length = 0;
    state.pickups.length = 0;
    cooldown = 0;
    pickupClock = 0;
    const start = city.start;
    spawnPickup('pistol', start.x + 70, start.y - 40);
    spawnPickup('health', start.x - 80, start.y + 60);
    spawnPickup('armor', city.roadsX[5] + 50, city.roadsY[6] - 50);
    spawnPickup('smg', city.roadsX[8] - 50, city.roadsY[8] + 50);
    spawnPickup('cash', city.roadsX[2] + 60, city.roadsY[7] + 60);
  }

  function reload() {
    const player = state.player;
    const weapon = WEAPONS[player.weapon];
    if (!weapon || weapon.ammo === Infinity || player.reload > 0 || player.reserve <= 0 || player.ammo >= weapon.ammo) return;
    player.reload = 1.25;
    if (world.systems.audio) world.systems.audio.blip(420);
  }

  function fire() {
    const player = state.player;
    const weapon = WEAPONS[player.weapon];
    if (!weapon || player.inCar) return;

    if (player.weapon === 'fists') {
      cooldown = weapon.rate;
      player.punch = 1;
      let struck = false;
      for (const ped of state.peds.slice()) {
        const dx = ped.x - player.x;
        const dy = ped.y - player.y;
        const distance = Math.hypot(dx, dy);
        if (distance > weapon.range) continue;
        if (Math.abs(Math.atan2(Math.sin(Math.atan2(dy, dx) - player.aim), Math.cos(Math.atan2(dy, dx) - player.aim))) > 0.9) continue;
        struck = true;
        if (world.systems.peds) world.systems.peds.hurt(ped, weapon.damage, !ped.cop);
        if (ped.cop && world.systems.wanted) world.systems.wanted.add(3, 'Assault on an officer');
      }
      if (world.systems.audio) world.systems.audio.punch();
      if (struck && world.systems.effects) world.systems.effects.puff(player.x + Math.cos(player.aim) * 34, player.y + Math.sin(player.aim) * 34, '#e3c2a0', 4, 45, 0.3);
      return;
    }

    if (player.reload > 0) return;
    if (player.ammo <= 0) {
      if (player.reserve > 0) reload();
      else if (world.systems.audio) world.systems.audio.blip(220);
      return;
    }
    player.ammo -= 1;
    player.flash = 0.12;
    cooldown = weapon.rate;
    const spread = random.range(-0.035, 0.035);
    const angle = player.aim + spread;
    state.bullets.push({
      x: player.x + Math.cos(angle) * 24,
      y: player.y + Math.sin(angle) * 24,
      angle, speed: weapon.speed, damage: weapon.damage,
      life: weapon.range / weapon.speed, hostile: false,
    });
    if (world.systems.audio) world.systems.audio.shot();
    if (world.systems.effects) world.systems.effects.puff(player.x + Math.cos(angle) * 30, player.y + Math.sin(angle) * 30, '#ffd67a', 3, 40, 0.18);
    if (world.systems.peds) world.systems.peds.panic(player.x, player.y, 400, 3);
    if (world.systems.wanted) world.systems.wanted.add(1, 'Discharging a firearm');
  }

  function hostileShot(x, y, angle, spread = 0.1) {
    const shotAngle = angle + random.range(-spread, spread);
    state.bullets.push({
      x: x + Math.cos(shotAngle) * 18,
      y: y + Math.sin(shotAngle) * 18,
      angle: shotAngle, speed: 720, damage: 9,
      life: 0.85, hostile: true,
    });
    if (world.systems.audio) world.systems.audio.tone(190, 0.07, 'square', 0.07);
  }

  function switchWeapon(number) {
    const player = state.player;
    if (number === 1) player.weapon = 'fists';
    if (number === 2 && player.ownedPistol !== false) player.weapon = 'pistol';
    if (number === 3 && player.ownedSmg !== false) player.weapon = 'smg';
    if (world.systems.audio) world.systems.audio.blip(700);
  }

  function give(kind) {
    const player = state.player;
    if (kind === 'pistol' || kind === 'smg') {
      player.weapon = kind;
      player.ammo = WEAPONS[kind].ammo;
      player.reserve = WEAPONS[kind].ammo * 3;
      player[kind === 'pistol' ? 'ownedPistol' : 'ownedSmg'] = true;
    } else if (kind === 'health') {
      player.health = Math.min(100, player.health + 45);
    } else if (kind === 'armor') {
      player.armor = Math.min(100, player.armor + 65);
    } else if (kind === 'cash') {
      player.money += 250;
      state.moneyEarned += 250;
    }
    if (world.systems.audio) world.systems.audio.blip(980);
    if (world.systems.effects) world.systems.effects.toast(`Picked up ${kind}`, '#6dd49a');
  }

  function step(dt, control) {
    const player = state.player;
    cooldown = Math.max(0, cooldown - dt);
    if (control.weapon) switchWeapon(control.weapon);
    if (control.reload) reload();
    if (control.shoot && cooldown <= 0) fire();

    if (player.reload === 0 && player.reloading === true) {
      const weapon = WEAPONS[player.weapon];
      const needed = weapon.ammo - player.ammo;
      const moved = Math.min(needed, player.reserve);
      player.ammo += moved;
      player.reserve -= moved;
      player.reloading = false;
    }
    if (player.reload > 0) player.reloading = true;

    for (let index = state.bullets.length - 1; index >= 0; index -= 1) {
      const bullet = state.bullets[index];
      bullet.x += Math.cos(bullet.angle) * bullet.speed * dt;
      bullet.y += Math.sin(bullet.angle) * bullet.speed * dt;
      bullet.life -= dt;
      if (bullet.life <= 0 || city.isSolid(bullet.x, bullet.y, 2)) {
        if (world.systems.effects) world.systems.effects.spark(bullet.x, bullet.y);
        state.bullets.splice(index, 1);
        continue;
      }
      let consumed = false;
      if (bullet.hostile) {
        if (!player.inCar && Math.hypot(bullet.x - player.x, bullet.y - player.y) < 17) {
          const absorbed = Math.min(player.armor, bullet.damage * 0.7);
          player.armor -= absorbed;
          player.health -= bullet.damage - absorbed;
          consumed = true;
          if (world.systems.effects) world.systems.effects.puff(player.x, player.y, '#e35b4f', 4, 45, 0.3);
        }
      } else {
        for (const ped of state.peds.slice()) {
          if (Math.hypot(bullet.x - ped.x, bullet.y - ped.y) > 12) continue;
          if (world.systems.peds) world.systems.peds.hurt(ped, bullet.damage, !ped.cop);
          if (ped.cop) world.systems.wanted.add(3, 'Shooting an officer');
          consumed = true;
          break;
        }
        if (!consumed) {
          for (const car of state.vehicles.concat(state.policeCars)) {
            if (Math.hypot(bullet.x - car.x, bullet.y - car.y) > Math.max(car.length, car.width) * 0.5) continue;
            if (car.police) world.systems.wanted.add(2, 'Attacking police');
            world.systems.vehicles.damage(car, bullet.damage * 0.45);
            consumed = true;
            break;
          }
        }
      }
      if (consumed) state.bullets.splice(index, 1);
    }

    pickupClock += dt;
    for (const pickup of state.pickups) {
      pickup.bob += dt * 3;
      if (Math.hypot(pickup.x - player.x, pickup.y - player.y) < 30) {
        pickup.active = false;
        give(pickup.kind);
      }
    }
    if (pickupClock > 26) {
      pickupClock = 0;
      const node = city.randomNode(random);
      const spotX = node.x + random.range(-90, 90);
      const spotY = node.y + random.range(-90, 90);
      spawnPickup(random.pick(['pistol', 'health', 'cash', 'armor']), spotX, spotY);
    }
  }

  return { reset, step, fire, reload, hostileShot, give, switchWeapon };
}
