import { VIEW } from './config.js';

const USED = new Set([
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Enter', 'Escape',
  'KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyE', 'KeyF', 'KeyH', 'KeyM', 'KeyR', 'KeyQ',
  'ShiftLeft', 'ShiftRight', 'Digit1', 'Digit2', 'Digit3',
]);

export function createInput(canvas) {
  const held = new Set();
  const tapped = new Set();
  const mouse = { x: VIEW.width / 2, y: VIEW.height / 2, down: false, clicked: false };

  function locate(event) {
    const rect = canvas.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * VIEW.width;
    mouse.y = ((event.clientY - rect.top) / rect.height) * VIEW.height;
  }

  window.addEventListener('keydown', (event) => {
    if (!USED.has(event.code)) return;
    event.preventDefault();
    if (!held.has(event.code)) tapped.add(event.code);
    held.add(event.code);
  });

  window.addEventListener('keyup', (event) => {
    held.delete(event.code);
  });

  canvas.addEventListener('pointermove', locate);
  canvas.addEventListener('pointerdown', (event) => {
    locate(event);
    mouse.down = true;
    mouse.clicked = true;
    canvas.setPointerCapture?.(event.pointerId);
    event.preventDefault();
  });
  window.addEventListener('pointerup', () => {
    mouse.down = false;
  });
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());
  window.addEventListener('blur', () => {
    held.clear();
    mouse.down = false;
  });

  function down(code) {
    return held.has(code);
  }

  function pressed(code) {
    return tapped.has(code);
  }

  function movement() {
    const x = (down('KeyD') || down('ArrowRight') ? 1 : 0) - (down('KeyA') || down('ArrowLeft') ? 1 : 0);
    const y = (down('KeyS') || down('ArrowDown') ? 1 : 0) - (down('KeyW') || down('ArrowUp') ? 1 : 0);
    return { x, y, run: down('ShiftLeft') || down('ShiftRight') };
  }

  function endFrame() {
    tapped.clear();
    mouse.clicked = false;
  }

  function releaseAll() {
    held.clear();
    tapped.clear();
    mouse.down = false;
    mouse.clicked = false;
  }

  return { down, pressed, movement, endFrame, releaseAll, mouse };
}
