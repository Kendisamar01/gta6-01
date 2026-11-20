import { SCREEN } from './config.js';
import { screenPoint } from './camera.js';

const HELD = new Set([
  'KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
  'ShiftLeft', 'ShiftRight', 'Space', 'KeyE', 'KeyF', 'KeyH', 'KeyR',
]);

const EDGES = new Set([
  'KeyE', 'KeyF', 'KeyH', 'KeyR', 'KeyM', 'KeyP', 'Escape', 'Enter',
  'NumpadEnter', 'Space', 'Digit1', 'Digit2', 'Digit3',
]);

export function makeInput(canvas) {
  const held = new Set();
  const edges = new Set();
  const cursor = { x: SCREEN.width / 2 + 120, y: SCREEN.height / 2 };
  let triggerHeld = false;
  let triggerEdge = false;

  function locate(event) {
    const area = canvas.getBoundingClientRect();
    cursor.x = ((event.clientX - area.left) / Math.max(1, area.width)) * SCREEN.width;
    cursor.y = ((event.clientY - area.top) / Math.max(1, area.height)) * SCREEN.height;
  }

  window.addEventListener('keydown', (event) => {
    if (!HELD.has(event.code) && !EDGES.has(event.code)) return;
    event.preventDefault();
    if (!event.repeat) edges.add(event.code);
    if (HELD.has(event.code)) held.add(event.code);
  });

  window.addEventListener('keyup', (event) => held.delete(event.code));

  window.addEventListener('blur', reset);

  canvas.addEventListener('pointermove', locate);
  canvas.addEventListener('pointerdown', (event) => {
    locate(event);
    if (event.button === 0) {
      triggerHeld = true;
      triggerEdge = true;
    }
    event.preventDefault();
  });
  window.addEventListener('pointerup', (event) => {
    if (event.button === 0) triggerHeld = false;
  });
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());

  function pressed(...codes) {
    return codes.some((code) => held.has(code));
  }

  function tapped(code) {
    if (!edges.has(code)) return false;
    edges.delete(code);
    return true;
  }

  function reset() {
    held.clear();
    edges.clear();
    triggerHeld = false;
    triggerEdge = false;
  }

  function sample(camera) {
    const aim = screenPoint(camera, cursor.x, cursor.y);
    let slot = 0;
    if (tapped('Digit1')) slot = 1;
    else if (tapped('Digit2')) slot = 2;
    else if (tapped('Digit3')) slot = 3;

    const result = {
      x: Number(pressed('KeyD', 'ArrowRight')) - Number(pressed('KeyA', 'ArrowLeft')),
      y: Number(pressed('KeyS', 'ArrowDown')) - Number(pressed('KeyW', 'ArrowUp')),
      run: pressed('ShiftLeft', 'ShiftRight'),
      brake: pressed('Space'),
      fire: triggerHeld,
      firePressed: triggerEdge,
      enter: tapped('KeyE'),
      leave: tapped('KeyF'),
      horn: tapped('KeyH'),
      reload: tapped('KeyR'),
      confirm: tapped('Enter', 'NumpadEnter', 'Space'),
      pause: tapped('Escape', 'KeyP'),
      mute: tapped('KeyM'),
      slot,
      aimX: aim.x,
      aimY: aim.y,
      pointerX: cursor.x,
      pointerY: cursor.y,
    };
    triggerEdge = false;
    return result;
  }

  return { sample, reset };
}

export function idle(overrides = {}) {
  return {
    x: 0,
    y: 0,
    run: false,
    brake: false,
    fire: false,
    firePressed: false,
    enter: false,
    leave: false,
    horn: false,
    reload: false,
    confirm: false,
    pause: false,
    mute: false,
    slot: 0,
    aimX: 0,
    aimY: 0,
    pointerX: SCREEN.width / 2,
    pointerY: SCREEN.height / 2,
    ...overrides,
  };
}
