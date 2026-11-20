import { hashCell } from './random.js';
import { MISSIONS, SIDE_ACTIVITIES, characterName, dialogueFor, missionAt } from './story.js';

function distance(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}

export function createMissions(world) {
  const state = world.state;
  const run = {
    index: 0,
    phase: 'brief',
    mission: MISSIONS[0],
    side: null,
    chat: [],
    chatIndex: 0,
    timer: 0,
    elapsed: 0,
    checkpoint: 0,
    wrecks: 0,
    peakStars: 0,
    targetVehicle: null,
    courier: null,
    escort: null,
    enemies: [],
    respect: 0,
    finished: 0,
    fireClock: 0,
    lastSuccess: true,
    lastSide: null,
  };
  state.missions = run;
  state.mission = { marker: null, objective: '' };

  function system(name) {
    return state.systems ? state.systems[name] : null;
  }

  function audio(name) {
    const manager = system('audio');
    if (manager) manager.play(name);
  }

  function toast(message, kind) {
    const hud = system('hud');
    if (hud) hud.toast(message, kind);
  }

  function setMarker(x, y, objective) {
    state.mission.marker = { x, y };
    state.mission.objective = objective;
    run.objective = objective;
  }

  function beginChat(phase) {
    run.chat = dialogueFor(run.mission, phase);
    run.chatIndex = 0;
    run.phase = phase === 'brief' ? 'brief' : 'result';
  }

  function start(index) {
    run.index = ((index % MISSIONS.length) + MISSIONS.length) % MISSIONS.length;
    run.mission = MISSIONS[run.index];
    run.side = null;
    run.elapsed = 0;
    run.timer = run.mission.time || 0;
    run.checkpoint = 0;
    run.wrecks = 0;
    run.peakStars = 0;
    run.targetVehicle = null;
    run.courier = null;
    run.escort = null;
    run.enemies.length = 0;
    beginChat('brief');
    const target = run.mission.target || { x: state.player.x, y: state.player.y };
    setMarker(target.x, target.y, run.mission.objective);
    audio('blip');
  }

  function startSide(activity) {
    run.side = activity;
    run.mission = activity;
    run.phase = 'active';
    run.chat = activity.brief || [];
    run.chatIndex = run.chat.length;
    run.elapsed = 0;
    run.timer = activity.type === 'rampage' ? 50 : 0;
    run.checkpoint = 0;
    run.wrecks = 0;
    run.targetVehicle = null;
    run.courier = null;
    run.escort = null;
    setMarker(activity.target.x, activity.target.y, activity.objective);
    toast(activity.title, 'info');
    audio('blip');
  }

  function clearActors() {
    const vehicles = system('vehicles');
    if (vehicles) {
      if (run.targetVehicle) vehicles.remove(run.targetVehicle);
      if (run.courier) vehicles.remove(run.courier);
    }
    if (Array.isArray(state.peds)) {
      for (let index = 0; index < run.enemies.length; index += 1) {
        const pedIndex = state.peds.indexOf(run.enemies[index]);
        if (pedIndex >= 0) state.peds.splice(pedIndex, 1);
      }
      if (run.escort) {
        const escortIndex = state.peds.indexOf(run.escort);
        if (escortIndex >= 0) state.peds.splice(escortIndex, 1);
      }
    }
    run.enemies.length = 0;
    run.targetVehicle = null;
    run.courier = null;
    run.escort = null;
  }

  function reward(success) {
    const mission = run.mission;
    if (!mission || !mission.reward) return;
    if (success) {
      state.player.money += mission.reward.money || 0;
      run.respect += mission.reward.respect || 0;
      if (mission.reward.weapon) {
        const combat = system('combat');
        if (combat) combat.giveWeapon(mission.reward.weapon);
      }
      if (mission.reward.heat === 0) {
        const wanted = system('wanted');
        if (wanted) {
          wanted.record.heat = 0;
          wanted.record.stars = 0;
          state.player.wanted = 0;
        }
      }
      run.finished += 1;
      audio('confirm');
    } else {
      audio('fail');
    }
    beginChat(success ? 'success' : 'fail');
    run.lastSuccess = success;
    run.lastSide = run.side;
    toast(success ? `${mission.title} complete — $${mission.reward.money || 0}` : `${mission.title} failed`, success ? 'good' : 'danger');
    setMarker(state.player.x, state.player.y, success ? 'Mission complete — press E to continue' : 'Mission failed — press E to retry');
  }

  function spawnMissionVehicle(type, target) {
    const vehicles = system('vehicles');
    if (!vehicles) return null;
    const hash = hashCell(state.seed, Math.floor(target.x), Math.floor(target.y), 913);
    const angle = (hash % 4) * Math.PI / 2;
    const vehicle = vehicles.spawn(type, target.x - Math.cos(angle) * 40, target.y - Math.sin(angle) * 40, angle, { mission: true, driver: null });
    vehicle.color = type === 'taxi' ? '#efc43e' : '#e0504b';
    return vehicle;
  }

  function spawnEnemies(count, around) {
    const peds = system('peds');
    if (!peds) return;
    for (let index = 0; index < count; index += 1) {
      const hash = hashCell(state.seed, Math.floor(around.x) + index, Math.floor(around.y), 927);
      const angle = (hash % 360) * Math.PI / 180;
      const ped = peds.spawnAt(around.x + Math.cos(angle) * (130 + index * 22), around.y + Math.sin(angle) * (130 + index * 22), 'enemy');
      ped.shirt = '#7d4a4a';
      ped.walkSpeed = 72;
      ped.health = 80;
      run.enemies.push(ped);
    }
  }

  function enemyFire(dt) {
    run.fireClock -= dt;
    if (run.fireClock > 0) return;
    const combat = system('combat');
    if (!combat) return;
    for (let index = 0; index < run.enemies.length; index += 1) {
      const enemy = run.enemies[index];
      if (enemy.dead) continue;
      if (distance(enemy.x, enemy.y, state.player.x, state.player.y) < 380) {
        combat.enemyFire(enemy.x, enemy.y, state.player, 0.4);
        run.fireClock = 0.55;
        break;
      }
    }
  }

  function interact() {
    const player = state.player;
    if (run.phase === 'brief' || run.phase === 'result') {
      run.chatIndex += 1;
      if (run.chatIndex < run.chat.length) {
        audio('blip');
        return true;
      }
      if (run.phase === 'brief') {
        run.phase = 'active';
        run.elapsed = 0;
        const mission = run.mission;
        if (mission.type === 'steal' && !run.targetVehicle) {
          run.targetVehicle = spawnMissionVehicle(mission.vehicle, mission.target);
          if (run.targetVehicle) setMarker(run.targetVehicle.x, run.targetVehicle.y, mission.objective);
        } else if (mission.type === 'chase' && !run.courier) {
          run.courier = spawnMissionVehicle('taxi', mission.target);
          if (run.courier) {
            run.courier.aiControl = { throttle: 0.95, steer: 0 };
            run.courier.speed = 120;
          }
        } else if (mission.type === 'survive' || mission.type === 'finale') {
          spawnEnemies(mission.type === 'survive' ? 4 : 2, mission.target);
          run.timer = mission.type === 'survive' ? 40 : 0;
        } else if (mission.type === 'escort' && !run.escort) {
          const peds = system('peds');
          if (peds) {
            run.escort = peds.spawnAt(player.x + 26, player.y + 12, 'escort');
            run.escort.shirt = '#7f63a5';
            run.escort.health = 80;
            run.escort.walkSpeed = 68;
          }
        } else if (mission.type === 'escape') {
          toast('Make some noise. Get to four stars.', 'warn');
        }
        toast(mission.objective, 'info');
      } else {
        const retry = !run.lastSuccess;
        const side = run.lastSide;
        const index = run.index;
        clearActors();
        run.side = null;
        run.lastSide = null;
        if (retry && side) startSide(side);
        else if (retry) start(index);
        else start(index + 1);
      }
      audio('confirm');
      return true;
    }
    if (run.phase === 'idle') {
      for (let index = 0; index < SIDE_ACTIVITIES.length; index += 1) {
        const activity = SIDE_ACTIVITIES[index];
        if (distance(player.x, player.y, activity.target.x, activity.target.y) < 70) {
          startSide(activity);
          return true;
        }
      }
    }
    return false;
  }

  function activeMission() {
    return run.mission;
  }

  function checkObjective(dt) {
    const player = state.player;
    const mission = run.mission;
    if (!mission) return;
    run.elapsed += dt;
    if (run.timer > 0) {
      run.timer -= dt;
      if (run.timer <= 0) {
        reward(false);
        return;
      }
    }
    if (run.side) {
      checkSide(mission);
      return;
    }
    const target = mission.target || player;
    switch (mission.type) {
      case 'goto':
      case 'timed':
      case 'finale':
        if (distance(player.x, player.y, target.x, target.y) < 58) reward(true);
        break;
      case 'steal':
        if (run.targetVehicle) {
          setMarker(run.targetVehicle.x, run.targetVehicle.y, mission.objective);
          if (player.vehicle === run.targetVehicle) reward(true);
        } else if (distance(player.x, player.y, target.x, target.y) < 58) {
          run.targetVehicle = spawnMissionVehicle(mission.vehicle, target);
        }
        break;
      case 'deliver':
        if (player.vehicle && player.vehicle.type === mission.vehicle) {
          setMarker(target.x, target.y, mission.objective);
          if (distance(player.x, player.y, target.x, target.y) < 68) reward(true);
        }
        break;
      case 'chase':
        if (run.courier) {
          setMarker(run.courier.x, run.courier.y, mission.objective);
          const gap = distance(player.x, player.y, run.courier.x, run.courier.y);
          if (gap < 60 && player.vehicle && Math.abs(player.speed) > 110) {
            const vehicles = system('vehicles');
            if (vehicles && run.elapsed > 1) {
              vehicles.damage(run.courier, 9, 'car');
              run.elapsed = 0;
              if (state.camera && state.camera.kick) state.camera.kick(4);
            }
          }
          if (run.courier.health <= 42) reward(true);
        }
        break;
      case 'survive':
        enemyFire(dt);
        if (run.timer <= 0) reward(true);
        break;
      case 'escort':
        if (run.escort) {
          const gap = distance(run.escort.x, run.escort.y, player.x, player.y);
          if (gap > 140 && gap < 340) {
            run.escort.fleeUntil = 0;
            run.escort.walkSpeed = 82;
            const angle = Math.atan2(player.y - run.escort.y, player.x - run.escort.x);
            run.escort.axis = Math.abs(Math.cos(angle)) > Math.abs(Math.sin(angle)) ? 'x' : 'y';
            run.escort.dir = (run.escort.axis === 'x' ? Math.cos(angle) : Math.sin(angle)) > 0 ? 1 : -1;
          }
          setMarker(target.x, target.y, mission.objective);
          if (distance(run.escort.x, run.escort.y, target.x, target.y) < 62 && gap < 110) reward(true);
          if (run.escort.dead) reward(false);
        }
        break;
      case 'escape':
        run.peakStars = Math.max(run.peakStars, player.wanted);
        if (run.peakStars >= 4 && player.wanted === 0) reward(true);
        break;
      default:
        break;
    }
  }

  function checkSide(activity) {
    const player = state.player;
    if (activity.type === 'taxi') {
      if (run.checkpoint === 0) {
        if (distance(player.x, player.y, activity.target.x, activity.target.y) < 58 && player.vehicle) {
          run.checkpoint = 1;
          setMarker(activity.dropoff.x, activity.dropoff.y, 'Taxi: drop the fare at the marina');
        }
      } else if (distance(player.x, player.y, activity.dropoff.x, activity.dropoff.y) < 62) {
        reward(true);
      }
    } else if (activity.type === 'rampage') {
      const vehicles = Array.isArray(state.vehicles) ? state.vehicles : [];
      run.wrecks = vehicles.filter((vehicle) => vehicle.wrecked && distance(vehicle.x, vehicle.y, activity.target.x, activity.target.y) < 700).length;
      if (run.wrecks >= 8) reward(true);
      else setMarker(activity.target.x, activity.target.y, `Rampage: ${run.wrecks}/8 vehicles — ${Math.ceil(run.timer)}s`);
      if (run.timer <= 0) reward(false);
    } else if (activity.type === 'delivery') {
      const checkpoint = activity.checkpoints[run.checkpoint];
      if (checkpoint) {
        setMarker(checkpoint.x, checkpoint.y, `Delivery: stop ${run.checkpoint + 1}/${activity.checkpoints.length}`);
        if (distance(player.x, player.y, checkpoint.x, checkpoint.y) < 54) {
          run.checkpoint += 1;
          if (run.checkpoint >= activity.checkpoints.length) reward(true);
        }
      }
    }
  }

  function step(dt) {
    if (run.phase !== 'active') return;
    if (state.player.wasted) return;
    checkObjective(dt);
  }

  function reset() {
    clearActors();
    run.phase = 'brief';
    run.side = null;
    run.elapsed = 0;
    run.timer = run.mission && run.mission.time ? run.mission.time : 0;
    run.checkpoint = 0;
    run.wrecks = 0;
    run.peakStars = 0;
    run.enemies.length = 0;
    if (run.mission) {
      beginChat('brief');
      const target = run.mission.target || state.player;
      setMarker(target.x, target.y, run.mission.objective);
    }
  }

  start(0);
  return { run, start, startSide, interact, step, reset, reward, activeMission, setMarker, characterName };
}

let current = null;

export function install(context) {
  current = createMissions(context.world);
  context.systems.missions = current;
}

export function missionInteract() {
  if (current) return current.interact();
  return false;
}

export function currentObjective() {
  return current ? current.run.objective : '';
}
