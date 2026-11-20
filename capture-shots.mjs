import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const chrome = process.env.CHROME_BIN
  || '/workspace/.cache/puppeteer/chrome-headless-shell/linux-157.0.8103.78/chrome-headless-shell-linux64/chrome-headless-shell';
const shots = JSON.parse(readFileSync(join(root, 'shots.json'), 'utf8'));
const serverPort = 8137;
const baseUrl = `http://127.0.0.1:${serverPort}`;
const width = 1280;
const height = 720;
const maxBytes = 200 * 1024;
const profiles = [];
let server = null;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitFor(url, timeout = 12000) {
  const deadline = Date.now() + timeout;
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

async function json(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`bad response from ${url}`);
  return response.json();
}

function startServer() {
  return spawn(process.execPath, ['serve.ts', '--port', String(serverPort)], {
    cwd: root,
    stdio: 'ignore',
  });
}

function startBrowser(profile, debugPort) {
  const args = [
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
  ];
  return spawn(chrome, args, {
    env: { ...process.env, LD_LIBRARY_PATH: '/workspace/chrome-libs' },
    stdio: 'ignore',
  });
}

async function openSession(wsUrl) {
  const socket = new WebSocket(wsUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });
  let serial = 1;
  const pending = new Map();
  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    const request = pending.get(message.id);
    if (!request) return;
    pending.delete(message.id);
    if (message.error) request.reject(new Error(message.error.message || 'DevTools error'));
    else request.resolve(message.result);
  });
  function send(method, params = {}) {
    const id = serial++;
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
      socket.send(JSON.stringify({ id, method, params }));
    });
  }
  return { send, close: () => socket.close() };
}

async function waitReady(session) {
  const expression = 'Boolean(window.__shotReady && window.__modulesReady && document.readyState === "complete")';
  for (let attempt = 0; attempt < 260; attempt += 1) {
    const result = await session.send('Runtime.evaluate', { expression, returnByValue: true });
    if (result.result && result.result.value === true) return;
    await sleep(50);
  }
  throw new Error('game never became ready');
}

function jpegSize(buffer) {
  let offset = 2;
  while (offset + 4 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = buffer[offset + 1];
    offset += 2;
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (offset + 2 > buffer.length) break;
    const length = buffer.readUInt16BE(offset);
    const sof = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    if (sof) return { width: buffer.readUInt16BE(offset + 5), height: buffer.readUInt16BE(offset + 3) };
    if (length < 2) break;
    offset += length;
  }
  return null;
}

async function capture(entry, index, quality) {
  const debugPort = 9237 + index;
  const profile = mkdtempSync(join(root, '.capture-profile-'));
  profiles.push(profile);
  let browser = null;
  let session = null;
  try {
    browser = startBrowser(profile, debugPort);
    await waitFor(`http://127.0.0.1:${debugPort}/json/version`);
    let targets = await json(`http://127.0.0.1:${debugPort}/json/list`);
    for (let attempt = 0; attempt < 60 && !targets.some((target) => target.type === 'page'); attempt += 1) {
      await sleep(80);
      targets = await json(`http://127.0.0.1:${debugPort}/json/list`);
    }
    const page = targets.find((target) => target.type === 'page');
    if (!page) throw new Error('headless Chrome did not open a page');
    session = await openSession(page.webSocketDebuggerUrl);
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
    await session.send('Page.navigate', { url: `${baseUrl}/${entry.query}` });
    await waitReady(session);
    await sleep(180);
    const result = await session.send('Page.captureScreenshot', {
      format: 'jpeg',
      quality,
      fromSurface: true,
      captureBeyondViewport: false,
    });
    const buffer = Buffer.from(result.data, 'base64');
    const size = jpegSize(buffer);
    if (!size || size.width !== width || size.height !== height) {
      throw new Error(`${entry.name} is not ${width}x${height}`);
    }
    if (buffer.length > maxBytes) {
      if (quality > 68) return capture(entry, index, Math.max(68, quality - 12));
      throw new Error(`${entry.name} is ${buffer.length} bytes, over the ${maxBytes} byte limit`);
    }
    return { name: entry.name, buffer };
  } finally {
    if (session) session.close();
    if (browser) browser.kill('SIGKILL');
    await sleep(180);
    rmSync(profile, { recursive: true, force: true });
  }
}

try {
  server = startServer();
  await waitFor(baseUrl);
  const captured = [];
  for (let index = 0; index < shots.length; index += 1) {
    const entry = shots[index];
    captured.push(await capture(entry, index, 84));
    console.log(`captured ${entry.name}`);
  }
  mkdirSync(join(root, 'screenshots'), { recursive: true });
  for (const item of captured) {
    writeFileSync(join(root, 'screenshots', item.name), item.buffer);
  }
  console.log(`wrote ${captured.length} screenshots`);
} finally {
  if (server) server.kill('SIGKILL');
  for (const profile of profiles) rmSync(profile, { recursive: true, force: true });
}
