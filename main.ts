import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const root = fileURLToPath(new URL('.', import.meta.url));
const target = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(target, { recursive: true });
cpSync(join(root, 'game'), join(target, 'game'), { recursive: true });

const shotTarget = join(target, 'screenshots');
mkdirSync(shotTarget, { recursive: true });
const shotSource = join(root, 'screenshots');
if (existsSync(shotSource)) cpSync(shotSource, shotTarget, { recursive: true });

const limits = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};
const dossier = buildDossier(target, limits);
writeFileSync(join(target, 'dossier.json'), dossier);
