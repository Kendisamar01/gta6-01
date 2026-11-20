import { GRID } from './config.js';
import { roadPosition, shopAt } from './city.js';
import { clamp } from './random.js';
import { spawnVehicle, findVehicle, updateVehicle } from './vehicles.js';
import { clearEnemies, spawnEnemySquad } from './peds.js';
import { setWantedLevel } from './wanted.js';
import { givePistol } from './combat.js';
import { MISSION_DIALOGUE, MISSION_TITLES } from './story.js';

const REWARDS = [280, 420, 520, 640, 700, 820, 900, 1600];
const RESPECT = [8, 10, 12, 16, 18, 20, 24, 40];

export function createMissionState() {
  return {
    id: 0,
    completed: 0,
    active: false,
    phase: 0,
    kills: 0,
    timer: 0,
    blip: null,
    targetVehicle: null,
    checkpoints: [],
    checkpoint: 0,
    escortStage: 0,
    escortFar: 0,
    failed: false,
    failReason: '',
    retryTimer: 0,
  };
}

function shopFor(world, kind) {
  return shopAt(world.city, kind) ?? { x: 1600, y: 1200 };
}

function roadSpot(axis, line, along, direction = 1) {
  return roadPosition(axis, GRID.first + line * GRID.step, along, direction);
}

function distanceTo(world, point) {
  if (point === null || point === undefined) return Infinity;
  return Math.hypot(world.player.x - point.x, world.player.y - point.y);
}

const MISSIONS = [
  {
    phases: [
      {
        text: 'Meet Marco at Cafe Coral',
        setup(world) {
          world.mission.blip = { ...shopFor(world, 'cafe'), radius: 70, label: 'Cafe Coral' };
        },
        check(world) { return distanceTo(world, shopFor(world, 'cafe')) < 74; },
      },
      {
        text: 'Follow Marco to Sombra Garage',
        setup(world) {
          world.mission.blip = { ...shopFor(world, 'garage'), radius: 80, label: 'Sombra Garage' };
        },
        check(world) { return distanceTo(world, shopFor(world, 'garage')) < 88; },
      },
    ],
  },
  {
    init(world) {
      const point = roadSpot('h', 4, 1560, -1);
      const car = spawnVehicle(world, 'sports', point.x, point.y, Math.PI, null);
      car.color = '#2f96d4';
      world.mission.targetVehicle = car.id;
    },
    phases: [
      {
        text: 'Find the blue Vesper GT on Coral Boulevard',
        setup(world) {
          const car = findVehicle(world, world.mission.targetVehicle);
          world.mission.blip = car ? { x: car.x, y: car.y, radius: 80, label: 'Vesper GT' } : null;
        },
        check(world) {
          const car = findVehicle(world, world.mission.targetVehicle);
          return car !== null && distanceTo(world, car) < 90;
        },
        fail(world) { return findVehicle(world, world.mission.targetVehicle) === null; },
        failReason: 'The car was wrecked',
      },
      {
        text: 'Deliver the Vesper to Sombra Garage',
        setup(world) {
          world.mission.blip = { ...shopFor(world, 'garage'), radius: 90, label: 'Deliver here' };
        },
        check(world) {
          return world.player.inVehicle === world.mission.targetVehicle
            && distanceTo(world, shopFor(world, 'garage')) < 105;
        },
        fail(world) { return findVehicle(world, world.mission.targetVehicle) === null; },
        failReason: 'The car was wrecked',
      },
    ],
  },
  {
    init(world) {
      const van = spawnVehicle(world, 'van', 2320, 1960, -0.3, { type: 'fugitive' });
      van.color = '#3b69b8';
      van.speed = 120;
      van.ai = { cruise: 230 };
      world.mission.targetVehicle = van.id;
    },
    phases: [
      {
        text: 'Ram the fleeing Tidewater Van until it stalls',
        setup(world) {
          const van = findVehicle(world, world.mission.targetVehicle);
          world.mission.blip = van
            ? { x: van.x, y: van.y, radius: 120, label: 'Blue van' }
            : null;
        },
        check(world) {
          const van = findVehicle(world, world.mission.targetVehicle);
          if (van === null) return false;
          world.mission.blip = { x: van.x, y: van.y, radius: 120, label: 'Blue van' };
          return van.hp < 48 || (Math.abs(van.speed) < 18 && distanceTo(world, van) < 130);
        },
        fail(world) { return findVehicle(world, world.mission.targetVehicle) === null; },
        failReason: 'The van was destroyed',
      },
    ],
  },
  {
    init(world) {
      clearEnemies(world);
      spawnEnemySquad(world, 620, 980, 6);
      world.mission.kills = 0;
      givePistol(world);
    },
    phases: [
      {
        text: 'Survive the shootout — clear 6 enemies',
        setup(world) {
          world.mission.blip = { x: 620, y: 980, radius: 180, label: 'Crossfire' };
        },
        check(world) { return world.mission.kills >= 6; },
        fail(world) { return world.player.hp <= 0; },
        failReason: 'You went down',
      },
    ],
  },
  {
    init(world) {
      world.mission.checkpoints = [
        roadSpot('v', 1, 620),
        roadSpot('h', 1, 1480),
        roadSpot('v', 13, 1180),
        roadSpot('h', 9, 2820),
        roadSpot('v', 8, 1970),
        roadSpot('h', 7, 1080),
      ];
      world.mission.checkpoint = 0;
      world.mission.timer = 108;
    },
    phases: [
      {
        text: 'Deliver the package — reach 6 checkpoints',
        setup(world) {
          world.mission.blip = { ...world.mission.checkpoints[0], radius: 74, label: 'Drop 1' };
        },
        check(world) {
          const point = world.mission.checkpoints[world.mission.checkpoint];
          if (!point || distanceTo(world, point) > 78) return false;
          world.mission.checkpoint += 1;
          const next = world.mission.checkpoints[world.mission.checkpoint];
          world.mission.blip = next
            ? { ...next, radius: 74, label: `Drop ${world.mission.checkpoint + 1}` }
            : null;
          return world.mission.checkpoint >= world.mission.checkpoints.length;
        },
      },
    ],
  },
  {
    init(world) {
      const start = shopFor(world, 'garage');
      const van = spawnVehicle(world, 'van', start.x, start.y, 0, { type: 'escort' });
      van.color = '#d7d2bf';
      van.ai = { cruise: 178 };
      world.mission.targetVehicle = van.id;
      world.mission.escortStage = 0;
      world.mission.escortFar = 0;
    },
    phases: [
      {
        text: 'Escort the armored van to the Golden Horn',
        setup(world) {
          world.mission.blip = { ...shopFor(world, 'yacht'), radius: 120, label: 'Golden Horn' };
        },
        check(world) {
          const van = findVehicle(world, world.mission.targetVehicle);
          return van !== null
            && distanceTo(world, shopFor(world, 'yacht')) < 160
            && distanceTo(world, van) < 330;
        },
        fail(world) {
          const van = findVehicle(world, world.mission.targetVehicle);
          if (van === null) return true;
          world.mission.escortFar = distanceTo(world, van) > 520
            ? world.mission.escortFar + 1 / 60
            : 0;
          return world.mission.escortFar > 6;
        },
        failReason: 'The van was lost',
      },
    ],
  },
  {
    init(world) {
      setWantedLevel(world, 3, 'Heat Wave');
      world.mission.timer = 0;
    },
    phases: [
      {
        text: 'Lose the police, then reach Palm Terrace',
        setup(world) {
          world.mission.blip = { ...shopFor(world, 'safehouse'), radius: 90, label: 'Safehouse' };
        },
        check(world) {
          return world.wanted.level === 0 && distanceTo(world, shopFor(world, 'safehouse')) < 100;
        },
      },
    ],
  },
  {
    init(world) {
      clearEnemies(world);
      spawnEnemySquad(world, 2470, 2420, 8);
      world.mission.kills = 0;
      givePistol(world);
    },
    phases: [
      {
        text: 'Clear the club guards',
        setup(world) {
          world.mission.blip = { x: 2470, y: 2420, radius: 160, label: 'Guards' };
        },
        check(world) { return world.mission.kills >= 8; },
      },
      {
        text: 'Escape along Lighthouse Road',
        setup(world) {
          const point = roadSpot('v', 15, 720);
          world.mission.blip = { ...point, radius: 100, label: 'Escape' };
        },
        check(world) { return distanceTo(world, roadSpot('v', 15, 720)) < 110; },
      },
    ],
  },
];

function missionShopKind(id) {
  return [null, 'garage', 'yacht', 'cafe', 'delivery', 'garage', 'safehouse', 'yacht'][id] ?? 'cafe';
}

export function nextMissionMarker(world) {
  if (world.mission.active || world.mission.id >= MISSIONS.length) return null;
  const location = world.mission.id === 0
    ? shopFor(world, 'cafe')
    : shopFor(world, missionShopKind(world.mission.id));
  return { ...location, label: MISSION_TITLES[world.mission.id], kind: 'mission' };
}

function advanceDialogue(world, controls) {
  const dialogue = world.dialogue;
  if (dialogue === null) return false;
  if (controls.confirm || controls.firePressed || controls.interact) {
    dialogue.index += 1;
    if (dialogue.index >= dialogue.lines.length) {
      world.dialogue = null;
      world.sfx('ui');
      if (dialogue.onClose) dialogue.onClose();
    } else world.sfx('ui');
  }
  return true;
}

function enterPhase(world, index) {
  world.mission.phase = index;
  const phase = MISSIONS[world.mission.id]?.phases[index];
  if (phase === undefined) return;
  if (phase.setup) phase.setup(world);
  if (phase.dialogue) world.openDialogue(phase.dialogue);
}

export function startMission(world, id) {
  const mission = world.mission;
  mission.id = clamp(id, 0, MISSIONS.length - 1);
  mission.active = true;
  mission.phase = 0;
  mission.kills = 0;
  mission.timer = 0;
  mission.failed = false;
  mission.failReason = '';
  mission.blip = null;
  mission.targetVehicle = null;
  mission.checkpoints = [];
  mission.checkpoint = 0;
  mission.escortStage = 0;
  mission.escortFar = 0;
  clearEnemies(world);

  const definition = MISSIONS[mission.id];
  if (definition.init) definition.init(world);
  world.toast(`Mission — ${MISSION_TITLES[mission.id]}`);
  world.sfx('mission');
  world.openDialogue(MISSION_DIALOGUE[mission.id], () => enterPhase(world, 0));
}

export function completeMission(world) {
  const mission = world.mission;
  const money = REWARDS[mission.id] ?? 300;
  const fame = RESPECT[mission.id] ?? 10;
  world.player.money += money;
  world.player.respect += fame;
  mission.completed += 1;
  mission.active = false;
  mission.blip = null;
  mission.targetVehicle = null;
  world.clearWantedForMission();
  clearEnemies(world);
  world.toast(`${MISSION_TITLES[mission.id]} complete — $${money} · +${fame} respect`);
  world.sfx('success');
  if (mission.id + 1 < MISSIONS.length) mission.id += 1;
  else world.toast('The Solara story is complete. The bay is yours.');
}

export function failMission(world, reason) {
  if (world.mission.failed) return;
  world.mission.failed = true;
  world.mission.failReason = reason;
  world.mission.retryTimer = 1.4;
  world.toast(`Mission failed — ${reason}`);
  world.sfx('fail');
}

export function retryMission(world) {
  const id = world.mission.id;
  world.mission.failed = false;
  world.mission.retryTimer = 0;
  startMission(world, id);
}

function updateFugitive(world, dt) {
  const van = findVehicle(world, world.mission.targetVehicle);
  if (van === null || van.driver?.type !== 'fugitive') return;
  const dx = van.x - world.player.x;
  const dy = van.y - world.player.y;
  const away = Math.atan2(dy, dx);
  const speed = van.hp < 40 ? 0 : van.hp < 70 ? 110 : van.ai.cruise;
  let steer = ((away - van.angle + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
  steer = clamp(steer * 1.5, -1, 1);
  updateVehicle(world, van, {
    throttle: Math.abs(van.speed) < speed ? 1 : -1,
    steer,
    handbrake: false,
  }, dt);
}

function updateEscort(world, dt) {
  const van = findVehicle(world, world.mission.targetVehicle);
  if (van === null || van.driver?.type !== 'escort') return;
  const target = shopFor(world, 'yacht');
  const desired = Math.atan2(target.y - van.y, target.x - van.x);
  const delta = ((desired - van.angle + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
  const distance = Math.hypot(target.x - van.x, target.y - van.y);
  updateVehicle(world, van, {
    throttle: distance < 90 ? -1 : Math.abs(delta) > 1.2 ? 0.4 : 1,
    steer: clamp(delta * 1.4, -1, 1),
    handbrake: false,
  }, dt);
}

export function updateMissions(world, dt, controls) {
  if (advanceDialogue(world, controls)) return;
  const mission = world.mission;

  if (mission.failed) {
    mission.retryTimer -= dt;
    if (mission.retryTimer <= 0 && controls.confirm) retryMission(world);
    return;
  }

  if (!mission.active) {
    const marker = nextMissionMarker(world);
    if (marker !== null && controls.interact && distanceTo(world, marker) < 100) {
      startMission(world, mission.id);
    }
    return;
  }

  if (mission.timer > 0) {
    mission.timer = Math.max(0, mission.timer - dt);
    if (mission.timer === 0) {
      failMission(world, 'Time ran out');
      return;
    }
  }

  updateFugitive(world, dt);
  updateEscort(world, dt);

  const phase = MISSIONS[mission.id]?.phases[mission.phase];
  if (phase === undefined) return;
  if (phase.fail && phase.fail(world)) {
    failMission(world, phase.failReason ?? 'Objective lost');
    return;
  }
  if (!phase.check(world, dt)) return;
  if (mission.phase + 1 >= MISSIONS[mission.id].phases.length) completeMission(world);
  else enterPhase(world, mission.phase + 1);
}

export function missionObjective(world) {
  if (world.dialogue) return 'Press Enter to continue the conversation';
  const mission = world.mission;
  if (mission.failed) return `Mission failed — ${mission.failReason} · Enter to retry`;
  if (!mission.active) {
    const marker = nextMissionMarker(world);
    return marker === null
      ? 'Story complete — explore Solara Bay'
      : `Press E at ${marker.label} to begin the next mission`;
  }

  const phase = MISSIONS[mission.id]?.phases[mission.phase];
  if (phase === undefined) return '';
  let text = phase.text;
  if (mission.id === 3) text = `${text} (${mission.kills}/6)`;
  if (mission.id === 7) text = `${text} (${mission.kills}/8)`;
  if (mission.timer > 0) text += ` · ${Math.ceil(mission.timer)}s`;
  return text;
}

export function missionTitle(world) {
  return MISSION_TITLES[Math.min(world.mission.id, MISSION_TITLES.length - 1)];
}

export function onMissionPedKilled(world, ped) {
  if (!world.mission.active || ped.type !== 'enemy') return;
  world.mission.kills += 1;
  world.sfx('hit');
}

export const MISSION_COUNT = MISSIONS.length;
