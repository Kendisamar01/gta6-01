// Keyboard and pointer input. Held keys give a steering direction; one-shot presses (start or
// restart, pause) are queued as bit flags and taken once by the loop, so a press between two
// frames is never lost and never counted twice. Movement keys and the mouse are also exposed as a
// snapshot the world can consume each fixed step.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_INTERACT = 4;
export const ACTION_FIRE = 8;
export const ACTION_MUTE = 16;
export const ACTION_HORN = 32;
export const ACTION_RELOAD = 64;

const LEFT = new Set(['ArrowLeft', 'KeyA']);
const RIGHT = new Set(['ArrowRight', 'KeyD']);
const UP = new Set(['ArrowUp', 'KeyW']);
const DOWN = new Set(['ArrowDown', 'KeyS']);
const RUN = new Set(['ShiftLeft', 'ShiftRight']);
const INTERACT = new Set(['KeyE', 'KeyF']);
const CONFIRM = new Set(['Space', 'Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);
const MUTE = new Set(['KeyM']);
const HORN = new Set(['KeyH']);
const RELOAD = new Set(['KeyR']);

export function createInput(target) {
  let left = false;
  let right = false;
  let actions = 0;
  const held = new Set();
  const pointer = { x: 0, y: 0, down: false };

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
    held.clear();
    pointer.down = false;
  });
  target.addEventListener('pointerdown', () => {
    actions |= ACTION_CONFIRM;
  });

  window.addEventListener('keydown', (event) => {
    held.add(event.code);
    if (event.repeat) return;
    if (INTERACT.has(event.code)) actions |= ACTION_INTERACT;
    else if (MUTE.has(event.code)) actions |= ACTION_MUTE;
    else if (HORN.has(event.code)) actions |= ACTION_HORN;
    else if (RELOAD.has(event.code)) actions |= ACTION_RELOAD;
  });
  window.addEventListener('keyup', (event) => held.delete(event.code));

  target.addEventListener('pointermove', (event) => {
    pointer.x = event.clientX;
    pointer.y = event.clientY;
  });
  target.addEventListener('pointerdown', (event) => {
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    pointer.down = true;
    actions |= event.button === 0 ? ACTION_FIRE : ACTION_INTERACT;
  });
  window.addEventListener('pointerup', () => { pointer.down = false; });
  target.addEventListener('contextmenu', (event) => event.preventDefault());

  function isDown(codes) {
    for (const code of codes) if (held.has(code)) return true;
    return false;
  }

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
    /** Movement and run state for the next fixed step. */
    controls() {
      return { x: this.direction(), y: (isDown(DOWN) ? 1 : 0) - (isDown(UP) ? 1 : 0), run: isDown(RUN) };
    },
    /** Raw pointer location in CSS pixels and whether the primary button is held. */
    pointerState() {
      return pointer;
    },
    isDown(code) {
      return held.has(code);
    },
  };
}
