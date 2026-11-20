import { FIELD } from './config.js';

// Keyboard and pointer input. Held keys give a steering direction; one-shot presses (start or
// restart, pause) are queued as bit flags and taken once by the loop, so a press between two
// frames is never lost and never counted twice.

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;

const LEFT = new Set(['ArrowLeft', 'KeyA']);
const RIGHT = new Set(['ArrowRight', 'KeyD']);
const CONFIRM = new Set(['Space', 'Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);

export function createInput(target) {
  let left = false;
  let right = false;
  let actions = 0;

  window.addEventListener('keydown', (event) => {
    if (LEFT.has(event.code)) left = true;
    else if (RIGHT.has(event.code)) right = true;
    else if (CONFIRM.has(event.code)) {
      if (!event.repeat) actions |= ACTION_CONFIRM;
    } else if (PAUSE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else return;
    event.preventDefault();
  });
  window.addEventListener('keyup', (event) => {
    if (LEFT.has(event.code)) left = false;
    else if (RIGHT.has(event.code)) right = false;
  });
  // A key released while the tab is hidden never sends keyup: let go of everything on blur.
  window.addEventListener('blur', () => {
    left = false;
    right = false;
  });
  target.addEventListener('pointerdown', () => {
    actions |= ACTION_CONFIRM;
  });

  return {
    /** -1 for left, 1 for right, 0 for neither or both. */
    direction() {
      return (right ? 1 : 0) - (left ? 1 : 0);
    },
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}

export const ACTION_ENTER = 4;
export const ACTION_EXIT = 8;
export const ACTION_ATTACK = 16;
export const ACTION_MUTE = 32;
export const ACTION_RELOAD = 64;
export const ACTION_MENU = 128;
export const ACTION_SAVE = 256;
export const ACTION_LOAD = 512;
export const ACTION_UP = 1024;
export const ACTION_DOWN = 2048;

const UP = new Set(['ArrowUp', 'KeyW']);
const DOWN = new Set(['ArrowDown', 'KeyS']);
const MOVE_CODES = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyA', 'KeyD', 'KeyW', 'KeyS', 'Space']);
const EXTRA_KEYS = {
  KeyE: ACTION_ENTER,
  KeyF: ACTION_EXIT,
  KeyM: ACTION_MUTE,
  KeyR: ACTION_RELOAD,
};
EXTRA_KEYS.Tab = ACTION_MENU;
EXTRA_KEYS.KeyK = ACTION_SAVE;
EXTRA_KEYS.KeyL = ACTION_LOAD;
EXTRA_KEYS.ArrowUp = ACTION_UP;
EXTRA_KEYS.ArrowDown = ACTION_DOWN;
EXTRA_KEYS.KeyW = ACTION_UP;
EXTRA_KEYS.KeyS = ACTION_DOWN;
for (const code of Object.keys(EXTRA_KEYS)) MOVE_CODES.add(code);

export function createControls(target) {
  const base = createInput(target);
  const held = new Set();
  const pointer = { x: FIELD.width / 2, y: FIELD.height / 2, down: false, clicked: false };
  let extra = 0;

  function locate(event) {
    const rect = target.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    pointer.x = (event.clientX - rect.left) / rect.width * FIELD.width;
    pointer.y = (event.clientY - rect.top) / rect.height * FIELD.height;
  }

  window.addEventListener('keydown', (event) => {
    held.add(event.code);
    const flag = EXTRA_KEYS[event.code];
    if (flag !== undefined && !event.repeat) extra |= flag;
    if (MOVE_CODES.has(event.code)) event.preventDefault();
  });
  window.addEventListener('keyup', (event) => {
    held.delete(event.code);
  });
  window.addEventListener('blur', () => {
    held.clear();
    pointer.down = false;
  });
  target.addEventListener('pointermove', locate);
  target.addEventListener('pointerdown', (event) => {
    locate(event);
    pointer.down = true;
    pointer.clicked = true;
    extra |= ACTION_ATTACK;
  });
  window.addEventListener('pointerup', () => {
    pointer.down = false;
  });

  return {
    move() {
      return {
        x: (hasAny(held, RIGHT) ? 1 : 0) - (hasAny(held, LEFT) ? 1 : 0),
        y: (hasAny(held, DOWN) ? 1 : 0) - (hasAny(held, UP) ? 1 : 0),
      };
    },
    run() {
      return held.has('ShiftLeft') || held.has('ShiftRight');
    },
    pointer,
    takeActions() {
      const taken = base.takeActions() | extra;
      extra = 0;
      return taken;
    },
    takeClick() {
      const clicked = pointer.clicked;
      pointer.clicked = false;
      return clicked;
    },
    isDown(code) {
      return held.has(code);
    },
  };
}

function hasAny(held, codes) {
  for (const code of codes) if (held.has(code)) return true;
  return false;
}
