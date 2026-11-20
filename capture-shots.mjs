import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const serverPort = 8123;
const host = `http://127.0.0.1:${serverPort}/`;
const folder = fileURLToPath(new URL('.', import.meta.url));
const frames = JSON.parse(readFileSync(new URL('./shots.json', import.meta.url), 'utf8'));
const binary = '/workspace/.cache/puppeteer/chrome-headless-shell/linux-157.0.8103.78/chrome-headless-shell-linux64/chrome-headless-shell';

const server = spawn(process.execPath, ['serve.ts', '--port', String(serverPort)], {
  cwd: folder,
  stdio: ['ignore', 'pipe', 'pipe'],
});
let serverLog = '';
server.stdout.on('data', (chunk) => { serverLog += String(chunk); });
server.stderr.on('data', (chunk) => { serverLog += String(chunk); });

const wait = (ms) => new Promise((done) => setTimeout(done, ms));

async function awaitServer() {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (server.exitCode !== null) throw new Error(`server exited: ${serverLog}`);
    try {
      const reply = await fetch(host);
      if (reply.ok) return;
    } catch {
      await wait(100);
    }
  }
  throw new Error(`server did not start: ${serverLog}`);
}

function shoot(url, output) {
  return new Promise((done, fail) => {
    const flags = [
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
    const browser = spawn(binary, flags, {
      cwd: folder,
      env: { ...process.env, LD_LIBRARY_PATH: '/workspace/chrome-libs' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let browserLog = '';
    browser.stdout.on('data', (chunk) => { browserLog += String(chunk); });
    browser.stderr.on('data', (chunk) => { browserLog += String(chunk); });
    browser.on('error', fail);
    browser.on('exit', (code) => {
      if (code === 0) done();
      else fail(new Error(`chrome exited ${code}: ${browserLog}`));
    });
  });
}

mkdirSync(new URL('./screenshots/', import.meta.url), { recursive: true });
const errors = [];

try {
  await awaitServer();
  for (const frame of frames) {
    const output = `screenshots/${frame.name}`;
    await shoot(host + frame.query, output);
    const size = statSync(new URL(`./screenshots/${frame.name}`, import.meta.url)).size;
    console.log(`${frame.name}: ${size} bytes`);
    if (size > 200 * 1024) errors.push(`${frame.name} is ${size} bytes`);
  }
} finally {
  server.kill();
}

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
}
