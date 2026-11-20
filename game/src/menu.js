import { FONT, PALETTE, VIEW } from './config.js';

const TITLE_COMMANDS = { 'New Game': 'new', 'Continue': 'continue', 'Controls': 'controls' };
const PAUSE_COMMANDS = {
  'Resume': 'resume', 'Controls': 'controls', 'Save Game': 'save',
  'Load Game': 'load', 'Quit to Title': 'quit',
};

const CONTROLS = [
  'WASD / Arrows — walk, steer, accelerate and brake',
  'Shift — run on foot',
  'Mouse — aim and left click — fire or punch',
  'E / F — enter, jack or exit a vehicle',
  'Space — handbrake while driving',
  'H — horn     R — reload     1 / 2 / 3 — change weapon',
  'Q — cycle side activities     M — mute audio',
  'Esc — pause, save, load or return to the title',
];

export function createMenu(world, renderer, save) {
  function optionsFor(screen) {
    return screen === 'title' ? renderer.TITLE_OPTIONS : renderer.PAUSE_OPTIONS;
  }

  function geometry(screen) {
    const list = optionsFor(screen);
    const height = 150 + list.length * 54 + 42;
    return { left: (VIEW.width - 520) / 2, top: (VIEW.height - height) / 2, width: 520, height, list };
  }

  function commandFor(screen, index) {
    const list = optionsFor(screen);
    const name = list[index];
    return screen === 'title' ? TITLE_COMMANDS[name] : PAUSE_COMMANDS[name];
  }

  function handle(input, ui, screen) {
    if (screen !== 'title' && screen !== 'paused') return null;
    const list = optionsFor(screen);

    if (ui.controls) {
      if (input.pressed('Enter') || input.pressed('Escape') || input.mouse.clicked) {
        ui.controls = false;
        return 'navigate';
      }
      return null;
    }
    if (input.pressed('ArrowUp') || input.pressed('KeyW')) {
      ui.selection = (ui.selection - 1 + list.length) % list.length;
      return 'navigate';
    }
    if (input.pressed('ArrowDown') || input.pressed('KeyS')) {
      ui.selection = (ui.selection + 1) % list.length;
      return 'navigate';
    }
    if (input.pressed('Escape')) return 'escape';
    if (input.pressed('Enter') || input.pressed('Space')) return commandFor(screen, ui.selection);

    if (input.mouse.clicked) {
      const box = geometry(screen);
      for (let index = 0; index < box.list.length; index += 1) {
        const y = box.top + 142 + index * 54 + 34;
        if (input.mouse.x >= box.left + 38 && input.mouse.x <= box.left + box.width - 38
          && input.mouse.y >= y - 27 && input.mouse.y <= y + 13) {
          ui.selection = index;
          return commandFor(screen, index);
        }
      }
    }
    return null;
  }

  function draw(context, worldState, ui, screen) {
    if (screen !== 'title' && screen !== 'paused') return;
    if (ui.controls) {
      context.fillStyle = 'rgba(8,18,30,0.9)';
      context.fillRect(0, 0, VIEW.width, VIEW.height);
      context.fillStyle = PALETTE.panel;
      context.fillRect(VIEW.width / 2 - 400, 92, 800, 520);
      context.strokeStyle = PALETTE.accent;
      context.lineWidth = 2;
      context.strokeRect(VIEW.width / 2 - 400, 92, 800, 520);
      context.font = `bold 40px ${FONT}`;
      context.fillStyle = PALETTE.accent;
      context.textAlign = 'center';
      context.fillText('Controls', VIEW.width / 2, 156);
      context.font = `17px ${FONT}`;
      context.fillStyle = PALETTE.text;
      for (let index = 0; index < CONTROLS.length; index += 1) {
        context.fillText(CONTROLS[index], VIEW.width / 2, 212 + index * 40);
      }
      context.fillStyle = PALETTE.muted;
      context.font = `14px ${FONT}`;
      context.fillText('Enter or click to go back', VIEW.width / 2, 584);
      return;
    }
    const list = optionsFor(screen);
    if (screen === 'title' && !save.has()) {
      context.globalAlpha = 1;
    }
    renderer.panel(screen === 'title' ? '' : 'Paused', list, ui.selection,
      screen === 'title' ? 'Arrow keys or mouse to choose  ·  Enter to select' : 'Esc resumes the city');
  }

  return { handle, draw, optionsFor };
}
