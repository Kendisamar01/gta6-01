import { CITY } from './config.js';

const THRESHOLDS = [0, 14, 38, 72, 116, 170];
const CRIME_HEAT = {
  crash: 3,
  jumping: 4,
  jacking: 19,
  hitcar: 17,
  hitped: 31,
  kill: 38,
  shooting: 15,
  policejack: 48,
  attack: 12,
};

function distance(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}

function starsFor(heat) {
  let stars = 0;
  for (let index = 1; index < THRESHOLDS.length; index += 1) {
    if (heat >= THRESHOLDS[index]) stars = index;
  }
  return stars;
}

export function createWanted(world) {
  const state = world.state;
  const shop = { x: 24 * CITY.cell + CITY.cell / 2, y: 19 * CITY.cell + CITY.cell / 2, cost: 250 };
  const record = {
    heat: state.player.wanted > 0 ? THRESHOLDS[state.player.wanted] : 0,
    stars: state.player.wanted || 0,
    quiet: 0,
    chase: 0,
    bustedTime: 0,
    shop,
    lastCrime: '',
  };
  state.wantedState = record;
  state.policeNearby = false;

  function system(name) {
    return state.systems ? state.systems[name] : null;
  }

  function alert() {
    const police = system('police');
    if (police && police.alert) police.alert(record.stars);
    const audio = system('audio');
    if (audio) audio.setSiren(record.stars > 0, record.stars);
  }

  function addCrime(type, severity, x, y) {
    const base = CRIME_HEAT[type] !== undefined ? CRIME_HEAT[type] : 10 * (severity || 1);
    record.heat = Math.min(220, record.heat + base * (0.85 + (severity || 1) * 0.12));
    record.quiet = 0;
    record.lastCrime = type;
    const next = starsFor(record.heat);
    if (next !== record.stars) {
      record.stars = next;
      state.player.wanted = next;
      const hud = system('hud');
      if (hud) hud.toast(next > 0 ? `${next}-star alert — the city is watching.` : 'Heat cleared.', next >= 3 ? 'danger' : 'warn');
      const audio = system('audio');
      if (audio && next > 0) audio.play('siren');
    }
    const peds = system('peds');
    if (peds && (type === 'shooting' || type === 'kill')) peds.panic(x, y, 260, 7);
    alert();
  }

  function policeGap() {
    let gap = Infinity;
    const peds = Array.isArray(state.peds) ? state.peds : [];
    for (let index = 0; index < peds.length; index += 1) {
      const ped = peds[index];
      if (ped.role !== 'police' || ped.dead) continue;
      gap = Math.min(gap, distance(state.player.x, state.player.y, ped.x, ped.y));
    }
    const vehicles = Array.isArray(state.vehicles) ? state.vehicles : [];
    for (let index = 0; index < vehicles.length; index += 1) {
      const vehicle = vehicles[index];
      if (!vehicle.siren || vehicle.wrecked) continue;
      gap = Math.min(gap, distance(state.player.x, state.player.y, vehicle.x, vehicle.y));
    }
    return gap;
  }

  function atShop() {
    return distance(state.player.x, state.player.y, shop.x, shop.y) < 105;
  }

  function cleanse() {
    const player = state.player;
    if (!atShop()) return false;
    if (player.money < shop.cost) {
      const hud = system('hud');
      if (hud) hud.toast(`Need $${shop.cost} for a full detail.`, 'warn');
      return false;
    }
    player.money -= shop.cost;
    record.heat = 0;
    record.stars = 0;
    record.chase = 0;
    state.busted = false;
    player.wanted = 0;
    const audio = system('audio');
    if (audio) {
      audio.play('confirm');
      audio.setSiren(false, 0);
    }
    const police = system('police');
    if (police && police.standDown) police.standDown();
    const hud = system('hud');
    if (hud) hud.toast('Fresh paint, clean plate. You are gone.', 'good');
    return true;
  }

  function step(dt) {
    const gap = policeGap();
    state.policeNearby = gap < 520;
    record.quiet += dt;
    if (record.stars > 0 && gap < 520) {
      record.chase += dt;
      if (gap < 34) {
        record.bustedTime += dt;
        if (record.bustedTime > 1.8 && !state.player.wasted) {
          state.busted = true;
          state.player.wasted = true;
          const audio = system('audio');
          if (audio) audio.play('fail');
          if (context && context.setScreen) context.setScreen('over');
          const hud = system('hud');
          if (hud) hud.toast('Busted. The law got you.', 'danger');
        }
      } else {
        record.bustedTime = Math.max(0, record.bustedTime - dt * 0.5);
      }
    } else {
      record.chase = Math.max(0, record.chase - dt * 0.4);
      record.bustedTime = 0;
    }
    if (record.stars > 0 && record.quiet > 8) {
      const drain = (gap > 430 ? 14 : gap > 180 ? 6 : 2) * dt;
      record.heat = Math.max(0, record.heat - drain);
      const next = starsFor(record.heat);
      if (next < record.stars) {
        record.stars = next;
        state.player.wanted = next;
        const hud = system('hud');
        if (hud) hud.toast(next === 0 ? 'You lost them.' : `Heat dropping — ${next} star${next === 1 ? '' : 's'}.`, 'good');
        if (next === 0) {
          const police = system('police');
          if (police && police.standDown) police.standDown();
          const audio = system('audio');
          if (audio) audio.setSiren(false, 0);
        }
      }
    } else if (record.stars === 0) {
      record.heat = Math.max(0, record.heat - dt * 5);
    }
    const audio = system('audio');
    if (audio) audio.setSiren(record.stars > 0 && gap < 900, record.stars);
  }

  function reset() {
    record.heat = 0;
    record.stars = 0;
    record.quiet = 0;
    record.chase = 0;
    record.bustedTime = 0;
    state.busted = false;
    state.player.wanted = 0;
    const audio = system('audio');
    if (audio) audio.setSiren(false, 0);
    const police = system('police');
    if (police && police.standDown) police.standDown();
  }

  let context = null;
  alert();
  return { world, record, shop, addCrime, atShop, cleanse, step, reset, policeGap, setContext(value) { context = value; } };
}

let current = null;

export function install(context) {
  current = createWanted(context.world);
  current.setContext(context);
  context.systems.wanted = current;
}

export function addCrime(type, severity, x, y) {
  if (current) current.addCrime(type, severity, x, y);
}

export function clearWanted() {
  if (current) {
    current.record.heat = 0;
    current.record.stars = 0;
    current.record.lastCrime = '';
    current.world.state.player.wanted = 0;
  }
}
