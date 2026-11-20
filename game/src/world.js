import { createRandom, clamp } from './random.js';
import { createCity, districtAt, streetName, nearestRoad, shopAt, resolveCircle } from './city.js';
import { createCamera, updateCamera, addShake } from './camera.js';
import { neutralControls } from './input.js';
import { createEffects, updateEffects, addFlash, emit } from './effects.js';
import {
  createWanted, updateWanted, reportCrime, setWantedLevel, clearWanted, tryPayNSpray,
} from './wanted.js';
import {
  spawnVehicle, findVehicle, nearestVehicle, updateVehicle, ejectDriver,
  randomParkedCar, vehicleSpec, resolveVehicleCollisions,
} from './vehicles.js';
import { maintainTraffic, updateTraffic } from './traffic.js';
import { maintainPeds, updatePeds, spawnPed, damagePed, alertPeds } from './peds.js';
import { updatePolice, clearPoliceUnits, spawnPoliceUnit, spawnRoadblock } from './police.js';
import {
  fireBullet, updateBullets, firePlayerWeapon, updateWeapon, startReload,
  updatePickups, spawnPickup,
} from './combat.js';
import { createMissionState, updateMissions, nextMissionMarker, onMissionPedKilled } from './missions.js';
import { createActivityState, updateActivities, onActivityPedKilled, activityMarkers } from './activities.js';
import { createMusic, updateMusic } from './music.js';
import { setEngine, setSiren, sfx } from './audio.js';
import { updateTime } from './environment.js';
import { INTRO_DIALOGUE } from './story.js';

export function createWorld(seed, options = {}) {
  const random = createRandom(seed);
  const city = createCity(seed);
  const start = shopAt(city, 'cafe') ?? { x: 1590, y: 1150 };
  const player = {
    x: start.x,
    y: start.y + 16,
    angle: 0,
    aimX: start.x + 100,
    aimY: start.y + 16,
    hp: 100,
    armor: 0,
    money: 260,
    respect: 0,
    weapon: 'fists',
    hasPistol: false,
    ammo: 0,
    reserve: 0,
    fireCooldown: 0,
    reloading: 0,
    invulnerable: 0,
    inVehicle: null,
    dead: false,
  };
  const camera = createCamera(player.x, player.y);
  const world = {
    seed,
    random,
    city,
    nextId: 1,
    time: 0,
    timeOfDay: 0.42,
    stepHint: 0,
    silent: options.silent === true,
    player,
    camera,
    wanted: createWanted(),
    effects: createEffects(),
    mission: createMissionState(),
    activity: createActivityState(),
    vehicles: [],
    peds: [],
    bullets: [],
    pickups: [],
    roadblocks: [],
    toasts: [],
    dialogue: null,
    endKind: null,
    endLoss: 0,
    respawnTimer: 0,
    area: {
      name: districtAt(player.x, player.y),
      street: streetName('h', 5),
      life: 0,
      last: '',
    },
    menu: { index: 0 },
    storyMarker: null,
    trafficTimer: 0,
    pedTimer: 0,
    roadblockTimer: 16,
    music: createMusic(),
    controls: neutralControls(),
  };

  world.toast = (message) => {
    world.toasts.push({
      text: message,
      life: 3.6,
      maxLife: 3.6,
      width: Math.min(430, Math.max(240, message.length * 8.4 + 34)),
    });
    if (world.toasts.length > 4) world.toasts.shift();
  };

  world.sfx = (name, parameter) => {
    if (!world.silent) sfx(name, parameter);
  };

  world.reportCrime = (amount, label) => reportCrime(world, amount, label);
  world.setWantedLevel = (level, reason) => setWantedLevel(world, level, reason);
  world.spawnPed = (x, y, mode, type) => spawnPed(world, x, y, mode, type);
  world.fireBullet = (bullet) => fireBullet(world, bullet);
  world.openDialogue = (lines, onClose) => {
    world.dialogue = { lines, index: 0, onClose: onClose ?? null };
  };
  world.clearWantedForMission = () => {
    clearWanted(world, 'Mission complete');
    clearPoliceUnits(world);
  };
  world.onPedKilled = (ped) => {
    onMissionPedKilled(world, ped);
    onActivityPedKilled(world, ped);
  };
  world.damagePlayer = (amount, source) => damagePlayer(world, amount, source);
  world.bustPlayer = () => bustPlayer(world);

  for (let i = 0; i < 20; i += 1) randomParkedCar(world);
  maintainTraffic(world);
  maintainPeds(world);

  const supply = [
    { type: 'pistol', shop: 'rampage' },
    { type: 'armor', shop: 'hospital' },
    { type: 'health', shop: 'safehouse' },
    { type: 'cash', shop: 'delivery' },
    { type: 'pistol', x: 3080, y: 1860 },
    { type: 'armor', x: 660, y: 1760 },
  ];
  for (const item of supply) {
    const place = item.shop ? shopAt(city, item.shop) : item;
    if (place) spawnPickup(world, item.type, place.x + 26, place.y + 24);
  }
  world.storyMarker = nextMissionMarker(world);

  function followCamera(dt) {
    let leadX = 0;
    let leadY = 0;
    if (player.inVehicle !== null) {
      const car = findVehicle(world, player.inVehicle);
      if (car) {
        leadX = Math.cos(car.angle) * car.speed * 0.34;
        leadY = Math.sin(car.angle) * car.speed * 0.34;
      }
    }
    updateCamera(camera, { ...player, stepHint: world.stepHint }, dt, leadX, leadY);
  }

  function step(dt, controls = neutralControls()) {
    world.stepHint += dt * 60;
    world.time += dt;
    updateTime(world, dt);

    for (let i = world.toasts.length - 1; i >= 0; i -= 1) {
      world.toasts[i].life -= dt;
      if (world.toasts[i].life <= 0) world.toasts.splice(i, 1);
    }
    if (world.area.life > 0) world.area.life -= dt;

    if (player.dead) {
      world.respawnTimer -= dt;
      updateEffects(world, dt);
      followCamera(dt);
      if (world.respawnTimer <= 0 && controls.confirm) respawn(world);
      return;
    }

    movePlayer(controls, dt);
    if (controls.reload) startReload(world);
    if (controls.weaponSlot === 1) player.weapon = 'fists';
    if (controls.weaponSlot === 2 && player.hasPistol) player.weapon = 'pistol';

    if (!world.dialogue) {
      firePlayerWeapon(world, controls);
      if (!markerWithinReach(world)) handleInteractions(controls);
    }

    updateWeapon(world, dt);
    updateTraffic(world, dt);
    updatePolice(world, dt);
    updatePeds(world, dt);
    updateMissions(world, dt, controls);
    updateActivities(world, dt, controls);
    updateBullets(world, dt);
    updatePickups(world, dt);
    resolveVehicleCollisions(world);
    updateWanted(world, dt);
    updateEffects(world, dt);
    updateArea();
    world.storyMarker = nextMissionMarker(world);
    followCamera(dt);
    updateAudio(dt);
  }

  function movePlayer(controls, dt) {
    player.invulnerable = Math.max(0, player.invulnerable - dt);
    player.aimX = controls.aimX;
    player.aimY = controls.aimY;

    if (player.inVehicle !== null) {
      const car = findVehicle(world, player.inVehicle);
      if (!car || !car.alive) {
        player.inVehicle = null;
      } else {
        player.x = car.x;
        player.y = car.y;
        player.angle = Math.atan2(player.aimY - player.y, player.aimX - player.x);
        updateVehicle(world, car, {
          throttle: -controls.y,
          steer: controls.x,
          handbrake: controls.handbrake,
          horn: controls.horn,
        }, dt);
        return;
      }
    }

    let dx = controls.x;
    let dy = controls.y;
    const length = Math.hypot(dx, dy);
    if (length > 1) { dx /= length; dy /= length; }
    const speed = controls.run ? 216 : 138;
    const next = resolveCircle(city, player.x + dx * speed * dt, player.y + dy * speed * dt, 9);
    player.x = next.x;
    player.y = next.y;
    player.angle = Math.atan2(player.aimY - player.y, player.aimX - player.x);
  }

  function handleInteractions(controls) {
    if (!controls.interact && !controls.interactAlt) return;
    if (controls.interact && tryPayNSpray(world)) return;

    if (player.inVehicle !== null) {
      const car = findVehicle(world, player.inVehicle);
      if (car) {
        const side = car.angle + Math.PI / 2;
        const spot = resolveCircle(city, car.x + Math.cos(side) * 32, car.y + Math.sin(side) * 32, 10);
        player.x = spot.x;
        player.y = spot.y;
        car.driver = null;
        world.toast(`Left the ${vehicleSpec(car).label}`);
      }
      player.inVehicle = null;
      return;
    }

    const car = nearestVehicle(world, player.x, player.y, 74);
    if (car === null) return;
    if (car.driver && car.driver.type !== 'player') {
      ejectDriver(world, car);
      world.reportCrime(22, 'Carjacking');
      world.toast(`Jacked the ${vehicleSpec(car).label}`);
    } else {
      world.toast(`Entered the ${vehicleSpec(car).label}`);
    }
    car.driver = { type: 'player' };
    car.ai = null;
    car.siren = car.type === 'police';
    player.inVehicle = car.id;
    player.x = car.x;
    player.y = car.y;
    world.sfx('carEnter');
  }

  function damagePlayer(amount, source) {
    if (player.dead || player.invulnerable > 0) return;
    let remaining = amount;
    if (player.armor > 0) {
      const blocked = Math.min(player.armor, amount * 0.62);
      player.armor -= blocked;
      remaining -= blocked;
    }
    player.hp -= remaining;
    player.invulnerable = 0.32;
    addFlash(world, '#d34d45', 0.12, 0.16);
    addShake(camera, 6);
    emit(world, 'spark', player.x, player.y, 3, {
      spread: 1.4, color: '#ff8f7c', size: 2.4, life: 0.3,
    });
    world.sfx('hit');
    if (player.hp <= 0) {
      player.hp = 0;
      wastePlayer();
    } else if (source === 'police') world.toast('Officer fired at you');
  }

  function wastePlayer() {
    player.dead = true;
    player.inVehicle = null;
    world.endLoss = Math.round(player.money * 0.12);
    player.money -= world.endLoss;
    world.endKind = 'wasted';
    world.respawnTimer = 2.6;
    clearWanted(world, 'Wasted');
    clearPoliceUnits(world);
    world.sfx('fail');
    addFlash(world, '#8b1f1f', 0.5, 0.8);
  }

  function bustPlayer() {
    if (player.dead) return;
    player.dead = true;
    player.inVehicle = null;
    world.endLoss = Math.round(player.money * 0.25);
    player.money -= world.endLoss;
    world.endKind = 'busted';
    world.respawnTimer = 2.6;
    clearWanted(world, 'Busted');
    clearPoliceUnits(world);
    world.sfx('fail');
    addFlash(world, '#294a8c', 0.4, 0.6);
  }

  function respawn() {
    const hospital = shopAt(city, 'hospital') ?? { x: 1590, y: 1370 };
    player.x = hospital.x + 18;
    player.y = hospital.y + 26;
    player.hp = 100;
    player.armor = 0;
    player.dead = false;
    player.invulnerable = 2;
    player.inVehicle = null;
    world.endKind = null;
    world.respawnTimer = 0;
    camera.x = player.x;
    camera.y = player.y;
    world.toast('Back on the street');
  }

  function updateArea() {
    const name = districtAt(player.x, player.y);
    if (name === world.area.last) return;
    world.area.last = name;
    world.area.name = name;
    const road = nearestRoad(player.x, player.y);
    world.area.street = streetName(road.axis, road.index);
    world.area.life = 3.2;
  }

  function updateAudio(dt) {
    if (world.silent) return;
    let engineSpeed = 0;
    let engineActive = false;
    let sirenVolume = 0;
    if (player.inVehicle !== null) {
      const car = findVehicle(world, player.inVehicle);
      if (car) {
        engineActive = true;
        engineSpeed = car.speed;
      }
    }
    for (const vehicle of world.vehicles) {
      if (vehicle.driver?.type !== 'police' || !vehicle.siren) continue;
      const away = Math.hypot(vehicle.x - player.x, vehicle.y - player.y);
      if (away < 700) sirenVolume = Math.max(sirenVolume, 1 - away / 700);
    }
    setEngine(engineSpeed, engineActive);
    setSiren(sirenVolume > 0, sirenVolume, world.time * 7);
    updateMusic(world.music, dt, world.timeOfDay);
  }

  world.step = step;
  world.respawn = respawn;
  world.neutralControls = neutralControls;
  return world;
}

function markerWithinReach(world) {
  if (world.player.inVehicle !== null) return false;
  const marker = world.mission.active || world.mission.failed ? null : world.storyMarker;
  if (marker && Math.hypot(marker.x - world.player.x, marker.y - world.player.y) < 104) return true;
  for (const job of activityMarkers(world)) {
    if (Math.hypot(job.x - world.player.x, job.y - world.player.y) < 110) return true;
  }
  return false;
}

export { INTRO_DIALOGUE, updateWanted, clamp, spawnPoliceUnit, spawnRoadblock, alertPeds, damagePed };
