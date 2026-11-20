import { SIDES, STORY } from './story.js';

function wrap(angle) {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

export function createMissions(world) {
  const city = world.city;
  const random = world.random;
  const state = world.state;
  let nextTimer = 0;
  let stageClock = 0;
  let targetCar = null;
  let escort = null;
  const enemies = [];

  function location(index, shift = 0) {
    const roadsX = city.roadsX;
    const roadsY = city.roadsY;
    const column = 2 + ((index * 3 + shift) % Math.max(1, roadsX.length - 4));
    const row = 2 + ((index * 5 + shift * 2) % Math.max(1, roadsY.length - 4));
    return { x: roadsX[column], y: roadsY[row] };
  }

  function marker(x, y, color = '#f2b544') {
    world.state.markers.push({ x, y, color });
    return world.state.markers[world.state.markers.length - 1];
  }

  function clearMarkers() {
    state.markers.length = 0;
  }

  function say(lines) {
    state.dialogue = lines && lines.length ? { lines, index: 0, timer: 4.5 } : null;
  }

  function start(index) {
    if (index >= STORY.length) {
      state.objective = 'All story jobs complete. Solara Bay is yours.';
      if (world.systems.effects) world.systems.effects.toast('Story complete!', '#6dd49a');
      return;
    }
    const job = STORY[index];
    const spot = location(index);
    state.missionIndex = index;
    state.mission = {
      index, stage: 0, timer: job.timeout, target: spot,
      destination: location(index, 3),
      title: job.title, reward: job.reward, respect: job.respect,
    };
    state.objective = `${job.title} — ${job.client}`;
    state.dialogue = { lines: job.lines, index: 0, timer: 4.5 };
    stageClock = 0;
    clearMarkers();
    marker(spot.x, spot.y);
    nextTimer = 0;
    if (world.systems.effects) world.systems.effects.toast(`New job: ${job.title}`, '#f2b544');
    if (world.systems.audio) world.systems.audio.blip(760);

    if (job.carType) {
      targetCar = world.systems.vehicles.spawn(job.carType,
        spot.x + 44, spot.y + 46, random.range(-Math.PI, Math.PI), { locked: false });
      targetCar.missionTarget = true;
    } else targetCar = null;

    if (job.stages.includes('chase')) {
      const runaway = world.systems.vehicles.spawn('sport', spot.x + 120, spot.y, 0, { color: '#b6534c', speed: 190 });
      runaway.missionTarget = true;
      runaway.pilot = (dt, car) => {
        const dx = car.x - state.player.x;
        const dy = car.y - state.player.y;
        const angle = Math.atan2(dy, dx);
        return { throttle: 0.98, steer: Math.max(-1, Math.min(1, wrap(angle - car.angle) * 1.8)), handbrake: false };
      };
      targetCar = runaway;
    }
  }

  function complete() {
    const mission = state.mission;
    if (!mission) return;
    const job = STORY[mission.index];
    state.player.money += job.reward;
    state.moneyEarned += job.reward;
    state.respect += job.respect;
    state.missionIndex = mission.index + 1;
    state.mission = null;
    clearMarkers();
    state.objective = '';
    say([`${job.client}: Clean work. There is more if you want it.`]);
    if (world.systems.effects) world.systems.effects.toast(`Job complete   + $${job.reward}   + ${job.respect} respect`, '#6dd49a');
    if (world.systems.audio) world.systems.audio.blip(940);
    nextTimer = 5;
  }

  function fail(reason) {
    const index = state.mission ? state.mission.index : state.missionIndex;
    state.mission = null;
    clearMarkers();
    state.objective = '';
    state.missionIndex = index;
    if (world.systems.effects) world.systems.effects.toast(`Job failed: ${reason}. Retrying…`, '#e35b4f');
    nextTimer = 3.5;
  }

  function spawnEnemies(count, around) {
    for (let index = 0; index < count; index += 1) {
      const angle = (index / count) * Math.PI * 2 + random.range(-0.3, 0.3);
      const x = around.x + Math.cos(angle) * random.range(120, 210);
      const y = around.y + Math.sin(angle) * random.range(120, 210);
      if (city.isSolid(x, y, 14)) continue;
      const enemy = world.systems.peds.makePed(x, y, { color: '#9d4c4c', health: 80, enemy: true, speed: 76 });
      enemy.timer = random.range(0.6, 1.5);
      enemies.push(enemy);
    }
  }

  function startSide(id) {
    const side = SIDES.find((entry) => entry.id === id);
    if (!side || state.sideActivity) return;
    const activity = { id, stage: 0, timer: id === 'taxi' ? 90 : id === 'rampage' ? 45 : 70, target: location(state.missionIndex + 7), kills: 0 };
    state.sideActivity = activity;
    state.objective = `${side.name} — ${side.text}`;
    clearMarkers();
    marker(activity.target.x, activity.target.y, '#63c7d8');
    if (id === 'rampage') spawnEnemies(6, state.player);
    if (id === 'courier') {
      activity.checkpoints = [location(1, 1), location(2, 2), location(3, 3)];
      marker(activity.checkpoints[0].x, activity.checkpoints[0].y, '#63c7d8');
    }
    if (world.systems.effects) world.systems.effects.toast(`Side activity: ${side.name}`, '#63c7d8');
  }

  function finishSide() {
    const activity = state.sideActivity;
    const side = SIDES.find((entry) => entry.id === activity.id);
    state.player.money += side.reward;
    state.moneyEarned += side.reward;
    state.respect += 2;
    state.sideDone = (state.sideDone ?? 0) + 1;
    state.sideActivity = null;
    state.objective = '';
    clearMarkers();
    if (world.systems.effects) world.systems.effects.toast(`${side.name} complete   + $${side.reward}`, '#6dd49a');
    nextTimer = Math.max(nextTimer, 5);
  }

  function stepSide(dt) {
    const activity = state.sideActivity;
    if (!activity) return;
    activity.timer -= dt;
    if (activity.timer <= 0) {
      state.sideActivity = null;
      state.objective = '';
      clearMarkers();
      if (world.systems.effects) world.systems.effects.toast('Side activity timed out.', '#e35b4f');
      return;
    }
    if (activity.id === 'rampage') {
      const alive = enemies.filter((enemy) => !enemy.dead && state.peds.includes(enemy)).length;
      if (alive === 0) finishSide();
      return;
    }
    if (activity.id === 'courier') {
      const checkpoint = activity.checkpoints[activity.stage];
      if (Math.hypot(state.player.x - checkpoint.x, state.player.y - checkpoint.y) < 58) {
        activity.stage += 1;
        clearMarkers();
        if (activity.stage >= activity.checkpoints.length) finishSide();
        else marker(activity.checkpoints[activity.stage].x, activity.checkpoints[activity.stage].y, '#63c7d8');
      }
      return;
    }
    if (Math.hypot(state.player.x - activity.target.x, state.player.y - activity.target.y) < 66) {
      if (activity.stage === 0) {
        activity.stage = 1;
        activity.target = location(state.missionIndex + 11);
        clearMarkers();
        marker(activity.target.x, activity.target.y, '#63c7d8');
      } else finishSide();
    }
  }

  function stepMission(dt) {
    const mission = state.mission;
    if (!mission) return;
    const job = STORY[mission.index];
    const kind = job.stages[mission.stage];
    stageClock += dt;
    if (job.timeout > 0) {
      mission.timer -= dt;
      if (mission.timer <= 0) {
        fail('out of time');
        return;
      }
    }

    if (kind === 'goto') {
      if (Math.hypot(state.player.x - mission.target.x, state.player.y - mission.target.y) < 70) advance();
    } else if (kind === 'talk') {
      state.objective = `${job.client} is talking…`;
      if (stageClock > 1.8) {
        state.objective = job.title;
        advance();
      }
    } else if (kind === 'steal') {
      if (!targetCar || targetCar.dead) {
        fail('target vehicle destroyed');
        return;
      }
      state.objective = `${job.title} — steal the ${world.systems.vehicles.spec(job.carType).name}`;
      if (state.player.inCar === targetCar) {
        targetCar.stolen = true;
        clearMarkers();
        marker(mission.destination.x, mission.destination.y);
        advance();
      }
    } else if (kind === 'deliver' || kind === 'timed') {
      state.objective = `${job.title} — deliver the vehicle`;
      if (state.player.inCar && Math.hypot(state.player.x - mission.destination.x, state.player.y - mission.destination.y) < 90) advance();
    } else if (kind === 'chase') {
      if (!targetCar || targetCar.dead || targetCar.speed < 12) {
        advance();
        return;
      }
      state.objective = `${job.title} — ram the fleeing car`;
      if (stageClock > 95) fail('the suspect escaped');
    } else if (kind === 'survive') {
      if (enemies.length === 0) spawnEnemies(4 + mission.index, mission.target);
      state.objective = `${job.title} — survive the shootout`;
      const alive = enemies.filter((enemy) => state.peds.includes(enemy));
      for (const enemy of alive) {
        const dx = state.player.x - enemy.x;
        const dy = state.player.y - enemy.y;
        const distance = Math.hypot(dx, dy) || 1;
        enemy.angle = Math.atan2(dy, dx);
        enemy.timer -= dt;
        if (enemy.timer <= 0 && distance < 520) {
          enemy.timer = random.range(0.9, 1.8);
          world.systems.combat.hostileShot(enemy.x, enemy.y, enemy.angle, 0.16);
        }
      }
      if (stageClock > 20 || alive.length === 0) {
        for (const enemy of enemies) {
          const index = state.peds.indexOf(enemy);
          if (index >= 0) state.peds.splice(index, 1);
        }
        enemies.length = 0;
        advance();
      }
    } else if (kind === 'escort') {
      if (!escort) {
        escort = world.systems.peds.makePed(state.player.x + 44, state.player.y + 44, { color: '#d5b06a', health: 120, speed: 110 });
      }
      if (!state.peds.includes(escort)) {
        fail('the escort was lost');
        return;
      }
      const dx = state.player.x - escort.x;
      const dy = state.player.y - escort.y;
      const distance = Math.hypot(dx, dy) || 1;
      if (distance > 90) {
        const speed = Math.max(160, Math.abs(state.player.inCar?.speed ?? 0) + 70);
        const nx = escort.x + (dx / distance) * speed * dt;
        const ny = escort.y + (dy / distance) * speed * dt;
        if (!city.isSolid(nx, escort.y, 12)) escort.x = nx;
        if (!city.isSolid(escort.x, ny, 12)) escort.y = ny;
      }
      clearMarkers();
      marker(mission.destination.x, mission.destination.y);
      state.objective = `${job.title} — keep the escort together`;
      if (Math.hypot(state.player.x - mission.destination.x, state.player.y - mission.destination.y) < 95) advance();
    } else if (kind === 'heat') {
      world.systems.wanted.add(4, 'Job heat');
      advance();
    } else if (kind === 'escape') {
      state.objective = `${job.title} — lose the police`;
      if (state.wanted === 0) advance();
    } else advance();
  }

  function advance() {
    const mission = state.mission;
    if (!mission) return;
    mission.stage += 1;
    stageClock = 0;
    if (mission.stage >= STORY[mission.index].stages.length) complete();
    else if (world.systems.effects) world.systems.effects.toast('Objective updated', '#f2b544');
  }

  function reset() {
    nextTimer = 0;
    stageClock = 0;
    targetCar = null;
    escort = null;
    enemies.length = 0;
    clearMarkers();
    state.mission = null;
    state.sideActivity = null;
    state.objective = '';
    state.dialogue = null;
  }

  function step(dt) {
    if (state.dialogue) {
      state.dialogue.timer -= dt;
      if (state.dialogue.timer <= 0) {
        state.dialogue.index += 1;
        state.dialogue.timer = 4.5;
        if (state.dialogue.index >= state.dialogue.lines.length) state.dialogue = null;
      }
    }
    if (nextTimer > 0) {
      nextTimer -= dt;
      if (nextTimer <= 0) start(state.missionIndex ?? 0);
      return;
    }
    stepSide(dt);
    stepMission(dt);
  }

  return { reset, step, start, fail, complete, startSide, nextJob: () => nextTimer };
}
