import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const chrome = process.env.CHROME_BIN
  || '/workspace/.cache/puppeteer/chrome-headless-shell/linux-157.0.8103.78/chrome-headless-shell-linux64/chrome-headless-shell';
const entries = JSON.parse(readFileSync(join(root, 'shots.json'), 'utf8'));
const port = 8151;
const debugPort = 9251;
const base = `http://127.0.0.1:${port}`;
const width = 1280;
const height = 720;
const maxBytes = 200 * 1024;
const profile = mkdtempSync('/tmp/opencode/solara-capture-');
let server = null;
let browser = null;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitFor(url, limit = 15000) {
  const deadline = Date.now() + limit;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      await sleep(80);
    }
  }
  throw new Error(`timed out waiting for ${url}`);
}

async function connect() {
  const list = await fetch(`http://127.0.0.1:${debugPort}/json/list`).then((response) => response.json());
  const page = list.find((target) => target.type === 'page');
  if (!page) throw new Error('headless Chrome exposed no page');
  const socket = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });
  let serial = 0;
  const waiting = new Map();
  socket.addEventListener('message', (message) => {
    const data = JSON.parse(message.data);
    const pending = waiting.get(data.id);
    if (!pending) return;
    waiting.delete(data.id);
    if (data.error) pending.reject(new Error(data.error.message || 'DevTools error'));
    else pending.resolve(data.result);
  });
  return {
    send(method, params = {}) {
      serial += 1;
      const id = serial;
      return new Promise((resolve, reject) => {
        waiting.set(id, { resolve, reject });
        socket.send(JSON.stringify({ id, method, params }));
      });
    },
    close() {
      socket.close();
    },
  };
}

async function waitReady(session, query) {
  await sleep(180);
  const expression = `Boolean(location.search === ${JSON.stringify(query)} && window.__shotReady && window.__modulesReady && document.readyState === "complete")`;
  for (let attempt = 0; attempt < 300; attempt += 1) {
    const result = await session.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
    });
    if (result.result && result.result.value === true) return;
    await sleep(50);
  }
  throw new Error('game never became ready');
}

function jpegDimensions(bytes) {
  let offset = 2;
  while (offset + 8 < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = bytes[offset + 1];
    offset += 2;
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    const length = bytes.readUInt16BE(offset);
    const frame = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    if (frame) return { width: bytes.readUInt16BE(offset + 5), height: bytes.readUInt16BE(offset + 3) };
    if (length < 2) break;
    offset += length;
  }
  return null;
}

async function capture(session, entry) {
  await session.send('Page.navigate', { url: `${base}/${entry.query}` });
  await waitReady(session, entry.query);
  await sleep(220);
  for (const quality of [85, 76, 68]) {
    const result = await session.send('Page.captureScreenshot', {
      format: 'jpeg',
      quality,
      fromSurface: true,
      captureBeyondViewport: false,
    });
    const bytes = Buffer.from(result.data, 'base64');
    const size = jpegDimensions(bytes);
    if (!size || size.width !== width || size.height !== height) throw new Error(`${entry.name} is not ${width}x${height}`);
    if (bytes.length <= maxBytes) return bytes;
  }
  throw new Error(`${entry.name} is still too large`);
}

try {
  server = spawn(process.execPath, ['serve.ts', '--port', String(port)], { cwd: root, stdio: 'ignore' });
  await waitFor(base);
  browser = spawn(chrome, [
    '--headless',
    '--no-sandbox',
    '--disable-gpu',
    '--disable-dev-shm-usage',
    '--disable-background-timer-throttling',
    '--disable-renderer-backgrounding',
    '--hide-scrollbars',
    '--no-first-run',
    '--no-default-browser-check',
    '--force-device-scale-factor=1',
    `--window-size=${width},${height}`,
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${profile}`,
    'about:blank',
  ], { env: { ...process.env, LD_LIBRARY_PATH: '/workspace/chrome-libs' }, stdio: 'ignore' });
  await waitFor(`http://127.0.0.1:${debugPort}/json/version`);
  const session = await connect();
  await session.send('Page.enable');
  await session.send('Runtime.enable');
  await session.send('Emulation.setDeviceMetricsOverride', {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: false,
    screenWidth: width,
    screenHeight: height,
  });
  mkdirSync(join(root, 'screenshots'), { recursive: true });
  const captured = [];
  for (const entry of entries) {
    captured.push({ name: entry.name, bytes: await capture(session, entry) });
    console.log(`captured ${entry.name}`);
  }
  for (const shot of captured) writeFileSync(join(root, 'screenshots', shot.name), shot.bytes);
  session.close();
  console.log(`wrote ${captured.length} screenshots`);
} finally {
  if (browser) browser.kill('SIGKILL');
  if (server) server.kill('SIGKILL');
  await sleep(200);
  rmSync(profile, { recursive: true, force: true });
}
