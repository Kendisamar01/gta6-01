import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const port = 8123;
const base = `http://127.0.0.1:${port}/`;
const workspace = fileURLToPath(new URL('.', import.meta.url));
const shots = JSON.parse(readFileSync(new URL('./shots.json', import.meta.url), 'utf8'));
const chrome = '/workspace/.cache/puppeteer/chrome-headless-shell/linux-157.0.8103.78/chrome-headless-shell-linux64/chrome-headless-shell';

const server = spawn(process.execPath, ['serve.ts', '--port', String(port)], {
  cwd: workspace,
  stdio: ['ignore', 'pipe', 'pipe'],
});
let serverOutput = '';
server.stdout.on('data', (chunk) => { serverOutput += String(chunk); });
server.stderr.on('data', (chunk) => { serverOutput += String(chunk); });

const pause = (milliseconds) => new Promise((done) => setTimeout(done, milliseconds));

async function waitForServer() {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (server.exitCode !== null) throw new Error(`server exited: ${serverOutput}`);
    try {
      const response = await fetch(base);
      if (response.ok) return;
    } catch {
      await pause(100);
    }
  }
  throw new Error(`server did not start: ${serverOutput}`);
}

function capture(url, output) {
  return new Promise((done, fail) => {
    const args = [
      '--headless',
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--hide-scrollbars',
      '--force-device-scale-factor=1',
      '--window-size=1280,720',
      '--virtual-time-budget=4000',
      '--run-all-compositor-stages-before-draw',
      `--screenshot=${output}`,
      url,
    ];
    const browser = spawn(chrome, args, {
      cwd: workspace,
      env: { ...process.env, LD_LIBRARY_PATH: '/workspace/chrome-libs' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let log = '';
    browser.stdout.on('data', (chunk) => { log += String(chunk); });
    browser.stderr.on('data', (chunk) => { log += String(chunk); });
    browser.on('error', fail);
    browser.on('exit', (code) => {
      if (code === 0) done();
      else fail(new Error(`chrome exited ${code}: ${log}`));
    });
  });
}

mkdirSync(new URL('./screenshots/', import.meta.url), { recursive: true });
const problems = [];

try {
  await waitForServer();
  for (const shot of shots) {
    const output = `screenshots/${shot.name}`;
    await capture(base + shot.query, output);
    const bytes = statSync(new URL(`./screenshots/${shot.name}`, import.meta.url)).size;
    console.log(`${shot.name}: ${bytes} bytes`);
    if (bytes > 200 * 1024) problems.push(`${shot.name} is ${bytes} bytes`);
  }
} finally {
  server.kill();
}

if (problems.length > 0) {
  console.error(problems.join('\n'));
  process.exitCode = 1;
}
