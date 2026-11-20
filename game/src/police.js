function wrap(angle) {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

export function createPolice(world) {
  const city = world.city;
  const random = world.random;
  const state = world.state;
  let spawnTimer = 0;
  let roadblockTimer = 0;
  const roadblocks = [];
  const captureTimer = { value: 0 };

  function patrolPilot() {
    return { throttle: 0, steer: 0 };
  }

  function chasePilot(dt, car) {
    const target = state.player.inCar ?? state.player;
    const dx = target.x - car.x;
    const dy = target.y - car.y;
    const distance = Math.hypot(dx, dy) || 1;
    const lead = state.player.inCar ? 0.28 : 0.05;
    const desired = Math.atan2(dy + (target.vy ?? 0) * lead, dx + (target.vx ?? 0) * lead);
    const difference = wrap(desired - car.angle);
    return {
      throttle: distance < 78 ? -0.25 : 0.98,
      steer: Math.max(-1, Math.min(1, difference * 2.4)),
      handbrake: Math.abs(difference) > 1.5 && Math.abs(car.speed) > 160,
    };
  }

  function spawnUnit(nearPlayer = false) {
    let x = city.policeStation.x;
    let y = city.policeStation.y;
    if (nearPlayer) {
      const angle = random.range(-Math.PI, Math.PI);
      x = state.player.x + Math.cos(angle) * 620;
      y = state.player.y + Math.sin(angle) * 620;
      if (city.isSolid(x, y, 30)) {
        x = city.policeStation.x;
        y = city.policeStation.y;
      }
    }
    const car = world.systems.vehicles.spawn('police', x, y, random.range(-Math.PI, Math.PI), { police: true, speed: 40 });
    car.pilot = state.wanted > 0 ? chasePilot : patrolPilot;
    car.siren = state.wanted > 0;
    return car;
  }

  function spawnFootOfficer() {
    const angle = random.range(-Math.PI, Math.PI);
    const distance = random.range(230, 360);
    let x = state.player.x + Math.cos(angle) * distance;
    let y = state.player.y + Math.sin(angle) * distance;
    if (city.isSolid(x, y, 14)) {
      x = state.player.x + 240;
      y = state.player.y;
    }
    const officer = world.systems.peds.makePed(x, y, { color: '#2b4b7a', cop: true, health: 100, speed: 92 });
    officer.timer = random.range(0.4, 1.4);
    return officer;
  }

  function spawnRoadblock() {
    const target = state.player.inCar ?? state.player;
    const angle = Math.atan2(target.vy ?? Math.sin(state.player.aim), target.vx ?? Math.cos(state.player.aim));
    const centreX = target.x + Math.cos(angle) * 480;
    const centreY = target.y + Math.sin(angle) * 480;
    if (city.isSolid(centreX, centreY, 40)) return;
    for (let index = -1; index <= 1; index += 1) {
      const car = world.systems.vehicles.spawn('police',
        centreX + Math.cos(angle + Math.PI / 2) * index * 96,
        centreY + Math.sin(angle + Math.PI / 2) * index * 96,
        angle + Math.PI / 2, { police: true });
      car.pilot = null;
      car.roadblock = true;
      roadblocks.push({ car, life: 22 });
    }
  }

  function reset() {
    spawnTimer = 0;
    roadblockTimer = 0;
    roadblocks.length = 0;
    captureTimer.value = 0;
    for (let index = 0; index < 3; index += 1) spawnUnit(false);
  }

  function step(dt) {
    const stars = state.wanted;
    spawnTimer -= dt;
    roadblockTimer -= dt;

    const units = state.policeCars.filter((car) => !car.roadblock);
    const desired = stars >= 5 ? 8 : stars >= 4 ? 6 : stars >= 3 ? 4 : stars >= 2 ? 2 : stars >= 1 ? 1 : 0;
    if (spawnTimer <= 0 && units.length < desired) {
      spawnUnit(units.length > 0);
      spawnTimer = stars >= 4 ? 1.6 : 2.6;
    }

    for (const car of state.policeCars) {
      car.siren = stars > 0;
      if (!car.roadblock) car.pilot = stars > 0 ? chasePilot : patrolPilot;
    }

    if (stars >= 3 && roadblockTimer <= 0) {
      spawnRoadblock();
      roadblockTimer = 14;
    }
    for (let index = roadblocks.length - 1; index >= 0; index -= 1) {
      roadblocks[index].life -= dt;
      if (roadblocks[index].life > 0) continue;
      const car = roadblocks[index].car;
      const listIndex = state.policeCars.indexOf(car);
      if (listIndex >= 0) state.policeCars.splice(listIndex, 1);
      roadblocks.splice(index, 1);
    }

    const officers = state.peds.filter((ped) => ped.cop);
    const wantedOfficers = stars >= 5 ? 6 : stars >= 4 ? 4 : stars >= 3 ? 2 : 0;
    if (spawnTimer <= 0 && officers.length < wantedOfficers) spawnFootOfficer();

    for (const officer of officers) {
      const dx = state.player.x - officer.x;
      const dy = state.player.y - officer.y;
      const distance = Math.hypot(dx, dy) || 1;
      officer.angle = Math.atan2(dy, dx);
      if (distance > 190) {
        const nx = officer.x + (dx / distance) * officer.speed * dt;
        const ny = officer.y + (dy / distance) * officer.speed * dt;
        if (!city.isSolid(nx, officer.y, 12)) officer.x = nx;
        if (!city.isSolid(officer.x, ny, 12)) officer.y = ny;
      }
      officer.timer -= dt;
      if (officer.timer <= 0 && distance < 480 && stars > 0) {
        officer.timer = random.range(0.9, 1.7);
        if (world.systems.combat) world.systems.combat.hostileShot(officer.x, officer.y, officer.angle, 0.12);
      }
    }

    if (stars === 0 || state.player.inCar || state.respawn > 0) {
      captureTimer.value = 0;
      return;
    }
    let closest = Infinity;
    for (const car of state.policeCars) closest = Math.min(closest, Math.hypot(car.x - state.player.x, car.y - state.player.y));
    for (const officer of officers) closest = Math.min(closest, Math.hypot(officer.x - state.player.x, officer.y - state.player.y));
    captureTimer.value = closest < 44 ? captureTimer.value + dt : Math.max(0, captureTimer.value - dt * 2);
    if (captureTimer.value > 1.1 && !state.busted) {
      state.busted = true;
      state.respawn = 2.2;
      if (world.systems.effects) world.systems.effects.toast('Busted! Police took you in.', '#e35b4f');
    }
  }

  return { reset, step, spawnUnit, spawnFootOfficer, chasePilot };
}
