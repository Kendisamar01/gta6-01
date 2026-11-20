const SKIN = ['#e8c49b', '#c98f67', '#a96c4d', '#f0d3ad'];
const SHIRT = ['#5d88a5', '#b6635d', '#7c9b6b', '#c4a052', '#7d6c9a', '#d0d3cf'];

export function createPeds(world) {
  const city = world.city;
  const random = world.random;
  const state = world.state;

  function makePed(x, y, options = {}) {
    const ped = {
      x, y,
      angle: random.range(-Math.PI, Math.PI),
      speed: random.range(44, 78),
      health: 100,
      color: random.pick(SHIRT),
      skin: random.pick(SKIN),
      scared: false,
      scareTimer: 0,
      fleeX: 0,
      fleeY: 0,
      timer: random.range(0.5, 3),
      driver: null,
      dead: false,
      ...options,
    };
    state.peds.push(ped);
    return ped;
  }

  function sidewalkSpot() {
    const node = city.randomNode(random);
    const side = random.integer(0, 3);
    const offset = 36 + 10;
    if (side === 0) return { x: node.x + random.range(-90, 90), y: node.y + offset };
    if (side === 1) return { x: node.x - offset, y: node.y + random.range(-90, 90) };
    if (side === 2) return { x: node.x + random.range(-90, 90), y: node.y - offset };
    return { x: node.x + offset, y: node.y + random.range(-90, 90) };
  }

  function reset() {
    state.peds.length = 0;
    for (let index = 0; index < 62; index += 1) {
      const spot = sidewalkSpot();
      if (!city.isSolid(spot.x, spot.y, 12)) makePed(spot.x, spot.y);
    }
  }

  function panic(x, y, radius = 260, duration = 3) {
    for (const ped of state.peds) {
      const dx = ped.x - x;
      const dy = ped.y - y;
      const distance = Math.hypot(dx, dy) || 1;
      if (distance > radius) continue;
      ped.scared = true;
      ped.scareTimer = Math.max(ped.scareTimer, duration);
      ped.fleeX = dx / distance;
      ped.fleeY = dy / distance;
      ped.angle = Math.atan2(dy, dx);
    }
  }

  function hurt(ped, amount, byPlayer = false) {
    if (ped.dead) return;
    ped.health -= amount;
    ped.scared = true;
    ped.scareTimer = 4;
    if (world.systems.effects) world.systems.effects.puff(ped.x, ped.y, '#c75c58', 5, 55, 0.45);
    if (ped.health > 0) {
      if (byPlayer && world.systems.wanted) world.systems.wanted.add(1, 'Assault');
      return;
    }
    ped.dead = true;
    const index = state.peds.indexOf(ped);
    if (index >= 0) state.peds.splice(index, 1);
    state.kills += 1;
    if (byPlayer) {
      state.money += 40;
      state.moneyEarned += 40;
      state.respect += 1;
      if (world.systems.wanted) world.systems.wanted.add(2, 'Homicide');
      if (world.systems.effects) world.systems.effects.toast('+ $40   +1 respect', '#6dd49a');
    }
  }

  function eject(car) {
    const angle = car.angle + Math.PI / 2;
    const x = car.x + Math.cos(angle) * 48;
    const y = car.y + Math.sin(angle) * 48;
    const ped = makePed(city.isSolid(x, y, 12) ? car.x : x, city.isSolid(x, y, 12) ? car.y : y, {
      scared: true,
      scareTimer: 5,
      fleeX: Math.cos(angle),
      fleeY: Math.sin(angle),
    });
    car.driver = ped;
    ped.driver = car;
    car.pilot = null;
    car.route = null;
    return ped;
  }

  function step(dt) {
    for (const ped of state.peds) {
      if (ped.cop) continue;
      if (ped.scareTimer > 0) {
        ped.scareTimer -= dt;
        const speed = ped.speed * 3.2;
        const nx = ped.x + ped.fleeX * speed * dt;
        const ny = ped.y + ped.fleeY * speed * dt;
        if (!city.isSolid(nx, ped.y, 12)) ped.x = nx;
        else ped.fleeX = -ped.fleeX;
        if (!city.isSolid(ped.x, ny, 12)) ped.y = ny;
        else ped.fleeY = -ped.fleeY;
        if (ped.scareTimer <= 0) ped.scared = false;
        continue;
      }
      ped.timer -= dt;
      if (ped.timer <= 0) {
        ped.timer = random.range(0.8, 3.4);
        ped.angle += random.range(-1.7, 1.7);
        ped.speed = random.range(40, 82);
      }
      const nx = ped.x + Math.cos(ped.angle) * ped.speed * dt;
      const ny = ped.y + Math.sin(ped.angle) * ped.speed * dt;
      if (city.isSolid(nx, ped.y, 12)) ped.angle += Math.PI / 2 + random.range(-0.4, 0.4);
      else ped.x = nx;
      if (city.isSolid(ped.x, ny, 12)) ped.angle += Math.PI / 2 + random.range(-0.4, 0.4);
      else ped.y = ny;
    }
  }

  return { makePed, reset, panic, hurt, eject, step };
}
