import { FIELD, FONT } from './config.js';
import {
  ACTION_CONFIRM,
  ACTION_DOWN,
  ACTION_LOAD,
  ACTION_MENU,
  ACTION_MUTE,
  ACTION_PAUSE,
  ACTION_SAVE,
  ACTION_UP,
} from './input.js';
import { SCREEN_OVER, SCREEN_TITLE } from './render.js';
import { clearSave, describe, hasSave, loadState, saveState } from './save.js';

const CHOICES = ['Resume the city', 'Save progress', 'Load progress', 'Restart the run', 'Toggle sound', 'Erase save'];
const WIDTH = 540;
const HEIGHT = 442;

function ensure(state) {
  if (state.menuOpen === undefined) state.menuOpen = false;
  if (!Number.isInteger(state.menuIndex)) state.menuIndex = 0;
  if (state.menuStatus === undefined) state.menuStatus = '';
  state.menuIndex = ((state.menuIndex % CHOICES.length) + CHOICES.length) % CHOICES.length;
}

function sound(state) {
  return state.systems && state.systems.audio;
}

function ping(state) {
  const audio = sound(state);
  if (audio && typeof audio.ui === 'function') audio.ui();
}

function mark(state, message) {
  state.menuStatus = message;
  ping(state);
}

function close(state) {
  state.menuOpen = false;
  state.menuStatus = '';
  ping(state);
}

function activate(state, index) {
  if (index === 0) {
    close(state);
  } else if (index === 1) {
    mark(state, saveState(state) ? 'Progress saved.' : 'Saving is unavailable right now.');
  } else if (index === 2) {
    const loaded = loadState(state);
    if (loaded) close(state);
    else mark(state, 'No saved game found.');
  } else if (index === 3) {
    state.restartRequested = true;
    close(state);
  } else if (index === 4) {
    const audio = sound(state);
    const muted = audio && typeof audio.toggle === 'function' ? audio.toggle() : false;
    mark(state, muted ? 'Sound muted.' : 'Sound on.');
  } else if (index === 5) {
    mark(state, clearSave() ? 'Saved game erased.' : 'There was no save to erase.');
  }
}

export function control(state, actions, move, screen) {
  if (screen === SCREEN_TITLE || screen === SCREEN_OVER) return false;
  ensure(state);
  if (actions & ACTION_MENU) {
    state.menuOpen = !state.menuOpen;
    state.menuIndex = 0;
    state.menuStatus = '';
    ping(state);
    return true;
  }
  if (!state.menuOpen) {
    if (actions & ACTION_SAVE) {
      mark(state, saveState(state) ? 'Progress saved.' : 'Saving is unavailable right now.');
      return true;
    }
    if (actions & ACTION_LOAD) {
      const loaded = loadState(state);
      if (loaded) state.restartRequested = false;
      mark(state, loaded ? 'Save loaded.' : 'No saved game found.');
      return true;
    }
    return false;
  }
  if (actions & ACTION_UP) {
    state.menuIndex = (state.menuIndex + CHOICES.length - 1) % CHOICES.length;
    ping(state);
    return true;
  }
  if (actions & ACTION_DOWN) {
    state.menuIndex = (state.menuIndex + 1) % CHOICES.length;
    ping(state);
    return true;
  }
  if (actions & ACTION_PAUSE) {
    close(state);
    return true;
  }
  if (actions & ACTION_MUTE) {
    const audio = sound(state);
    const muted = audio && typeof audio.toggle === 'function' ? audio.toggle() : false;
    mark(state, muted ? 'Sound muted.' : 'Sound on.');
    return true;
  }
  if (actions & ACTION_CONFIRM) {
    activate(state, state.menuIndex);
    return true;
  }
  return true;
}

export function status(state) {
  ensure(state);
  return state.menuStatus || describe();
}

function panel(ctx, x, y) {
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') ctx.roundRect(x, y, WIDTH, HEIGHT, 14);
  else ctx.rect(x, y, WIDTH, HEIGHT);
}

export function draw(ctx, state) {
  if (!state.menuOpen) return;
  ensure(state);
  const x = (FIELD.width - WIDTH) / 2;
  const y = (FIELD.height - HEIGHT) / 2;
  ctx.save();
  ctx.fillStyle = 'rgba(5, 10, 18, 0.78)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  panel(ctx, x, y);
  ctx.fillStyle = 'rgba(18, 29, 38, 0.97)';
  ctx.fill();
  ctx.strokeStyle = '#f2c94c';
  ctx.lineWidth = 2;
  panel(ctx, x, y);
  ctx.stroke();
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'center';
  ctx.font = `800 34px ${FONT}`;
  ctx.fillStyle = '#fff2d8';
  ctx.fillText('SOLARA BAY', FIELD.width / 2, y + 52);
  ctx.font = `600 13px ${FONT}`;
  ctx.fillStyle = '#8fd9d2';
  ctx.fillText('PAUSE MENU', FIELD.width / 2, y + 75);

  const available = hasSave();
  for (let index = 0; index < CHOICES.length; index += 1) {
    const selected = index === state.menuIndex;
    const rowY = y + 112 + index * 40;
    if (selected) {
      ctx.fillStyle = 'rgba(242, 201, 76, 0.18)';
      ctx.fillRect(x + 24, rowY - 25, WIDTH - 48, 34);
      ctx.fillStyle = '#f2c94c';
      ctx.fillRect(x + 24, rowY - 25, 4, 34);
    }
    const dimmed = (index === 2 || index === 5) && !available;
    ctx.textAlign = 'left';
    ctx.font = `${selected ? 700 : 500} 18px ${FONT}`;
    ctx.fillStyle = dimmed ? 'rgba(232, 237, 242, 0.42)' : selected ? '#fff6dc' : 'rgba(232, 237, 242, 0.86)';
    ctx.fillText(CHOICES[index], x + 44, rowY);
  }

  ctx.textAlign = 'center';
  ctx.font = `600 13px ${FONT}`;
  ctx.fillStyle = '#f3dcae';
  ctx.fillText(status(state), FIELD.width / 2, y + HEIGHT - 60);
  ctx.fillStyle = 'rgba(226, 235, 242, 0.62)';
  ctx.fillText('W/S or arrows select   SPACE confirm   TAB or ESC close   K save   L load', FIELD.width / 2, y + HEIGHT - 30);
  ctx.restore();
}
