import { MAP, PALETTE } from './config.js';
import { makeRandom, limit } from './random.js';
import {
  clearOfBuildings, closestLane, districtAt, generateCity, shopByKind, streetAt,
} from './city.js';
import { followCamera, kickCamera, makeCamera } from './camera.js';
import { idle } from './input.js';
import { makeEffects, screenTint, spray, stepEffects } from './effects.js';
import {
  buyPaintJob, clearHeat, coolWanted, makeWanted, reportCrime,
} from './wanted.js';
import {
  carById, carNearby, crashCars, driveCar, evictDriver, parkedCar,
} from './vehicles.js';
import { keepTraffic, moveTraffic } from './traffic.js';
import { keepPeds, movePeople, newPed } from './peds.js';
import { movePolice, recallUnits } from './police.js';
import {
  beginReload, dropPickup, fireWeapon, shoot, tickBullets, tickPickups, tickWeapon,
} from './combat.js';
import { makeMission, moveStory, storyKill, storyPinAt } from './missions.js';
import { makeSide, moveSide, sideKill, sideMarkers } from './activities.js';
import { createMusic, updateMusic } from './music.js';
import { advanceDay } from './environment.js';
import { setEngine, setSiren, sfx } from './audio.js';

export function createWorld(seed, options = {}) {
  const rng = makeRandom(seed);
  const city = generateCity(seed);
  const cafe = shopByKind(city, 'cafe') ?? { x: 1600, y: 1200 };
  const player = {
    x: cafe.x + 18,
    y: cafe.y + 26,
    angle: 0,
    aimX: cafe.x + 200,
    aimY: cafe.y + 26,
    hp: 100,
    armor: 0,
    money: 280,
    respect: 0,
    weapon: 'fists',
    hasGun: false,
    ammo: 0,
    reserve: 0,
    fireClock: 0,
    reloadClock: 0,
    muzzle: 0,
    guard: 0,
    carId: null,
    dead: false,
  };
  const world = {
    seed,
    rng,
    nextId: 1,
    city,
    camera: makeCamera(player.x, player.y),
    player,
    wanted: makeWanted(),
    mission: makeMission(),
    activity: makeSide(),
    effects: makeEffects(),
    vehicles: [],
    peds: [],
    bullets: [],
    loot: [],
    barriers: [],
    toasts: [],
    dialogue: null,
    area: {
      name: districtAt(player.x, player.y),
      street: streetAt('h', 4),
      life: 0,
      last: '',
    },
    menu: { index: 0 },
    storyPin: null,
    endKind: null,
    endLoss: 0,
    respawnTimer: 0,
    time: 0,
    tickHint: 0,
    dayClock: 0.36,
    flowClock: 0,
    pedClock: 0,
    blockClock: 14,
    silent: options.silent === true,
    hasSave: false,
    music: createMusic(),
  };

  world.notify = (message) => {
    world.toasts.push({
      text: message,
      life: 3.6,
      width: limit(message.length * 8.6 + 36, 250, 470),
    });
    if (world.toasts.length > 4) world.toasts.shift();
  };

  world.sound = (name, parameter = 0) => {
    if (!world.silent) sfx(name, parameter);
  };

  world.crime = (amount, label = '') => reportCrime(world, amount, label);
  world.shoot = (bullet) => shoot(world, bullet);
  world.spawnPerson = (x, y, posture = 'walk') => newPed(world, x, y, posture, 'civilian');
  world.openTalk = (lines, after = null) => {
    world.dialogue = { lines, line: 0, after };
  };
  world.personDown = (person) => {
    storyKill(world, person);
    sideKill(world, person);
  };
  world.clearHeatAfterMission = () => {
    clearHeat(world, 'Mission complete');
    recallUnits(world);
    world.barriers.length = 0;
  };
  world.hurtPlayer = (amount, source = '') => hurtPlayer(amount, source);
  world.arrestPlayer = () => bust();

  for (let i = 0; i < 18; i += 1) parkedCar(world);
  keepTraffic(world);
  keepPeds(world);

  const supplies = [
    ['pistol', 'rampage'],
    ['armor', 'hospital'],
    ['health', 'safehouse'],
    ['cash', 'delivery'],
  ];
  for (const [kind, venue] of supplies) {
    const shop = shopByKind(city, venue);
    if (shop) dropPickup(world, kind, shop.x + 26, shop.y + 24);
  }
  dropPickup(world, 'pistol', 3040, 1840);
  dropPickup(world, 'armor', 680, 1760);
  world.storyPin = storyPinAt(world);

  function cameraLead() {
    if (player.carId === null) return { x: 0, y: 0 };
    const car = carById(world, player.carId);
    if (car === null) return { x: 0, y: 0 };
    return { x: Math.cos(car.angle) * car.velocity * 0.32, y: Math.sin(car.angle) * car.velocity * 0.32 };
  }

  function follow(dt) {
    const lead = cameraLead();
    followCamera(world.camera, world, dt, lead.x, lead.y);
  }

  function movePlayer(controls, dt) {
    player.guard = Math.max(0, player.guard - dt);
    player.aimX = controls.aimX;
    player.aimY = controls.aimY;

    if (player.carId !== null) {
      const car = carById(world, player.carId);
      if (car === null) {
        player.carId = null;
      } else {
        driveCar(world, car, {
          gas: -controls.y,
          wheel: controls.x,
          handbrake: controls.brake,
          horn: controls.horn,
        }, dt);
        player.x = car.x;
        player.y = car.y;
        player.angle = Math.atan2(player.aimY - player.y, player.aimX - player.x);
        return;
      }
    }

    let dx = controls.x;
    let dy = controls.y;
    const length = Math.hypot(dx, dy);
    if (length > 1) {
      dx /= length;
      dy /= length;
    }
    const pace = controls.run ? 216 : 138;
    const landing = clearOfBuildings(
      city,
      player.x + dx * pace * dt,
      player.y + dy * pace * dt,
      9,
    );
    player.x = landing.x;
    player.y = landing.y;
    player.angle = Math.atan2(player.aimY - player.y, player.aimX - player.x);
  }

  function nearMarker() {
    if (world.storyPin !== null
      && Math.hypot(world.storyPin.x - player.x, world.storyPin.y - player.y) < 100) return true;
    if (world.activity.active) return false;
    return sideMarkers(world).some((marker) => (
      Math.hypot(marker.x - player.x, marker.y - player.y) < 110
    ));
  }

  function handleInteractions(controls) {
    if (controls.enter && player.carId !== null) {
      buyPaintJob(world);
      return;
    }
    if (controls.enter) {
      const car = carNearby(world, player.x, player.y, 78);
      if (car === null) return;
      if (car.driver && car.driver.type !== 'player') {
        evictDriver(world, car);
        world.crime(22, 'Carjacking');
      }
      car.driver = { type: 'player' };
      car.siren = car.kind === 'police';
      player.carId = car.id;
      player.x = car.x;
      player.y = car.y;
      world.notify(`Entered the car`);
      world.sound('carEnter');
      return;
    }
    if (!controls.leave || player.carId === null) return;
    const car = carById(world, player.carId);
    if (car === null) {
      player.carId = null;
      return;
    }
    const side = car.angle + Math.PI / 2;
    const spot = clearOfBuildings(
      city,
      car.x + Math.cos(side) * 34,
      car.y + Math.sin(side) * 34,
      10,
    );
    car.driver = null;
    player.carId = null;
    player.x = spot.x;
    player.y = spot.y;
    world.notify('Left the car');
    world.sound('carEnter');
  }

  function hurtPlayer(amount, source) {
    if (player.dead || player.guard > 0) return;
    let wound = amount;
    if (player.armor > 0) {
      const soaked = Math.min(player.armor, amount * 0.62);
      player.armor -= soaked;
      wound -= soaked;
    }
    player.hp -= wound;
    player.guard = 0.32;
    screenTint(world, '#d85048', 0.12, 0.16);
    kickCamera(world.camera, 6);
    spray(world, 'spark', player.x, player.y, 4, {
      scatter: 1.4, color: PALETTE.coral, size: 2.5, life: 0.3,
    });
    world.sound('hit');
    if (player.hp <= 0) {
      player.hp = 0;
      waste();
    } else if (source === 'police') world.notify('Officer fired at you');
  }

  function waste() {
    player.dead = true;
    player.carId = null;
    world.endLoss = Math.round(player.money * 0.12);
    player.money -= world.endLoss;
    world.endKind = 'wasted';
    world.respawnTimer = 2.6;
    clearHeat(world, 'Wasted');
    recallUnits(world);
    world.barriers.length = 0;
    screenTint(world, '#8b1f1f', 0.5, 0.8);
    world.sound('fail');
  }

  function bust() {
    if (player.dead) return;
    player.dead = true;
    player.carId = null;
    world.endLoss = Math.round(player.money * 0.25);
    player.money -= world.endLoss;
    world.endKind = 'busted';
    world.respawnTimer = 2.6;
    clearHeat(world, 'Busted');
    recallUnits(world);
    world.barriers.length = 0;
    screenTint(world, '#294a8c', 0.4, 0.6);
    world.sound('fail');
  }

  function respawn() {
    const clinic = shopByKind(city, 'hospital') ?? { x: 1600, y: 1360 };
    player.x = clinic.x + 18;
    player.y = clinic.y + 26;
    player.hp = 100;
    player.armor = 0;
    player.guard = 2;
    player.dead = false;
    player.carId = null;
    world.endKind = null;
    world.respawnTimer = 0;
    world.camera.x = player.x;
    world.camera.y = player.y;
    world.notify('Back on the street');
  }

  function updateArea() {
    const name = districtAt(player.x, player.y);
    if (name === world.area.last) return;
    world.area.last = name;
    world.area.name = name;
    const lane = closestLane(player.x, player.y);
    world.area.street = streetAt(lane.axis, lane.index);
    world.area.life = 3.2;
  }

  function updateAudio(dt) {
    if (world.silent) return;
    let engineSpeed = 0;
    let driving = false;
    if (player.carId !== null) {
      const car = carById(world, player.carId);
      if (car !== null) {
        engineSpeed = car.velocity;
        driving = true;
      }
    }
    let close = 0;
    for (const car of world.vehicles) {
      if (car.driver?.type !== 'officer' || !car.siren) continue;
      const away = Math.hypot(car.x - player.x, car.y - player.y);
      if (away < 700) close = Math.max(close, 1 - away / 700);
    }
    setEngine(engineSpeed, driving);
    setSiren(close > 0, close, world.time * 7);
    updateMusic(world.music, dt, world.dayClock);
  }

  function step(dt, controls = idle()) {
    world.tickHint += dt * 60;
    world.time += dt;
    advanceDay(world, dt);

    for (let i = world.toasts.length - 1; i >= 0; i -= 1) {
      world.toasts[i].life -= dt;
      if (world.toasts[i].life <= 0) world.toasts.splice(i, 1);
    }
    if (world.area.life > 0) world.area.life -= dt;

    if (player.dead) {
      world.respawnTimer -= dt;
      stepEffects(world, dt);
      follow(dt);
      if (world.respawnTimer <= 0 && controls.confirm) respawn();
      return;
    }

    movePlayer(controls, dt);
    if (controls.slot === 1) player.weapon = 'fists';
    else if (controls.slot === 2 && player.hasGun) player.weapon = 'pistol';
    if (controls.reload) beginReload(world);

    if (!world.dialogue) {
      if (!nearMarker()) handleInteractions(controls);
      fireWeapon(world, controls);
    }
    tickWeapon(world, dt);
    moveTraffic(world, dt);
    movePolice(world, dt);
    movePeople(world, dt);
    moveStory(world, dt, controls);
    moveSide(world, dt, controls);
    crashCars(world);
    tickBullets(world, dt);
    tickPickups(world, dt);
    coolWanted(world, dt);
    stepEffects(world, dt);
    updateArea();
    world.storyPin = storyPinAt(world);
    follow(dt);
    updateAudio(dt);
  }

  world.step = step;
  world.respawn = respawn;
  return world;
}
