import { spawn } from 'node:child_process';
import { readFileSync, readdirSync, unlinkSync, writeFileSync, rmSync } from 'node:fs';
import { get as httpGet } from 'node:http';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const chrome = '/workspace/.cache/puppeteer/chrome-headless-shell/linux-157.0.8103.78/chrome-headless-shell-linux64/chrome-headless-shell';
const libraries = '/workspace/chrome-libs';
const shots = JSON.parse(readFileSync(join(root, 'shots.json'), 'utf8'));
const port = 8100 + (process.pid % 300);
const debugPort = 9400 + (process.pid % 300);
const userData = join('/tmp/opencode', `solara-shots-${process.pid}`);
const screenshotDir = join(root, 'screenshots');

let server = null;
let browser = null;
let socket = null;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function reachable(url) {
  return new Promise((resolve) => {
    const request = httpGet(url, (response) => {
      response.resume();
      resolve(response.statusCode === 200);
    });
    request.setTimeout(700, () => {
      request.destroy();
      resolve(false);
    });
    request.on('error', () => resolve(false));
  });
}

async function waitUntil(url, timeoutMs, label) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await reachable(url)) return;
    await sleep(120);
  }
  throw new Error(`${label} did not become ready`);
}

function getJson(url) {
  return new Promise((resolve, reject) => {
    const request = httpGet(url, (response) => {
      let body = '';
      response.on('data', (chunk) => { body += chunk; });
      response.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (error) {
          reject(error);
        }
      });
    });
    request.on('error', reject);
  });
}

function attach(wsUrl) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    const pending = new Map();
    let nextId = 1;

    function send(method, params = {}, sessionId) {
      return new Promise((done, fail) => {
        const id = nextId;
        nextId += 1;
        pending.set(id, { done, fail });
        const message = { id, method, params };
        if (sessionId) message.sessionId = sessionId;
        ws.send(JSON.stringify(message));
      });
    }

    ws.addEventListener('open', () => resolve({ ws, send }));
    ws.addEventListener('error', () => reject(new Error('Chrome debugger socket failed')));
    ws.addEventListener('message', (event) => {
      let message;
      try {
        message = JSON.parse(event.data);
      } catch {
        return;
      }
      const request = pending.get(message.id);
      if (!request) return;
      pending.delete(message.id);
      if (message.error) request.fail(new Error(message.error.message || 'Chrome debugger error'));
      else request.done(message.result);
    });
  });
}

async function waitForShot(cdp, sessionId, query) {
  const deadline = Date.now() + 30000;
  const expression = `window.__shotReady === true && location.search === ${JSON.stringify(query)}`;
  while (Date.now() < deadline) {
    try {
      const answer = await cdp.send('Runtime.evaluate', { expression, returnByValue: true }, sessionId);
      if (answer.result && answer.result.value === true) {
        await sleep(150);
        return;
      }
    } catch {
      await sleep(150);
    }
    await sleep(120);
  }
  throw new Error(`scene ${query} never signalled ready`);
}

async function capture(cdp, sessionId, name) {
  for (let quality = 82; quality >= 58; quality -= 6) {
    const result = await cdp.send('Page.captureScreenshot', {
      format: 'jpeg',
      quality,
      fromSurface: true,
      captureBeyondViewport: false,
    }, sessionId);
    const bytes = Buffer.from(result.data, 'base64');
    if (bytes.length <= 200 * 1024) return bytes;
  }
  throw new Error(`${name} could not be compressed below 200 KiB`);
}

function cleanup() {
  if (socket) {
    try { socket.close(); } catch {}
  }
  if (browser) browser.kill('SIGTERM');
  if (server) server.kill('SIGTERM');
  try { rmSync(userData, { recursive: true, force: true }); } catch {}
}

async function main() {
  if (shots.length !== 4) throw new Error('shots.json must list exactly four scenes');
  server = spawn(process.execPath, [join(root, 'serve.ts'), '--port', String(port)], {
    cwd: root,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  await waitUntil(`http://127.0.0.1:${port}/index.html`, 12000, 'local game server');

  browser = spawn(chrome, [
    '--headless',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--hide-scrollbars',
    '--force-device-scale-factor=1',
    '--window-size=1280,720',
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${userData}`,
    'about:blank',
  ], {
    env: { ...process.env, LD_LIBRARY_PATH: libraries },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  await waitUntil(`http://127.0.0.1:${debugPort}/json/version`, 20000, 'headless Chrome');
  const version = await getJson(`http://127.0.0.1:${debugPort}/json/version`);
  const cdp = await attach(version.webSocketDebuggerUrl);
  socket = cdp.ws;

  const target = await cdp.send('Target.createTarget', { url: 'about:blank' });
  const attached = await cdp.send('Target.attachToTarget', { targetId: target.targetId, flatten: true });
  const sessionId = attached.sessionId;
  await cdp.send('Page.enable', {}, sessionId);
  await cdp.send('Runtime.enable', {}, sessionId);
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 1280,
    height: 720,
    deviceScaleFactor: 1,
    mobile: false,
  }, sessionId);

  const captured = [];
  for (const shot of shots) {
    await cdp.send('Runtime.evaluate', { expression: 'window.__shotReady = false' }, sessionId).catch(() => {});
    await cdp.send('Page.navigate', { url: `http://127.0.0.1:${port}/index.html${shot.query}` }, sessionId);
    await waitForShot(cdp, sessionId, shot.query);
    captured.push({ name: shot.name, bytes: await capture(cdp, sessionId, shot.name) });
  }

  for (const shot of captured) writeFileSync(join(screenshotDir, shot.name), shot.bytes);
  const keep = new Set(captured.map((shot) => shot.name));
  for (const file of readdirSync(screenshotDir)) {
    if (file.toLowerCase().endsWith('.jpg') && !keep.has(file)) unlinkSync(join(screenshotDir, file));
  }
  console.log(`captured ${captured.length} scenes: ${captured.map((shot) => `${shot.name} ${Math.round(shot.bytes.length / 1024)}KiB`).join(', ')}`);
}

main().catch((error) => {
  console.error(error.stack || error);
  process.exitCode = 1;
}).finally(cleanup);
