const HIDE_SECONDS = 11;

export function createWanted(world) {
  const state = world.state;
  const garage = world.city.garage;

  function add(amount, reason = 'Crime committed') {
    if (amount <= 0) return;
    const before = state.wanted;
    state.wanted = Math.min(5, state.wanted + amount);
    state.wantedProgress = 0;
    state.wantedHidden = 0;
    if (state.wanted > before && world.systems.effects) {
      world.systems.effects.toast(`${reason}   ${'★'.repeat(state.wanted)}`, '#f2b544');
    }
    if (world.systems.audio) world.systems.audio.blip(520 + state.wanted * 60);
  }

  function clear() {
    state.wanted = 0;
    state.wantedHidden = 0;
    state.wantedProgress = 0;
  }

  function tryGarage() {
    const player = state.player;
    if (Math.hypot(player.x - garage.x, player.y - garage.y) > garage.radius) return false;
    if (state.wanted === 0) {
      if (world.systems.effects) world.systems.effects.toast('No heat to wash off.', '#aab8c4');
      return true;
    }
    if (player.money < 500) {
      if (world.systems.effects) world.systems.effects.toast('Need $500 for a fresh coat.', '#e35b4f');
      return true;
    }
    player.money -= 500;
    clear();
    if (world.systems.audio) world.systems.audio.blip(880);
    if (world.systems.effects) world.systems.effects.toast('Fresh paint. Heat cleared.', '#6dd49a');
    return true;
  }

  function step(dt) {
    if (state.wanted === 0) {
      state.wantedProgress = 0;
      return;
    }
    let seen = false;
    for (const car of state.policeCars) {
      if (Math.hypot(car.x - state.player.x, car.y - state.player.y) < 620) seen = true;
    }
    for (const ped of state.peds) {
      if (!ped.cop) continue;
      if (Math.hypot(ped.x - state.player.x, ped.y - state.player.y) < 320) seen = true;
    }
    if (seen) {
      state.wantedHidden = 0;
    } else {
      state.wantedHidden += dt;
      if (state.wantedHidden >= HIDE_SECONDS) {
        state.wanted -= 1;
        state.wantedHidden = 0;
        if (world.systems.effects) world.systems.effects.toast('Heat is cooling down.', '#6dd49a');
      }
    }
    state.wantedProgress = Math.min(1, state.wantedHidden / HIDE_SECONDS);
  }

  function reset() {
    clear();
  }

  return { add, clear, tryGarage, step, reset };
}
