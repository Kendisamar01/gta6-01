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

import { FIELD } from './config.js';

export const SOLARA_KEYS = {
  up: ['KeyW', 'ArrowUp'],
  down: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  run: ['ShiftLeft', 'ShiftRight'],
  handbrake: ['Space'],
  horn: ['KeyH'],
  reload: ['KeyR'],
  mute: ['KeyM'],
  interact: ['KeyE', 'KeyF'],
  pause: ['Escape', 'KeyP'],
  map: ['Tab'],
  side: ['KeyQ'],
};

export function createSolaraInput(target) {
  const held = new Set();
  const queued = [];
  const mouse = { x: FIELD.width / 2, y: FIELD.height / 2, down: false, right: false };
  const claimed = new Set();
  for (const codes of Object.values(SOLARA_KEYS)) for (const code of codes) claimed.add(code);
  claimed.add('Digit1');
  claimed.add('Digit2');
  claimed.add('Digit3');

  window.addEventListener('keydown', (event) => {
    if (event.repeat || !held.has(event.code)) queued.push(event.code);
    held.add(event.code);
    if (claimed.has(event.code)) event.preventDefault();
  });
  window.addEventListener('keyup', (event) => {
    held.delete(event.code);
  });
  window.addEventListener('blur', () => {
    held.clear();
    mouse.down = false;
    mouse.right = false;
  });
  target.addEventListener('pointermove', (event) => {
    const rect = target.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / Math.max(1, rect.width)) * FIELD.width;
    mouse.y = ((event.clientY - rect.top) / Math.max(1, rect.height)) * FIELD.height;
  });
  target.addEventListener('pointerdown', (event) => {
    if (event.button === 0) mouse.down = true;
    if (event.button === 2) mouse.right = true;
    queued.push(event.button === 2 ? 'MOUSE_RIGHT' : 'MOUSE_LEFT');
    event.preventDefault();
  });
  window.addEventListener('pointerup', (event) => {
    if (event.button === 0) mouse.down = false;
    if (event.button === 2) mouse.right = false;
  });
  target.addEventListener('contextmenu', (event) => event.preventDefault());

  function any(codes) {
    for (const code of codes) if (held.has(code)) return true;
    return false;
  }

  return {
    mouse,
    any,
    held,
    pressed(code) {
      return queued.includes(code);
    },
    takePressed() {
      const taken = queued.slice();
      queued.length = 0;
      return taken;
    },
    moveVector() {
      return {
        mx: (any(SOLARA_KEYS.right) ? 1 : 0) - (any(SOLARA_KEYS.left) ? 1 : 0),
        my: (any(SOLARA_KEYS.down) ? 1 : 0) - (any(SOLARA_KEYS.up) ? 1 : 0),
      };
    },
    controls() {
      const move = this.moveVector();
      return {
        ...move,
        run: any(SOLARA_KEYS.run),
        handbrake: any(SOLARA_KEYS.handbrake),
        fire: mouse.down,
        aimX: mouse.x,
        aimY: mouse.y,
      };
    },
  };
}
