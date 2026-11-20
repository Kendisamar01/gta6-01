import { spawnVehicle, driveVehicle, spawnVehicle as makeVehicle } from './vehicles.js';
import { spawnPed, hurtPed } from './peds.js';
import { fireBullet, giveWeapon } from './combat.js';
import { addCrime, clearWanted } from './wanted.js';
import { notify } from './world.js';
import { MISSIONS, SIDE_ACTIVITIES } from './story.js';

function landmark(world, name) {
  const place = world.city.landmarks.find((item) => item.name === name);
  return place ? { x: place.x, y: place.y } : { x: world.player.x + 300, y: world.player.y + 200 };
}

function distanceTo(point, actor) {
  return Math.hypot(point.x - actor.x, point.y - actor.y);
}

function setTarget(world, point, label) {
  world.mission.target = point ? { x: point.x, y: point.y, label } : null;
}

export function init(world) {
  const mission = world.mission;
  mission.index = Math.min(mission.index || 0, MISSIONS.length - 1);
  mission.active = null;
  mission.dialogue = null;
  mission.failed = false;
  mission.text = MISSIONS[mission.index].brief;
  setTarget(world, landmark(world, MISSIONS[mission.index].targetName), MISSIONS[mission.index].name);
}

function start(world, index) {
  const definition = MISSIONS[index];
  if (!definition) return;
  const mission = world.mission;
  mission.index = index;
  mission.active = definition;
  mission.stage = 0;
  mission.timer = definition.seconds || 0;
  mission.dialogue = { lines: definition.intro.slice(), line: 0 };
  mission.failed = false;
  mission.text = definition.brief;
  mission.enemiesSpawned = false;
  const targetName = definition.targetName || definition.dropName;
  setTarget(world, targetName ? landmark(world, targetName) : null, definition.name);
  world.events.push({ type: 'missionStart', name: definition.name });
  notify(world, definition.name, 'mission');
}

function spawnEnemies(world, count) {
  for (let i = 0; i < count; i += 1) {
    const angle = world.random() * Math.PI * 2;
    const ped = spawnPed(world, world.player.x + Math.cos(angle) * 260,
      world.player.y + Math.sin(angle) * 260, 'enemy');
    ped.weapon = 'pistol';
    ped.fireTimer = world.random();
    ped.health = 75;
  }
  giveWeapon(world, 'pistol', 72);
}

function complete(world) {
  const mission = world.mission;
  const definition = mission.active;
  if (!definition) return;
  world.player.money += definition.reward;
  world.player.respect += 100;
  world.stats.missionWins += 1;
  mission.completed.push(definition.name);
  mission.index = Math.min(MISSIONS.length - 1, mission.index + 1);
  mission.active = null;
  mission.dialogue = null;
  mission.stage = 0;
  mission.text = mission.index < MISSIONS.length ? MISSIONS[mission.index].brief : 'All jobs done. Enjoy the bay.';
  setTarget(world, landmark(world, MISSIONS[mission.index].targetName), MISSIONS[mission.index].name);
  notify(world, `${definition.name} complete  +$${definition.reward}`, 'good');
  world.events.push({ type: 'missionComplete', name: definition.name, reward: definition.reward });
}

function fail(world, reason) {
  if (world.mission.failed) return;
  world.mission.failed = true;
  world.mission.text = `${reason} — press ENTER to retry`;
  notify(world, `${world.mission.active?.name || 'Mission'} failed: ${reason}`, 'warn');
  world.events.push({ type: 'missionFail', reason });
}

function startSide(world, kind) {
  const side = world.side;
  if (side.cooldown > 0) return;
  if (kind === 'taxi') {
    const destination = world.city.landmarks[Math.floor(world.random() * world.city.landmarks.length)];
    side.taxi = { destination, stage: 0 };
    setTarget(world, destination, 'Taxi fare');
    world.mission.text = 'Taxi: reach the fare, then the drop-off.';
    notify(world, SIDE_ACTIVITIES.taxi.name);
  } else if (kind === 'rampage') {
    side.rampage = 55;
    side.rampageStart = world.stats.crashes;
    world.mission.text = 'Rampage: wreck as much as you can.';
    notify(world, SIDE_ACTIVITIES.rampage.name);
  } else {
    side.delivery = 3;
    side.deliveryIndex = 0;
    const place = world.city.landmarks[(2 + Math.floor(world.random() * 3)) % world.city.landmarks.length];
    setTarget(world, place, 'Delivery');
    world.mission.text = 'Courier: reach all three checkpoints.';
    notify(world, SIDE_ACTIVITIES.delivery.name);
  }
  side.cooldown = 2;
}

function updateSide(world, dt) {
  const side = world.side;
  side.cooldown = Math.max(0, side.cooldown - dt);
  if (side.taxi) {
    if (distanceTo(side.taxi.destination, world.player) < 80) {
      world.player.money += SIDE_ACTIVITIES.taxi.reward;
      world.stats.fares += 1;
      side.taxi = null;
      world.mission.text = 'Fare paid. Look for another fare.';
      notify(world, `Fare paid +$${SIDE_ACTIVITIES.taxi.reward}`, 'good');
      setTarget(world, null, '');
    }
  }
  if (side.rampage > 0) {
    side.rampage -= dt;
    if (side.rampage <= 0) {
      const score = Math.max(0, world.stats.crashes - side.rampageStart) * 28;
      world.player.money += score;
      side.rampage = 0;
      world.mission.text = 'Rampage over. Cash in hand.';
      notify(world, `Rampage paid +$${score}`, 'good');
    }
  }
  if (side.delivery > 0) {
    if (world.mission.target && distanceTo(world.mission.target, world.player) < 70) {
      side.delivery -= 1;
      side.deliveryIndex += 1;
      if (side.delivery <= 0) {
        world.player.money += SIDE_ACTIVITIES.delivery.reward;
        world.stats.deliveries += 1;
        side.delivery = 0;
        notify(world, `Courier paid +$${SIDE_ACTIVITIES.delivery.reward}`, 'good');
        setTarget(world, null, '');
      } else {
        const place = world.city.landmarks[(side.deliveryIndex + 1) % world.city.landmarks.length];
        setTarget(world, place, 'Delivery');
      }
    }
  }
}

function updateMission(world, dt, api) {
  const mission = world.mission;
  const definition = mission.active;
  if (!definition) {
    if (!mission.dialogue && !world.mission.target) {
      setTarget(world, landmark(world, MISSIONS[mission.index].targetName), MISSIONS[mission.index].name);
    }
    if (mission.target && distanceTo(mission.target, world.player) < 80 && !world.side.taxi) start(world, mission.index);
    return;
  }
  if (mission.dialogue) return;
  if (mission.failed) return;
  const target = mission.target;
  if (definition.type === 'goto' && target && distanceTo(target, world.player) < 85) complete(world);
  else if (definition.type === 'timed') {
    mission.timer -= dt;
    if (mission.timer <= 0) fail(world, 'Too slow');
    else if (target && distanceTo(target, world.player) < 90) complete(world);
  } else if (definition.type === 'steal') {
    if (mission.stage === 0) {
      let car = world.vehicles.find((item) => item.type === definition.carType && !item.dead);
      if (!car) {
        car = makeVehicle(world, definition.carType, world.player.x + 150, world.player.y + 90, 0, 'parked');
        world.vehicles.push(car);
      }
      mission.stageCar = car.id;
      setTarget(world, car, 'Steal van');
      mission.stage = 1;
    } else if (mission.stage === 1) {
      const car = world.vehicles.find((item) => item.id === mission.stageCar);
      if (!car || car.dead) fail(world, 'Van destroyed');
      else if (world.player.inVehicle === car.id) {
        mission.stage = 2;
        setTarget(world, landmark(world, definition.dropName), 'Deliver van');
      }
    } else if (target && distanceTo(target, world.player) < 100 && world.player.inVehicle === mission.stageCar) {
      if (Math.abs(world.player.vx) + Math.abs(world.player.vy) < 75) complete(world);
      else mission.text = 'Slow down and park the van.';
    }
  } else if (definition.type === 'escort') {
    if (mission.stage === 0) {
      const taxi = makeVehicle(world, 'taxi', world.player.x + 60, world.player.y + 40, 0, 'player');
      world.vehicles.push(taxi);
      world.player.inVehicle = taxi.id;
      mission.stageCar = taxi.id;
      mission.stage = 1;
      notify(world, 'Nia is in the car. Drive.');
    } else if (target && distanceTo(target, world.player) < 110) complete(world);
  } else if (definition.type === 'survive') {
    if (!mission.enemiesSpawned) {
      spawnEnemies(world, definition.enemies);
      mission.enemiesSpawned = true;
      setTarget(world, null, '');
    }
    const left = world.peds.filter((ped) => ped.role === 'enemy' && !ped.dead).length;
    mission.text = `Survive the ambush — ${left} hostiles left`;
    if (left === 0) complete(world);
  } else if (definition.type === 'chase') {
    if (mission.stage === 0) {
      const car = makeVehicle(world, 'sedan', world.player.x + Math.cos(world.player.angle) * 320,
        world.player.y + Math.sin(world.player.angle) * 320, world.player.angle, 'flee');
      car.color = '#8fd0c9';
      world.vehicles.push(car);
      mission.stageCar = car.id;
      mission.stage = 1;
      notify(world, 'Ram the witness car!');
    }
    const car = world.vehicles.find((item) => item.id === mission.stageCar);
    if (!car || car.dead || car.damage > 88) complete(world);
    else {
      setTarget(world, car, 'Witness');
      const dx = car.x - world.player.x;
      const dy = car.y - world.player.y;
      const angle = Math.atan2(dy, dx);
      let difference = angle - car.angle;
      while (difference > Math.PI) difference -= Math.PI * 2;
      while (difference < -Math.PI) difference += Math.PI * 2;
      driveVehicle(world, car, distanceTo(car, world.player) < 130 ? 1 : 0.85, difference * 1.2, false, dt, api);
    }
  } else if (definition.type === 'escape') {
    if (mission.stage === 0) {
      if (world.wanted >= 3) {
        mission.stage = 1;
        notify(world, 'Heat is up. Lose the cops.');
      } else {
        mission.text = 'Get three wanted stars, then escape';
        setTarget(world, null, '');
      }
    } else if (world.wanted === 0) complete(world);
  } else if (definition.type === 'finale') {
    if (mission.stage === 0 && target && distanceTo(target, world.player) < 110) {
      mission.stage = 1;
      spawnEnemies(world, definition.enemies);
      setTarget(world, null, '');
      addCrime(world, 'jack', 2.4);
    } else if (mission.stage === 1) {
      const left = world.peds.filter((ped) => ped.role === 'enemy' && !ped.dead).length;
      mission.text = `Hold the yard — ${left} hostiles left`;
      if (left === 0) {
        mission.stage = 2;
        notify(world, 'Yard secure. Lose the heat.');
      }
    } else if (mission.stage === 2 && world.wanted === 0) complete(world);
  }

  for (const ped of world.peds) {
    if (ped.dead || ped.role !== 'enemy') continue;
    ped.angle = Math.atan2(world.player.y - ped.y, world.player.x - ped.x);
    ped.fireTimer -= dt;
    const distance = distanceTo(ped, world.player);
    if (ped.fireTimer <= 0 && distance < 380) {
      ped.fireTimer = 0.85 + world.random() * 0.9;
      fireBullet(world, ped.x, ped.y, ped.angle + (world.random() - 0.5) * 0.14,
        { owner: 'police', speed: 460, damage: 8, color: '#ffc477' });
    }
    if (distance > 250) {
      ped.x += Math.cos(ped.angle) * 52 * dt;
      ped.y += Math.sin(ped.angle) * 52 * dt;
    }
  }
}

export function update(world, dt, api) {
  updateSide(world, dt);
  if (world.screen !== 'play') return;
  updateMission(world, dt, api);
}

export function key(code, world) {
  if (code === 'KeyQ') {
    const kinds = ['taxi', 'rampage', 'delivery'];
    const next = kinds[((world.side.lastKind ?? 2) + 1) % kinds.length];
    world.side.lastKind = kinds.indexOf(next);
    startSide(world, next);
    return;
  }
  if (code !== 'Enter' && code !== 'Space') return;
  const mission = world.mission;
  if (mission.failed && mission.active) {
    const index = mission.index;
    mission.failed = false;
    start(world, index);
    return;
  }
  if (mission.dialogue) {
    const dialogue = mission.dialogue;
    dialogue.line += 1;
    if (dialogue.line >= dialogue.lines.length) mission.dialogue = null;
  }
  if (code === 'KeyQ' || code === 'Q') startSide(world, 'taxi');
}

export function sideKey(world, kind) {
  startSide(world, kind);
}

export function stageShot(name, api) {
  const world = api.world;
  if (name === 'mission') {
    start(world, 4);
    world.mission.dialogue = null;
    world.mission.enemiesSpawned = true;
    spawnEnemies(world, 4);
    setTarget(world, landmark(world, 'MARGO TOWER'), 'Ambush point');
    world.mission.text = 'Survive the ambush — 4 hostiles left';
  } else if (name === 'drive') {
    world.mission.index = 1;
    world.mission.text = 'Borrowed Wheels: bring the van to Miracle Detail';
    setTarget(world, landmark(world, 'MIRACLE DETAIL'), 'Drop-off');
  } else if (name === 'chase') {
    start(world, 6);
    world.mission.dialogue = null;
    world.mission.stage = 1;
    world.mission.text = 'Heat Wave: escape the patrol';
    setTarget(world, null, '');
  }
}

export { clearWanted, hurtPed };
