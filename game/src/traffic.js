const LANE = 18;

function wrap(angle) {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

function lanePoint(city, node, direction) {
  if (direction === 0) return { x: node.x, y: node.y + LANE };
  if (direction === 1) return { x: node.x - LANE, y: node.y };
  if (direction === 2) return { x: node.x, y: node.y - LANE };
  return { x: node.x + LANE, y: node.y };
}

function greenFor(direction, signal, time) {
  const cycle = Math.floor((time * 0.55 + signal.offset) % 4);
  const northSouth = (cycle + signal.phase) % 2 === 0;
  return direction === 1 || direction === 3 ? northSouth : !northSouth;
}

export function createTraffic(world) {
  const city = world.city;
  const random = world.random;
  const state = world.state;
  const owned = [];

  function chooseDirection(previous) {
    const options = [0, 1, 2, 3].filter((direction) => direction !== (previous + 2) % 4);
    if (random.chance(0.62)) return previous;
    return random.pick(options);
  }

  function pilot(dt, car) {
    const route = car.route;
    if (!route) return { throttle: 0, steer: 0 };
    const target = route.target;
    const dx = target.x - car.x;
    const dy = target.y - car.y;
    const distance = Math.hypot(dx, dy);

    if (distance < 38) {
      route.node = city.neighbor(route.node, route.direction);
      route.direction = chooseDirection(route.direction);
      const nextNode = city.neighbor(route.node, route.direction);
      route.target = lanePoint(city, nextNode, route.direction);
      return { throttle: 0.4, steer: 0 };
    }

    const desired = Math.atan2(dy, dx);
    const difference = wrap(desired - car.angle);
    let throttle = 0.62;

    const time = world.environment ? world.environment.drift : 0;
    for (const signal of city.lights) {
      const offsetX = signal.x - car.x;
      const offsetY = signal.y - car.y;
      const forward = offsetX * Math.cos(car.angle) + offsetY * Math.sin(car.angle);
      const lateral = Math.abs(-offsetX * Math.sin(car.angle) + offsetY * Math.cos(car.angle));
      if (forward > 8 && forward < 145 && lateral < 30 && !greenFor(route.direction, signal, time)) throttle = -0.6;
    }

    for (const other of state.vehicles) {
      if (other === car) continue;
      const offsetX = other.x - car.x;
      const offsetY = other.y - car.y;
      const forward = offsetX * Math.cos(car.angle) + offsetY * Math.sin(car.angle);
      const lateral = Math.abs(-offsetX * Math.sin(car.angle) + offsetY * Math.cos(car.angle));
      if (forward > 4 && forward < 86 && lateral < 26) throttle = -0.55;
    }

    return { throttle, steer: Math.max(-1, Math.min(1, difference * 2.1)), handbrake: false };
  }

  function spawnCar() {
    const node = city.randomNode(random);
    const direction = random.integer(0, 3);
    const start = lanePoint(city, node, direction);
    const kind = random.pick(['sedan', 'sedan', 'taxi', 'van', 'truck', 'sport']);
    const car = world.systems.vehicles.spawn(kind, start.x, start.y, direction * Math.PI / 2, {
      speed: random.range(60, 125),
    });
    car.route = {
      node,
      direction,
      target: lanePoint(city, city.neighbor(node, direction), direction),
    };
    car.pilot = pilot;
    owned.push(car);
    return car;
  }

  function reset() {
    owned.length = 0;
    for (let index = 0; index < 24; index += 1) spawnCar();
  }

  function step() {
    for (let index = owned.length - 1; index >= 0; index -= 1) {
      if (owned[index].dead) owned.splice(index, 1);
    }
  }

  return { reset, step, spawnCar, greenFor };
}
