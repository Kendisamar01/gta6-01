import { MAP } from './config.js';
import { lanePoint, shopByKind } from './city.js';
import { bearingDifference, limit } from './random.js';
import { carById, driveCar, newCar } from './vehicles.js';
import { clearSquads, makeSquad } from './peds.js';
import { armPlayer } from './combat.js';
import { forceStars } from './wanted.js';
import { JOB_LINES, JOB_NAMES } from './story.js';

const PAYOUT = [280, 420, 520, 640, 700, 820, 900, 1600];
const PRESTIGE = [8, 10, 12, 16, 18, 20, 24, 40];

export function makeMission() {
  return {
    id: 0,
    completed: 0,
    active: false,
    phase: 0,
    kills: 0,
    timer: 0,
    pin: null,
    targetId: null,
    drops: [],
    drop: 0,
    farAway: 0,
    failed: false,
    failure: '',
    retryIn: 0,
  };
}

function place(world, kind) {
  return shopByKind(world.city, kind) ?? { x: 1600, y: 1200 };
}

function streetSpot(axis, line, along, direction = 1) {
  return lanePoint(axis, MAP.first + line * MAP.step, along, direction);
}

function playerGap(world, point) {
  if (!point) return Infinity;
  return Math.hypot(world.player.x - point.x, world.player.y - point.y);
}

const STORY = [
  {
    stages: [
      {
        goal: 'Meet Rio at Cafe Astra',
        prepare(world) { world.mission.pin = { ...place(world, 'cafe'), radius: 70, label: 'Cafe Astra' }; },
        done(world) { return playerGap(world, place(world, 'cafe')) < 74; },
      },
      {
        goal: 'Follow Rio to Vesper Motors',
        prepare(world) { world.mission.pin = { ...place(world, 'garage'), radius: 80, label: 'Vesper Motors' }; },
        done(world) { return playerGap(world, place(world, 'garage')) < 88; },
      },
    ],
  },
  {
    begin(world) {
      const spot = streetSpot('h', 4, 1560, -1);
      const car = newCar(world, 'sports', spot.x, spot.y, Math.PI);
      car.body = '#2f96d4';
      world.mission.targetId = car.id;
    },
    stages: [
      {
        goal: 'Find the blue Vega RS on Coral Boulevard',
        prepare(world) {
          const car = carById(world, world.mission.targetId);
          world.mission.pin = car ? { x: car.x, y: car.y, radius: 80, label: 'Vega RS' } : null;
        },
        done(world) {
          const car = carById(world, world.mission.targetId);
          return car !== null && playerGap(world, car) < 90;
        },
        spoil(world) { return carById(world, world.mission.targetId) === null; },
        why: 'The car was wrecked',
      },
      {
        goal: 'Deliver the Vega to Vesper Motors',
        prepare(world) {
          world.mission.pin = { ...place(world, 'garage'), radius: 90, label: 'Deliver here' };
        },
        done(world) {
          return world.player.carId === world.mission.targetId
            && playerGap(world, place(world, 'garage')) < 105;
        },
        spoil(world) { return carById(world, world.mission.targetId) === null; },
        why: 'The car was wrecked',
      },
    ],
  },
  {
    begin(world) {
      const van = newCar(world, 'van', 2320, 1960, -0.3, { type: 'fugitive' });
      van.body = '#3b69b8';
      van.velocity = 120;
      van.route = { cruise: 230 };
      world.mission.targetId = van.id;
    },
    stages: [
      {
        goal: 'Ram the fleeing Breakwater Van until it stalls',
        prepare(world) {
          const van = carById(world, world.mission.targetId);
          world.mission.pin = van ? { x: van.x, y: van.y, radius: 120, label: 'Blue van' } : null;
        },
        done(world) {
          const van = carById(world, world.mission.targetId);
          if (van === null) return false;
          world.mission.pin = { x: van.x, y: van.y, radius: 120, label: 'Blue van' };
          return van.hp < 48 || (Math.abs(van.velocity) < 18 && playerGap(world, van) < 130);
        },
        spoil(world) { return carById(world, world.mission.targetId) === null; },
        why: 'The van was destroyed',
      },
    ],
  },
  {
    begin(world) {
      clearSquads(world);
      makeSquad(world, 620, 980, 6);
      world.mission.kills = 0;
      armPlayer(world);
    },
    stages: [
      {
        goal: 'Survive the shootout — clear 6 attackers',
        prepare(world) { world.mission.pin = { x: 620, y: 980, radius: 180, label: 'Crossfire' }; },
        done(world) { return world.mission.kills >= 6; },
        spoil(world) { return world.player.hp <= 0; },
        why: 'You went down',
      },
    ],
  },
  {
    begin(world) {
      world.mission.drops = [
        streetSpot('v', 1, 620),
        streetSpot('h', 1, 1480),
        streetSpot('v', 13, 1180),
        streetSpot('h', 9, 2820),
        streetSpot('v', 8, 1970),
        streetSpot('h', 7, 1080),
      ];
      world.mission.drop = 0;
      world.mission.timer = 108;
    },
    stages: [
      {
        goal: 'Deliver the package — reach 6 checkpoints',
        prepare(world) {
          world.mission.pin = { ...world.mission.drops[0], radius: 74, label: 'Drop 1' };
        },
        done(world) {
          const point = world.mission.drops[world.mission.drop];
          if (!point || playerGap(world, point) > 78) return false;
          world.mission.drop += 1;
          const next = world.mission.drops[world.mission.drop];
          world.mission.pin = next
            ? { ...next, radius: 74, label: `Drop ${world.mission.drop + 1}` }
            : null;
          return world.mission.drop >= world.mission.drops.length;
        },
      },
    ],
  },
  {
    begin(world) {
      const start = place(world, 'garage');
      const van = newCar(world, 'van', start.x, start.y, 0, { type: 'escort' });
      van.body = '#d7d2bf';
      van.route = { cruise: 178 };
      world.mission.targetId = van.id;
      world.mission.farAway = 0;
    },
    stages: [
      {
        goal: 'Escort the armored van to the Azure Lantern',
        prepare(world) { world.mission.pin = { ...place(world, 'yacht'), radius: 120, label: 'Azure Lantern' }; },
        done(world) {
          const van = carById(world, world.mission.targetId);
          return van !== null
            && playerGap(world, place(world, 'yacht')) < 160
            && playerGap(world, van) < 330;
        },
        spoil(world) {
          const van = carById(world, world.mission.targetId);
          if (van === null) return true;
          world.mission.farAway = playerGap(world, van) > 520
            ? world.mission.farAway + 1 / 60
            : 0;
          return world.mission.farAway > 6;
        },
        why: 'The van was lost',
      },
    ],
  },
  {
    begin(world) {
      forceStars(world, 3, 'Five-Star Exit');
      world.mission.timer = 0;
    },
    stages: [
      {
        goal: 'Lose the police, then reach Palm Vista',
        prepare(world) { world.mission.pin = { ...place(world, 'safehouse'), radius: 90, label: 'Safehouse' }; },
        done(world) {
          return world.wanted.stars === 0 && playerGap(world, place(world, 'safehouse')) < 100;
        },
      },
    ],
  },
  {
    begin(world) {
      clearSquads(world);
      makeSquad(world, 2470, 2420, 8);
      world.mission.kills = 0;
      armPlayer(world);
    },
    stages: [
      {
        goal: 'Clear the club guards',
        prepare(world) { world.mission.pin = { x: 2470, y: 2420, radius: 160, label: 'Guards' }; },
        done(world) { return world.mission.kills >= 8; },
      },
      {
        goal: 'Escape along Lighthouse Road',
        prepare(world) {
          const point = streetSpot('v', 15, 720);
          world.mission.pin = { ...point, radius: 100, label: 'Escape' };
        },
        done(world) { return playerGap(world, streetSpot('v', 15, 720)) < 110; },
      },
    ],
  },
];

const FOLLOW_UP = [null, 'garage', 'yacht', 'cafe', 'delivery', 'garage', 'safehouse', 'yacht'];

export function storyPinAt(world) {
  if (world.mission.active || world.mission.id >= STORY.length) return null;
  const location = world.mission.id === 0
    ? place(world, 'cafe')
    : place(world, FOLLOW_UP[world.mission.id] ?? 'cafe');
  return { ...location, label: JOB_NAMES[world.mission.id], kind: 'story' };
}

function continueTalk(world, controls) {
  const talk = world.dialogue;
  if (talk === null) return false;
  if (controls.confirm || controls.firePressed || controls.enter) {
    talk.line += 1;
    if (talk.line >= talk.lines.length) {
      world.dialogue = null;
      world.sound('ui');
      if (talk.after) talk.after();
    } else world.sound('ui');
  }
  return true;
}

function enterStage(world, index) {
  world.mission.phase = index;
  const stage = STORY[world.mission.id]?.stages[index];
  if (stage) stage.prepare(world);
}

export function beginStory(world, id) {
  const mission = world.mission;
  mission.id = limit(id, 0, STORY.length - 1);
  mission.active = true;
  mission.phase = 0;
  mission.kills = 0;
  mission.timer = 0;
  mission.failed = false;
  mission.failure = '';
  mission.pin = null;
  mission.targetId = null;
  mission.drops = [];
  mission.drop = 0;
  mission.farAway = 0;
  clearSquads(world);

  const script = STORY[mission.id];
  if (script.begin) script.begin(world);
  world.notify(`Mission — ${JOB_NAMES[mission.id]}`);
  world.sound('mission');
  world.openTalk(JOB_LINES[mission.id], () => enterStage(world, 0));
}

function payOut(world) {
  const mission = world.mission;
  const money = PAYOUT[mission.id] ?? 300;
  const honor = PRESTIGE[mission.id] ?? 10;
  world.player.money += money;
  world.player.respect += honor;
  mission.completed += 1;
  mission.active = false;
  mission.pin = null;
  mission.targetId = null;
  world.clearHeatAfterMission();
  clearSquads(world);
  world.notify(`${JOB_NAMES[mission.id]} complete — $${money} · +${honor} respect`);
  world.sound('success');
  if (mission.id + 1 < STORY.length) mission.id += 1;
  else world.notify('The Solara story is complete. The bay is yours.');
}

function missStory(world, reason) {
  if (world.mission.failed) return;
  world.mission.failed = true;
  world.mission.failure = reason;
  world.mission.retryIn = 1.4;
  world.notify(`Mission failed — ${reason}`);
  world.sound('fail');
}

function retryStory(world) {
  const id = world.mission.id;
  world.mission.failed = false;
  world.mission.retryIn = 0;
  beginStory(world, id);
}

function driveFugitive(world, dt) {
  const van = carById(world, world.mission.targetId);
  if (van === null || van.driver?.type !== 'fugitive') return;
  const dx = van.x - world.player.x;
  const dy = van.y - world.player.y;
  const escape = Math.atan2(dy, dx);
  const speed = van.hp < 40 ? 0 : van.hp < 70 ? 110 : van.route.cruise;
  const wheel = limit(bearingDifference(escape, van.angle) * 1.5, -1, 1);
  driveCar(world, van, {
    gas: Math.abs(van.velocity) < speed ? 1 : -1,
    wheel,
    handbrake: false,
  }, dt);
}

function driveEscort(world, dt) {
  const van = carById(world, world.mission.targetId);
  if (van === null || van.driver?.type !== 'escort') return;
  const goal = place(world, 'yacht');
  const desired = Math.atan2(goal.y - van.y, goal.x - van.x);
  const delta = bearingDifference(desired, van.angle);
  const distance = Math.hypot(goal.x - van.x, goal.y - van.y);
  driveCar(world, van, {
    gas: distance < 90 ? -1 : Math.abs(delta) > 1.2 ? 0.4 : 1,
    wheel: limit(delta * 1.4, -1, 1),
    handbrake: false,
  }, dt);
}

export function moveStory(world, dt, controls) {
  if (continueTalk(world, controls)) return;
  const mission = world.mission;

  if (mission.failed) {
    mission.retryIn -= dt;
    if (mission.retryIn <= 0 && controls.confirm) retryStory(world);
    return;
  }

  if (!mission.active) {
    const pin = storyPinAt(world);
    if (pin !== null && controls.enter && playerGap(world, pin) < 100) beginStory(world, mission.id);
    return;
  }

  if (mission.timer > 0) {
    mission.timer = Math.max(0, mission.timer - dt);
    if (mission.timer === 0) {
      missStory(world, 'Time ran out');
      return;
    }
  }

  driveFugitive(world, dt);
  driveEscort(world, dt);

  const stage = STORY[mission.id]?.stages[mission.phase];
  if (!stage) return;
  if (stage.spoil && stage.spoil(world)) {
    missStory(world, stage.why ?? 'Objective lost');
    return;
  }
  if (!stage.done(world)) return;
  if (mission.phase + 1 >= STORY[mission.id].stages.length) payOut(world);
  else enterStage(world, mission.phase + 1);
}

export function storyObjective(world) {
  if (world.dialogue) return 'Press Enter to continue the conversation';
  const mission = world.mission;
  if (mission.failed) return `Mission failed — ${mission.failure} · Enter to retry`;
  if (!mission.active) {
    const pin = storyPinAt(world);
    return pin === null
      ? 'Story complete — explore Solara Bay'
      : `Press E at ${pin.label} to begin the next mission`;
  }
  const stage = STORY[mission.id]?.stages[mission.phase];
  if (!stage) return '';
  let text = stage.goal;
  if (mission.id === 3) text = `${text} (${mission.kills}/6)`;
  if (mission.id === 7) text = `${text} (${mission.kills}/8)`;
  if (mission.timer > 0) text += ` · ${Math.ceil(mission.timer)}s`;
  return text;
}

export function storyTitle(world) {
  return JOB_NAMES[Math.min(world.mission.id, JOB_NAMES.length - 1)];
}

export function storyKill(world, person) {
  if (!world.mission.active || person.type !== 'enemy') return;
  world.mission.kills += 1;
  world.sound('hit');
}

export const STORY_COUNT = STORY.length;
