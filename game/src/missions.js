import { FONT } from './config.js';
import { ACTION_ENTER } from './input.js';
import { spot, missionAt, totalMissions, SIDE_ACTIVITIES } from './story.js';
import { distance } from './util.js';

const TAXI_DROP = spot(12, 6, 0, 20);
const DELIVERY_POINTS = [spot(7, 5, 0, 20), spot(10, 7, 0, -20), spot(12, 3, 0, 10)];

export function createMissionSystem(api) {
  const { state } = api;

  function setDialogue(speaker, text, life = 4.5) {
    state.dialogue = { speaker, text, life };
  }

  function consume(controls) {
    if (controls && typeof controls === 'object') controls.actions &= ~ACTION_ENTER;
  }

  function startPoint() {
    const data = missionAt(state.mission.index);
    if (!data || !data.steps.length) return null;
    return data.steps[0].target || data.steps[0].start || null;
  }

  function clearObjects() {
    const mission = state.mission;
    if (mission.car) {
      mission.car.missionCar = false;
      mission.car.aiInput = { throttle: 0, steer: 0, brake: true };
      mission.car = null;
    }
    for (const enemy of mission.enemies) enemy.dead = true;
    mission.enemies.length = 0;
  }

  function prepareStage() {
    const mission = state.mission;
    const data = mission.data;
    const step = data && data.steps[mission.stage];
    if (!step) return;
    const vehicles = state.systems.vehicles;
    const peds = state.systems.peds;
    mission.targetPoint = step.target || (step.targets && step.targets[0]) || step.start || null;
    mission.timer = step.time || step.survive || 85;
    mission.progress = 0;
    mission.checkpoint = 0;
    mission.failTimer = 0;
    if (step.kind === 'steal' || step.kind === 'ram' || step.kind === 'escort') {
      const at = step.kind === 'escort' ? step.start : step.target;
      const point = vehicles.freePoint(at.x, at.y, 42) || at;
      const type = step.carType || (step.kind === 'ram' ? 'sport' : 'sedan');
      const car = vehicles.spawn(type, point.x, point.y, step.kind === 'ram' ? Math.PI / 2 : 0);
      car.missionCar = true;
      car.missionTag = data.id;
      if (step.kind !== 'ram') car.aiInput = { throttle: 0, steer: 0, brake: true };
      mission.car = car;
      if (step.kind === 'escort') car.speed = 0;
    }
    if (step.kind === 'shootout') {
      mission.enemies.length = 0;
      for (let index = 0; index < (step.enemies || 4); index += 1) {
        const angle = index * Math.PI * 2 / (step.enemies || 4);
        const point = vehicles.freePoint(step.target.x + Math.cos(angle) * 92, step.target.y + Math.sin(angle) * 92, 14);
        if (point) mission.enemies.push(peds.spawnEnemy(point.x, point.y, data.id));
      }
    }
    setDialogue(data.client, step.line || step.text, 4.5);
  }

  function reset() {
    state.mission = {
      index: 0,
      data: null,
      active: false,
      stage: 0,
      canRetry: false,
      reason: '',
      completed: [],
      targetPoint: null,
      timer: 0,
      progress: 0,
      checkpoint: 0,
      failTimer: 0,
      car: null,
      enemies: [],
    };
    state.side = { active: null, stage: 0, timer: 0, score: 0, target: null, fare: null };
    state.dialogue = null;
  }

  function startMission() {
    const mission = state.mission;
    const data = missionAt(mission.index);
    if (!data) return;
    mission.data = data;
    mission.active = true;
    mission.canRetry = false;
    mission.stage = 0;
    mission.reason = '';
    mission.enemies.length = 0;
    mission.car = null;
    setDialogue(data.client, data.brief.join('\n'), 7);
    state.systems.toast(`Mission ${mission.index + 1}/${totalMissions()}: ${data.title}`);
    const audio = state.systems && state.systems.audio;
    if (audio) audio.ui();
    prepareStage();
  }

  function completeMission() {
    const mission = state.mission;
    const data = mission.data;
    if (!data) return;
    if (!mission.completed.includes(data.id)) mission.completed.push(data.id);
    state.player.cash += data.reward;
    state.respect += data.respect || 0;
    state.systems.toast(`Mission complete · +$${data.reward} · +${data.respect} respect`);
    setDialogue(data.client, 'Mira: The Bay is starting to notice you. Keep moving.', 5);
    mission.index = Math.min(totalMissions(), mission.index + 1);
    mission.active = false;
    mission.data = null;
    mission.car = null;
    mission.enemies.length = 0;
    const audio = state.systems && state.systems.audio;
    if (audio) audio.ui();
  }

  function fail(reason = 'Mission failed. Try again from the marker.') {
    if (!state.mission.active && !state.mission.canRetry) return;
    state.mission.reason = reason;
    state.mission.active = false;
    state.mission.canRetry = true;
    state.systems.toast(reason);
    clearObjects();
  }

  function advance() {
    const mission = state.mission;
    mission.stage += 1;
    if (!mission.data || mission.stage >= mission.data.steps.length) {
      completeMission();
      return;
    }
    prepareStage();
    const audio = state.systems && state.systems.audio;
    if (audio) audio.ui();
  }

  function onKill(ped) {
    const mission = state.mission;
    if (mission.active && mission.enemies.includes(ped)) {
      mission.enemies.splice(mission.enemies.indexOf(ped), 1);
      if (mission.enemies.length === 0) advance();
      return;
    }
    const side = state.side;
    if (side.active === 'rampage' && ped.behavior !== 'police') {
      side.score += 1;
      state.systems.toast(`Rampage ${side.score}/8`);
      if (side.score >= 8) endSide(true);
    }
  }

  function onDeath() {
    fail('The witness is gone. Mission failed.');
    endSide(false);
  }

  function finishSide(reward, message) {
    state.player.cash += reward;
    state.respect += 3;
    state.systems.toast(`${message} +$${reward}`);
    endSide(true);
  }

  function endSide(success) {
    const side = state.side;
    if (!side.active) return;
    if (!success) state.systems.toast('Side activity failed.');
    if (side.fare) side.fare.dead = true;
    side.active = null;
    side.stage = 0;
    side.target = null;
    side.fare = null;
  }

  function startSide(activity) {
    const side = state.side;
    side.active = activity.id;
    side.stage = 0;
    side.score = 0;
    side.target = activity.marker;
    side.fare = null;
    side.timer = activity.id === 'rampage' ? 60 : activity.id === 'taxi' ? 120 : 90;
    setDialogue('Radio', activity.text, 4);
    state.systems.toast(`Side activity: ${activity.title}`);
    if (activity.id === 'taxi') {
      const point = state.systems.vehicles.freePoint(activity.marker.x + 28, activity.marker.y + 28, 12);
      if (point) side.fare = state.systems.peds.spawnPed(point.x, point.y, { color: '#e2c45a', health: 30 });
    }
    if (activity.id === 'delivery') side.target = DELIVERY_POINTS[0];
    const audio = state.systems && state.systems.audio;
    if (audio) audio.ui();
  }

  function updateSide(dt, controls) {
    const side = state.side;
    const player = state.player;
    const actions = controls && typeof controls === 'object' ? controls.actions || 0 : 0;
    if (!side.active) {
      if (state.mission.active) return;
      for (const activity of SIDE_ACTIVITIES) {
        if (distance(player.x, player.y, activity.marker.x, activity.marker.y) > 72) continue;
        if (actions & ACTION_ENTER) {
          startSide(activity);
          consume(controls);
        }
        return;
      }
      return;
    }
    side.timer -= dt;
    if (side.timer <= 0) {
      endSide(false);
      return;
    }
    const activity = SIDE_ACTIVITIES.find((item) => item.id === side.active);
    if (!activity) return;
    if (side.active === 'taxi') {
      if (side.stage === 0) {
        if (side.fare && !side.fare.dead && distance(player.x, player.y, side.fare.x, side.fare.y) < 62 && player.inVehicle) {
          side.stage = 1;
          side.target = TAXI_DROP;
          side.fare.dead = true;
          state.systems.toast('Fare aboard. Head to Cedar Heights.');
        }
      } else if (player.inVehicle && side.target && distance(player.x, player.y, side.target.x, side.target.y) < 76) {
        finishSide(activity.reward, 'Fare delivered.');
      }
    } else if (side.active === 'rampage') {
      if (side.score >= 8) finishSide(activity.reward, 'Rampage complete.');
    } else if (side.active === 'delivery') {
      if (side.target && distance(player.x, player.y, side.target.x, side.target.y) < 72) {
        side.stage += 1;
        if (side.stage >= DELIVERY_POINTS.length) finishSide(activity.reward, 'Courier run complete.');
        else {
          side.target = DELIVERY_POINTS[side.stage];
          state.systems.toast(`Checkpoint ${side.stage + 1}/3`);
        }
      }
    }
  }

  function driveMissionCars(dt) {
    const mission = state.mission;
    if (!mission.active || !mission.car || mission.car.dead) return;
    const car = mission.car;
    const step = mission.data && mission.data.steps[mission.stage];
    if (!step) return;
    if (step.kind === 'ram') {
      const awayX = car.x - state.player.x;
      const awayY = car.y - state.player.y;
      const desired = Math.atan2(awayY, awayX);
      let delta = desired - car.angle;
      while (delta > Math.PI) delta -= Math.PI * 2;
      while (delta < -Math.PI) delta += Math.PI * 2;
      car.aiInput = { throttle: 0.95, steer: Math.max(-1, Math.min(1, delta * 1.6)), brake: false };
    } else if (step.kind === 'escort') {
      const target = mission.targetPoint;
      if (target) {
        const gap = distance(car.x, car.y, target.x, target.y);
        const desired = Math.atan2(target.y - car.y, target.x - car.x);
        let delta = desired - car.angle;
        while (delta > Math.PI) delta -= Math.PI * 2;
        while (delta < -Math.PI) delta += Math.PI * 2;
        car.aiInput = {
          throttle: gap < 90 ? -0.4 : 0.6,
          steer: Math.max(-1, Math.min(1, delta * 1.7)),
          brake: gap < 90,
        };
      }
    }
  }

  function activeActor() {
    return state.player.inVehicle ? state.systems.vehicles.playerVehicle() || state.player : state.player;
  }

  function updateMission(dt, controls) {
    const mission = state.mission;
    const actions = controls && typeof controls === 'object' ? controls.actions || 0 : 0;
    if (!mission.active) {
      if (!mission.canRetry || state.mission.index >= totalMissions()) return;
      const point = startPoint();
      if (!point) return;
      if (distance(state.player.x, state.player.y, point.x, point.y) < 82 && (actions & ACTION_ENTER)) {
        mission.canRetry = false;
        startMission();
        consume(controls);
      }
      return;
    }
    const data = mission.data;
    const step = data && data.steps[mission.stage];
    if (!step) {
      completeMission();
      return;
    }
    driveMissionCars(dt);
    const actor = activeActor();
    if (step.kind === 'goto' || step.kind === 'talk' || step.kind === 'deliver') {
      if (step.kind === 'deliver' && mission.car && state.systems.vehicles.playerVehicle() !== mission.car) return;
      if (step.target && distance(actor.x, actor.y, step.target.x, step.target.y) < (step.radius || 70)) advance();
      return;
    }
    if (step.kind === 'steal') {
      if (mission.car && state.systems.vehicles.playerVehicle() === mission.car) advance();
      return;
    }
    if (step.kind === 'ram') {
      mission.timer -= dt;
      if (!mission.car || mission.car.dead || mission.car.hp < mission.car.maxHp * 0.35) {
        advance();
      } else if (mission.timer <= 0) {
        fail('Rook slipped away. Mission failed.');
      }
      return;
    }
    if (step.kind === 'shootout') {
      mission.timer -= dt;
      if (mission.enemies.length === 0) advance();
      else if (mission.timer <= 0) fail('You ran out of time in the yard.');
      return;
    }
    if (step.kind === 'timed') {
      mission.timer -= dt;
      const point = step.targets[mission.checkpoint];
      mission.targetPoint = point;
      if (point && distance(actor.x, actor.y, point.x, point.y) < (step.radius || 72)) {
        mission.checkpoint += 1;
        if (mission.checkpoint >= step.targets.length) advance();
        else state.systems.toast(`Checkpoint ${mission.checkpoint + 1}/${step.targets.length}`);
      } else if (mission.timer <= 0) {
        fail('The clock ran out. Mission failed.');
      }
      return;
    }
    if (step.kind === 'escort') {
      if (!mission.car || mission.car.dead) {
        fail('Maro did not make it. Mission failed.');
        return;
      }
      const gap = distance(state.player.x, state.player.y, mission.car.x, mission.car.y);
      mission.failTimer = gap > 300 ? mission.failTimer + dt : Math.max(0, mission.failTimer - dt * 2);
      if (mission.failTimer > 8) {
        fail('You lost the escort. Mission failed.');
        return;
      }
      if (mission.targetPoint && distance(mission.car.x, mission.car.y, mission.targetPoint.x, mission.targetPoint.y) < (step.radius || 86)
        && gap < 240) advance();
      return;
    }
    if (step.kind === 'heat') {
      if (state.wantedStars + 0.05 >= step.stars) {
        mission.progress += dt;
        if (mission.progress >= step.survive) {
          const policeGap = state.systems.police.nearestDistance(state.player.x, state.player.y);
          if (policeGap > 420) advance();
          else mission.progress = step.survive - 5;
        }
      } else {
        mission.progress = Math.max(0, mission.progress - dt * 1.6);
      }
    }
  }

  function step(dt, controls) {
    if (state.dialogue) {
      state.dialogue.life -= dt;
      if (state.dialogue.life <= 0) state.dialogue = null;
    }
    if (state.mission.active || state.mission.canRetry) updateMission(dt, controls);
    else if (!state.mission.active) {
      const point = startPoint();
      if (point) {
        const actions = controls && typeof controls === 'object' ? controls.actions || 0 : 0;
        if (distance(state.player.x, state.player.y, point.x, point.y) < 82 && (actions & ACTION_ENTER)) {
          startMission();
          consume(controls);
        }
      }
    }
    updateSide(dt, controls);
  }

  function objective() {
    const mission = state.mission;
    if (mission.active && mission.targetPoint) {
      const data = mission.data;
      const step = data && data.steps[mission.stage];
      return { x: mission.targetPoint.x, y: mission.targetPoint.y, label: step ? step.text : data.title };
    }
    if (!mission.active && mission.canRetry) {
      const point = startPoint();
      if (point) return { x: point.x, y: point.y, label: 'Retry mission' };
    }
    if (!mission.active && mission.index < totalMissions()) {
      const point = startPoint();
      if (point) return { x: point.x, y: point.y, label: 'Start next mission' };
    }
    const side = state.side;
    if (side.active && side.target) {
      const activity = SIDE_ACTIVITIES.find((item) => item.id === side.active);
      return { x: side.target.x, y: side.target.y, label: activity ? activity.title : 'Side activity' };
    }
    return null;
  }

  return {
    reset,
    step,
    onKill,
    onDeath,
    startMission,
    fail,
    objective,
    finishSide,
  };
}

export function draw(ctx, state) {
  const system = state.systems && state.systems.missions;
  if (!system) return;
  const camera = state.camera.state;
  const objective = system.objective();
  const markers = [];
  if (objective) markers.push({ point: objective, color: '#ffd15c', label: objective.label, big: true });
  for (const activity of SIDE_ACTIVITIES) {
    if (state.side.active === activity.id) continue;
    markers.push({ point: activity.marker, color: '#73d9d1', label: activity.title, big: false });
  }
  const pulse = 0.5 + 0.5 * Math.sin(state.elapsed * 4);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const marker of markers) {
    const radius = marker.big ? 38 + pulse * 7 : 22 + pulse * 4;
    if (Math.abs(marker.point.x - camera.x) > 800 || Math.abs(marker.point.y - camera.y) > 560) continue;
    ctx.strokeStyle = marker.color;
    ctx.lineWidth = marker.big ? 3 : 2;
    ctx.globalAlpha = 0.65 + pulse * 0.35;
    ctx.beginPath();
    ctx.arc(marker.point.x, marker.point.y, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = marker.color;
    ctx.beginPath();
    ctx.moveTo(marker.point.x, marker.point.y - 9);
    ctx.lineTo(marker.point.x + 9, marker.point.y);
    ctx.lineTo(marker.point.x, marker.point.y + 9);
    ctx.lineTo(marker.point.x - 9, marker.point.y);
    ctx.closePath();
    ctx.fill();
    ctx.font = `700 13px ${FONT}`;
    ctx.fillText(marker.label, marker.point.x, marker.point.y - radius - 13);
    ctx.globalAlpha = 1;
  }
}
