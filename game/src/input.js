import { VIEW } from './config.js';
import { screenToWorld } from './camera.js';

const HELD_KEYS = new Set([
  'KeyW', 'KeyA', 'KeyS', 'KeyD',
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
  'ShiftLeft', 'ShiftRight', 'Space', 'KeyE', 'KeyF', 'KeyH', 'KeyR',
]);

const EDGE_KEYS = new Set([
  'KeyE', 'KeyF', 'KeyH', 'KeyR', 'KeyM', 'KeyP', 'Escape',
  'Enter', 'NumpadEnter', 'Space', 'Digit1', 'Digit2', 'Digit3',
]);

export function createInput(canvas) {
  const held = new Set();
  const pressed = new Set();
  const pointer = { x: VIEW.width / 2 + 120, y: VIEW.height / 2 };
  let firing = false;
  let firedThisFrame = false;

  function rememberPointer(event) {
    const box = canvas.getBoundingClientRect();
    pointer.x = ((event.clientX - box.left) / Math.max(1, box.width)) * VIEW.width;
    pointer.y = ((event.clientY - box.top) / Math.max(1, box.height)) * VIEW.height;
  }

  window.addEventListener('keydown', (event) => {
    if (!HELD_KEYS.has(event.code) && !EDGE_KEYS.has(event.code)) return;
    event.preventDefault();
    if (!event.repeat) pressed.add(event.code);
    if (HELD_KEYS.has(event.code)) held.add(event.code);
  });

  window.addEventListener('keyup', (event) => held.delete(event.code));

  window.addEventListener('blur', () => {
    held.clear();
    pressed.clear();
    firing = false;
    firedThisFrame = false;
  });

  canvas.addEventListener('pointermove', rememberPointer);

  canvas.addEventListener('pointerdown', (event) => {
    rememberPointer(event);
    if (event.button === 0) {
      firing = true;
      firedThisFrame = true;
    }
    event.preventDefault();
  });

  window.addEventListener('pointerup', (event) => {
    if (event.button === 0) firing = false;
  });

  canvas.addEventListener('contextmenu', (event) => event.preventDefault());

  function down(...codes) {
    return codes.some((code) => held.has(code));
  }

  function consume(code) {
    if (!pressed.has(code)) return false;
    pressed.delete(code);
    return true;
  }

  function sample(camera) {
    const aim = screenToWorld(camera, pointer.x, pointer.y);
    const slot = consume('Digit1') ? 1 : consume('Digit2') ? 2 : consume('Digit3') ? 3 : 0;
    const controls = {
      x: Number(down('KeyD', 'ArrowRight')) - Number(down('KeyA', 'ArrowLeft')),
      y: Number(down('KeyS', 'ArrowDown')) - Number(down('KeyW', 'ArrowUp')),
      run: down('ShiftLeft', 'ShiftRight'),
      handbrake: down('Space'),
      fire: firing,
      firePressed: firedThisFrame,
      interact: consume('KeyE'),
      interactAlt: consume('KeyF'),
      horn: consume('KeyH'),
      reload: consume('KeyR'),
      confirm: consume('Enter', 'NumpadEnter', 'Space'),
      pause: consume('Escape', 'KeyP'),
      mute: consume('KeyM'),
      weaponSlot: slot,
      aimX: aim.x,
      aimY: aim.y,
      pointerX: pointer.x,
      pointerY: pointer.y,
    };
    firedThisFrame = false;
    return controls;
  }

  function clear() {
    held.clear();
    pressed.clear();
    firing = false;
    firedThisFrame = false;
  }

  return { sample, clear };
}

export function neutralControls(overrides = {}) {
  return {
    x: 0,
    y: 0,
    run: false,
    handbrake: false,
    fire: false,
    firePressed: false,
    interact: false,
    interactAlt: false,
    horn: false,
    reload: false,
    confirm: false,
    pause: false,
    mute: false,
    weaponSlot: 0,
    aimX: 0,
    aimY: 0,
    pointerX: VIEW.width / 2,
    pointerY: VIEW.height / 2,
    ...overrides,
  };
}
