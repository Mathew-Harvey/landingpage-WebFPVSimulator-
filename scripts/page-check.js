/*
 * page-check.js: load the real pages in headless Chromium and assert what a
 * visitor would see, so that a change to the film's modules has a check that
 * can fail.
 *
 * npm test reaches the attribution, support and velocity modules through
 * jsdom, and the lints read files. Nothing loaded index.html in a browser, so
 * main.js, the stage, the yard, the room, the drone, the manga page, the
 * titles and the boot could all break with every check green. This loads
 * them, as `npm run check:pages`, and prints pass or FAIL for each thing it
 * asserts, exiting non zero on any FAIL.
 *
 * HOW IT IS DRIVEN. Chromium over the DevTools protocol on Node's own
 * WebSocket, the way the simulator's tests/lib/page.js does it, so nothing
 * is added to package.json: one browser, a fresh browser context per page so
 * no page inherits another's storage, and the repository served by
 * scripts/serve.js's own handler on a free port, so the MIME types are the
 * ones `npm run serve` sends.
 *
 * OFFLINE AND DETERMINISTIC. Every request that leaves the local server is
 * paused with Fetch.requestPaused and answered from Node. Three.js from the
 * CDN is fetched by Node (which has the outbound proxy; the container's
 * Chromium does not) and kept in a local cache, so a second run touches no
 * network at all. The board's stats endpoint gets a canned 204, or a refused
 * connection in the run that checks the page survives the board being down.
 * Anything else that tries to leave is refused and named, because a page
 * that "owns no data and calls no API" should have nothing else to send.
 *
 * TWO ORIGINS. The page retargets its launch links when it is served from a
 * loopback address (src/config.js), so one run loads it from the local
 * server and checks the local targets, and another loads it as
 * https://webfpv.org/ with every request for that origin answered from the
 * local server, so the production links and the production stats address
 * are what the page actually uses there.
 *
 * COVERAGE. When WEBFPV_COVERAGE names a folder, precise coverage is started
 * before each navigation and written there as {result: [...]} when the page
 * closes, the page's own scripts only. It changes nothing a check measures.
 *
 * The launch and the DevTools plumbing follow the simulator's
 * tests/lib/browser.js and tests/lib/page.js.
 *
 * This file is part of the WebFPVSimulator landing page.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or (at
 * your option) any later version.
 *
 * This program is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY, without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
 * General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */

import http from 'node:http';
import { spawn } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { inflateSync } from 'node:zlib';

import { handle } from './serve.js';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const CACHE = process.env.WEBFPV_CDN_CACHE || join(tmpdir(), 'webfpv-landing-cdn');
const COVERAGE = process.env.WEBFPV_COVERAGE || '';
const PROD = 'https://webfpv.org';
const LOCAL_SIM = 'http://127.0.0.1:8000';
const LOCAL_BOARD = 'http://127.0.0.1:3100';

/* ------------------------------------------------------------------ */
/* Reporting                                                            */
/* ------------------------------------------------------------------ */

let passed = 0;
let failed = 0;
const failures = [];

function check(name, ok, detail = '') {
  if (ok) {
    passed += 1;
    console.log(` pass  ${name}${detail ? `   ${detail}` : ''}`);
  } else {
    failed += 1;
    failures.push(name);
    console.log(` FAIL  ${name}${detail ? `   ${detail}` : ''}`);
  }
}

/* ------------------------------------------------------------------ */
/* Chromium and the DevTools protocol                                   */
/* ------------------------------------------------------------------ */

const CHROME_CANDIDATES = [
  process.env.WEBFPV_CHROME_BIN,
  process.env.SIM_CHROME_BIN,
  '/opt/pw-browsers/chromium',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
];

function findChrome() {
  for (const c of CHROME_CANDIDATES) {
    if (c && existsSync(c)) {
      return c;
    }
  }
  /* Playwright's own folder, by whatever revision it holds today. */
  try {
    for (const d of readdirSync('/opt/pw-browsers')) {
      const p = join('/opt/pw-browsers', d, 'chrome-linux64', 'chrome');
      if (/^chromium-\d+$/.test(d) && existsSync(p)) {
        return p;
      }
    }
  } catch (e) { /* No such folder: nothing to find there. */ }
  return null;
}

class Cdp {
  constructor(ws) {
    this.ws = ws;
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = [];
    this.dead = null;
    const fail = (e) => {
      if (this.dead) {
        return;
      }
      this.dead = e;
      for (const { reject } of this.pending.values()) {
        reject(e);
      }
      this.pending.clear();
    };
    ws.addEventListener('close', () => fail(new Error('Chrome closed the DevTools connection')));
    ws.addEventListener('error', () => fail(new Error('DevTools connection errored')));
    ws.addEventListener('message', (ev) => {
      const msg = JSON.parse(typeof ev.data === 'string' ? ev.data : new TextDecoder().decode(ev.data));
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) {
          reject(new Error(`CDP ${msg.error.message}`));
        } else {
          resolve(msg.result);
        }
      } else if (msg.method) {
        for (const l of this.listeners) {
          l(msg);
        }
      }
    });
  }

  send(method, params = {}, sessionId = undefined) {
    if (this.dead) {
      return Promise.reject(this.dead);
    }
    const id = this.nextId;
    this.nextId += 1;
    const payload = { id, method, params };
    if (sessionId) {
      payload.sessionId = sessionId;
    }
    this.ws.send(JSON.stringify(payload));
    return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }));
  }

  onEvent(fn) {
    this.listeners.push(fn);
  }
}

async function launch() {
  const chrome = findChrome();
  if (!chrome) {
    throw new Error('no Chromium found: set WEBFPV_CHROME_BIN to a Chrome or Chromium binary');
  }
  const userDataDir = await mkdtemp(join(tmpdir(), 'landing-check-'));
  const proc = spawn(chrome, [
    '--headless=new',
    '--no-sandbox',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--disable-dev-shm-usage',
    '--no-first-run',
    '--no-default-browser-check',
    '--hide-scrollbars',
    '--force-device-scale-factor=1',
    /* A page in a background tab is throttled, and every page here is a
     * background tab of one headless window except the newest. */
    '--disable-background-timer-throttling',
    '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows',
    '--remote-debugging-port=0',
    `--user-data-dir=${userDataDir}`,
    'about:blank',
  ]);
  let stderrBuf = '';
  const wsUrl = await new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`no DevTools endpoint: ${stderrBuf.slice(-1500)}`)), 30000);
    proc.on('error', (e) => { clearTimeout(t); reject(e); });
    proc.on('exit', (code) => { clearTimeout(t); reject(new Error(`Chrome exited early (${code}): ${stderrBuf.slice(-1500)}`)); });
    proc.stderr.on('data', (d) => {
      stderrBuf += d.toString();
      const m = stderrBuf.match(/DevTools listening on (ws:\/\/\S+)/);
      if (m) {
        clearTimeout(t);
        resolve(m[1]);
      }
    });
  });
  const ws = new WebSocket(wsUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true });
    ws.addEventListener('error', () => reject(new Error('DevTools websocket failed')), { once: true });
  });
  const cdp = new Cdp(ws);
  return {
    cdp,
    async close() {
      try { ws.close(); } catch (e) { /* Already gone. */ }
      proc.kill('SIGKILL');
      await rm(userDataDir, { recursive: true, force: true }).catch(() => {});
    },
  };
}

function describe(obj) {
  if (!obj) {
    return 'unknown';
  }
  if (obj.type === 'string') {
    return obj.value;
  }
  return obj.description ?? JSON.stringify(obj.value ?? obj);
}

/* ------------------------------------------------------------------ */
/* The network, answered from Node                                      */
/* ------------------------------------------------------------------ */

async function cdnBytes(url) {
  await mkdir(CACHE, { recursive: true });
  const path = join(CACHE, createHash('sha256').update(url).digest('hex').slice(0, 32));
  if (existsSync(path)) {
    return readFile(path);
  }
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`cdn fetch ${url}: ${res.status}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(path, buf);
  return buf;
}

function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer(handle);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({
        origin: `http://127.0.0.1:${port}`,
        close: () => new Promise((r) => { server.closeAllConnections(); server.close(() => r()); }),
      });
    });
  });
}

/* ------------------------------------------------------------------ */
/* One page                                                             */
/* ------------------------------------------------------------------ */

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/*
 * Open `path` in a fresh browser context and hand back a driver.
 *
 * host: 'local' serves from the loopback server, 'prod' answers
 *   https://webfpv.org/ from it, so the page believes it is in production.
 * board: 'stub' answers the board with a canned reply, 'fail' refuses it.
 * cdn: 'serve' answers the CDN from the cache, 'fail' refuses it.
 */
async function openPage(browser, server, path, {
  width = 1600, height = 900, mobile = false, host = 'local', board = 'stub', cdn = 'serve',
  reducedMotion = false, seed = [], overrides = {}, referrer = undefined,
} = {}) {
  const { cdp } = browser;
  const { browserContextId } = await cdp.send('Target.createBrowserContext', { disposeOnDetach: true });
  const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank', browserContextId });
  const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
  const origin = host === 'prod' ? PROD : server.origin;
  const boardBase = host === 'prod' ? `${PROD}/board` : LOCAL_BOARD;

  const errors = [];
  const networkFailures = [];
  const outbound = [];
  const beacons = [];
  const strays = [];
  let onLoad;
  const loaded = new Promise((r) => { onLoad = r; });
  cdp.onEvent(async (msg) => {
    if (msg.sessionId !== sessionId) {
      return;
    }
    if (msg.method === 'Page.loadEventFired') {
      onLoad(true);
    }
    if (msg.method === 'Runtime.consoleAPICalled') {
      if (msg.params.type === 'error' || msg.params.type === 'assert') {
        errors.push(`console.${msg.params.type}: ${msg.params.args.map(describe).join(' ')}`);
      }
    } else if (msg.method === 'Runtime.exceptionThrown') {
      const d = msg.params.exceptionDetails;
      errors.push(`uncaught: ${d.exception ? describe(d.exception) : d.text}`);
    } else if (msg.method === 'Log.entryAdded') {
      const e = msg.params.entry;
      if (e.level === 'error') {
        if (e.source === 'network') {
          networkFailures.push(`${e.text} (${e.url || ''})`);
        } else {
          errors.push(`${e.source}: ${e.text}${e.url ? ` (${e.url})` : ''}`);
        }
      }
    } else if (msg.method === 'Fetch.requestPaused') {
      const { requestId, request } = msg.params;
      const url = request.url;
      const send = (method, params) => cdp.send(method, { requestId, ...params }, sessionId).catch(() => {});
      try {
        const here = url.startsWith(`${origin}/`) ? new URL(url).pathname : null;
        if (here !== null && Object.prototype.hasOwnProperty.call(overrides, here)) {
          await send('Fetch.fulfillRequest', {
            responseCode: 200,
            responseHeaders: [{ name: 'content-type', value: 'application/json; charset=utf-8' }],
            body: Buffer.from(overrides[here]).toString('base64'),
          });
        } else if (url.startsWith(`${server.origin}/`)) {
          await send('Fetch.continueRequest', {});
        } else if (url.startsWith('https://cdn.jsdelivr.net/')) {
          outbound.push(url);
          if (cdn === 'fail') {
            await send('Fetch.failRequest', { errorReason: 'ConnectionRefused' });
            return;
          }
          const buf = await cdnBytes(url);
          await send('Fetch.fulfillRequest', {
            responseCode: 200,
            responseHeaders: [
              { name: 'content-type', value: 'text/javascript; charset=utf-8' },
              { name: 'access-control-allow-origin', value: '*' },
            ],
            body: buf.toString('base64'),
          });
        } else if (url.startsWith(`${boardBase}/`)) {
          beacons.push({ url, method: request.method, body: request.postData || '' });
          if (board === 'fail') {
            await send('Fetch.failRequest', { errorReason: 'ConnectionRefused' });
            return;
          }
          await send('Fetch.fulfillRequest', {
            responseCode: url.includes('/api/stats/') ? 204 : 200,
            responseHeaders: [
              { name: 'content-type', value: 'application/json' },
              { name: 'access-control-allow-origin', value: '*' },
            ],
            body: url.includes('/api/stats/') ? '' : Buffer.from('{}').toString('base64'),
          });
        } else if (host === 'prod' && (url === PROD || url.startsWith(`${PROD}/`))) {
          const res = await fetch(server.origin + url.slice(PROD.length));
          const buf = Buffer.from(await res.arrayBuffer());
          await send('Fetch.fulfillRequest', {
            responseCode: res.status,
            responseHeaders: [...res.headers].map(([name, value]) => ({ name, value })),
            body: buf.toString('base64'),
          });
        } else {
          strays.push(url);
          await send('Fetch.failRequest', { errorReason: 'BlockedByClient' });
        }
      } catch (e) {
        errors.push(`check: answering ${url} failed: ${e.message}`);
        await send('Fetch.failRequest', { errorReason: 'Failed' });
      }
    }
  });

  await cdp.send('Runtime.enable', {}, sessionId);
  await cdp.send('Log.enable', {}, sessionId);
  await cdp.send('Page.enable', {}, sessionId);
  /* Everything off the loopback server is answered here: https covers the
   * CDN, the production origin and the board; the two loopback ports are
   * where a local page sends the board's beacons and the sim's links. */
  await cdp.send('Fetch.enable', {
    patterns: [
      { urlPattern: 'https://*' },
      { urlPattern: 'http://*' },
    ],
  }, sessionId);
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width, height, deviceScaleFactor: 1, mobile,
  }, sessionId);
  if (mobile) {
    await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 }, sessionId);
  }
  if (reducedMotion) {
    await cdp.send('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
    }, sessionId);
  }
  for (const source of seed) {
    await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source }, sessionId);
  }

  let takeCoverage = async () => {};
  if (COVERAGE) {
    await mkdir(COVERAGE, { recursive: true });
    await cdp.send('Profiler.enable', {}, sessionId);
    await cdp.send('Profiler.startPreciseCoverage', { callCount: false, detailed: true }, sessionId);
    const tag = `${process.pid}-${Date.now().toString(36)}-${path.replace(/[^a-z0-9]+/gi, '_').slice(0, 40)}`;
    takeCoverage = async () => {
      const r = await cdp.send('Profiler.takePreciseCoverage', {}, sessionId).catch(() => null);
      if (!r) {
        return;
      }
      const result = r.result.filter((s) => s.url.startsWith(origin));
      if (result.length) {
        await writeFile(join(COVERAGE, `page-${tag}.json`), JSON.stringify({ result }));
      }
    };
  }

  await cdp.send('Browser.setDownloadBehavior', { behavior: 'deny', browserContextId }).catch(() => {});
  await cdp.send('Page.navigate', { url: `${origin}${path}`, referrer }, sessionId);
  const loadedOk = await Promise.race([loaded, sleep(60000).then(() => false)]);

  async function evaluate(expression) {
    const r = await cdp.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }, sessionId);
    if (r.exceptionDetails) {
      const d = r.exceptionDetails;
      throw new Error(`evaluate threw: ${d.exception ? describe(d.exception) : d.text}`);
    }
    return r.result.value;
  }

  async function until(expression, timeoutMs = 30000) {
    const deadline = Date.now() + timeoutMs;
    for (;;) {
      const ok = await evaluate(expression).catch(() => false);
      if (ok) {
        return true;
      }
      if (Date.now() > deadline) {
        return false;
      }
      await sleep(100);
    }
  }

  async function screenshot() {
    const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' }, sessionId);
    return decodePng(Buffer.from(data, 'base64'));
  }

  async function key(keyName, code, vk) {
    await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key: keyName, code, windowsVirtualKeyCode: vk }, sessionId);
    await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: keyName, code, windowsVirtualKeyCode: vk }, sessionId);
  }

  async function click(x, y) {
    if (mobile) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] }, sessionId);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }, sessionId);
      return;
    }
    await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y }, sessionId);
    await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 }, sessionId);
    await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 }, sessionId);
  }

  /* Click the middle of the first element the selector finds, as a pointer
   * does, so whatever is on top of it gets the click rather than it. */
  async function clickOn(selector) {
    const box = await evaluate(`(() => { const r = document.querySelector(${JSON.stringify(selector)})?.getBoundingClientRect(); return r && r.width ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null; })()`);
    if (!box) {
      return false;
    }
    await click(box.x, box.y);
    return true;
  }

  async function wheel(dy, x = width / 2, y = height / 2) {
    await cdp.send('Input.dispatchMouseEvent', { type: 'mouseWheel', x, y, deltaX: 0, deltaY: dy }, sessionId);
  }

  async function close() {
    await takeCoverage();
    await cdp.send('Target.closeTarget', { targetId }).catch(() => {});
    await cdp.send('Target.disposeBrowserContext', { browserContextId }).catch(() => {});
  }

  return {
    loaded: loadedOk, origin, errors, networkFailures, outbound, beacons, strays,
    evaluate, until, screenshot, key, click, clickOn, wheel, close, sleep,
  };
}

/* ------------------------------------------------------------------ */
/* Pixels                                                               */
/* ------------------------------------------------------------------ */

/* 8 bit RGB or RGBA, no interlace: what Page.captureScreenshot writes. */
function decodePng(buf) {
  let off = 8;
  let width = 0;
  let height = 0;
  let colorType = 6;
  const idat = [];
  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString('ascii', off + 4, off + 8);
    const data = buf.subarray(off + 8, off + 8 + len);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      colorType = data[9];
    } else if (type === 'IDAT') {
      idat.push(data);
    } else if (type === 'IEND') {
      break;
    }
    off += 12 + len;
  }
  const ch = colorType === 6 ? 4 : 3;
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * ch;
  const out = Buffer.alloc(height * stride);
  let p = 0;
  for (let y = 0; y < height; y += 1) {
    const filter = raw[p];
    p += 1;
    const cur = out.subarray(y * stride, (y + 1) * stride);
    const prev = y > 0 ? out.subarray((y - 1) * stride, y * stride) : null;
    for (let i = 0; i < stride; i += 1) {
      const a = i >= ch ? cur[i - ch] : 0;
      const b = prev ? prev[i] : 0;
      const c = prev && i >= ch ? prev[i - ch] : 0;
      const x = raw[p + i];
      let v = x;
      if (filter === 1) {
        v = x + a;
      } else if (filter === 2) {
        v = x + b;
      } else if (filter === 3) {
        v = x + ((a + b) >> 1);
      } else if (filter === 4) {
        const pa = Math.abs(b - c);
        const pb = Math.abs(a - c);
        const pc = Math.abs(a + b - 2 * c);
        v = x + (pa <= pb && pa <= pc ? a : (pb <= pc ? b : c));
      }
      cur[i] = v & 0xff;
    }
    p += stride;
  }
  return {
    width,
    height,
    at(x, y) {
      const i = (Math.floor(y) * width + Math.floor(x)) * ch;
      return [out[i], out[i + 1], out[i + 2]];
    },
  };
}

/* The share of a grid of samples that is not the commonest colour: zero for
 * a blank screen of any one colour, and well above it for paper with ink on
 * it, which is what the first screen is and which has few colours. */
function inkFraction(img, n = 24) {
  const counts = new Map();
  for (let j = 0; j < n; j += 1) {
    for (let i = 0; i < n; i += 1) {
      const [r, g, b] = img.at(((i + 0.5) / n) * img.width, ((j + 0.5) / n) * img.height);
      const k = `${r >> 4},${g >> 4},${b >> 4}`;
      counts.set(k, (counts.get(k) || 0) + 1);
    }
  }
  return 1 - Math.max(...counts.values()) / (n * n);
}

function diffFraction(a, b, n = 24) {
  let differ = 0;
  for (let j = 0; j < n; j += 1) {
    for (let i = 0; i < n; i += 1) {
      const x = ((i + 0.5) / n) * a.width;
      const y = ((j + 0.5) / n) * a.height;
      const p = a.at(x, y);
      const q = b.at(x, y);
      if (Math.abs(p[0] - q[0]) + Math.abs(p[1] - q[1]) + Math.abs(p[2] - q[2]) > 24) {
        differ += 1;
      }
    }
  }
  return differ / (n * n);
}

/* ------------------------------------------------------------------ */
/* Helpers for the checks                                               */
/* ------------------------------------------------------------------ */

/* No uncaught exception, no console.error, nothing that tried to leave for
 * an address this page has no business with. `allowed` names the errors a
 * degraded run asked for, by pattern, and each one must actually turn up,
 * so an allowance cannot quietly outlive the failure it was written for. */
function clean(page, label, allowed = []) {
  const unexpected = page.errors.filter((e) => !allowed.some((re) => re.test(e)));
  check(`${label}: no uncaught exception or console.error`, unexpected.length === 0,
    unexpected.length ? unexpected.map((e) => e.split('\n')[0]).join(' | ') : `${page.errors.length} expected`);
  for (const re of allowed) {
    check(`${label}: the expected failure happened (${re.source})`, page.errors.some((e) => re.test(e)));
  }
  check(`${label}: nothing tried to leave for an unknown address`, page.strays.length === 0, page.strays.join(' '));
}

/* The stage's own drawing buffer, read straight after the film draws a
 * frame to the screen, so what is sampled is the 3D render and not the
 * paper, the copy or the instruments over it. Needs ?debug for the handle. */
const STAGE_PIXELS = `new Promise((resolve) => {
  const r = window.__wf.stage.renderer;
  const orig = r.render;
  const t = setTimeout(() => { r.render = orig; resolve(null); }, 15000);
  r.render = function (scene, camera) {
    orig.call(this, scene, camera);
    if (this.getRenderTarget() !== null) {
      return;
    }
    r.render = orig;
    clearTimeout(t);
    const gl = this.getContext();
    const w = gl.drawingBufferWidth;
    const h = gl.drawingBufferHeight;
    const px = new Uint8Array(4);
    const seen = new Set();
    for (let j = 1; j < 10; j += 1) {
      for (let i = 1; i < 10; i += 1) {
        gl.readPixels(Math.floor(w * i / 10), Math.floor(h * j / 10), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
        seen.add((px[0] >> 3) + ',' + (px[1] >> 3) + ',' + (px[2] >> 3));
      }
    }
    resolve({ w, h, distinct: seen.size });
  };
})`;

/* A 2D canvas's own pixels: how many of a grid of samples are not
 * transparent, and a fingerprint of them, so a redraw can be told apart. */
const canvasInk = (selector) => `(() => {
  const c = document.querySelector(${JSON.stringify(selector)});
  if (!c || !c.width || !c.height) return null;
  const ctx = c.getContext('2d');
  const d = ctx.getImageData(0, 0, c.width, c.height).data;
  let inked = 0;
  let sum = 0;
  const n = 40;
  for (let j = 0; j < n; j += 1) {
    for (let i = 0; i < n; i += 1) {
      const x = Math.floor((i + 0.5) / n * c.width);
      const y = Math.floor((j + 0.5) / n * c.height);
      const k = (y * c.width + x) * 4;
      if (d[k + 3] > 0) inked += 1;
      sum = (sum * 31 + d[k] + d[k + 1] * 7 + d[k + 2] * 13 + d[k + 3]) % 1000000007;
    }
  }
  return { inked, sum, w: c.width, h: c.height };
})()`;

const SEL = (s) => JSON.stringify(s);

async function scrollToT(page, t, timeoutMs = 60000) {
  await page.evaluate(`window.scrollTo(0, window.__wf.scrollFor(${t}))`);
  return page.until(`Math.abs(window.__wf.live().T - ${t}) < 0.012`, timeoutMs);
}

const FILM = `JSON.stringify({
  T: window.__wf ? window.__wf.live().T : null,
  cam: window.__wf ? window.__wf.live().cam : null,
  paper: document.body.classList.contains('on-paper'),
  ledger: [...document.querySelectorAll('#ledger .ledger-row')].findIndex((r) => r.classList.contains('on')),
  progress: parseFloat(document.querySelector('#progress i').style.width) || 0,
  on: ['ticker', 'builder', 'mapper', 'osd', 'hold'].filter((id) => document.getElementById(id).classList.contains('on')),
  copies: [...document.querySelectorAll('[data-copy]')].filter((c) => +getComputedStyle(c).opacity > 0.5).map((c) => c.dataset.copy),
  text: Object.fromEntries(['osd-label', 'osd-timer', 'osd-gate', 'osd-speed', 'tb-gates', 'tb-len', 'mb-els', 'mb-cars', 'tick-count'].map((id) => [id, document.getElementById(id).textContent])),
  loads: window.__wf ? window.__wf.loads() : null,
})`;

async function film(page) {
  return JSON.parse(await page.evaluate(FILM));
}

function camMoved(a, b) {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

/* What every [data-dest] link should point at, from src/config.js's own
 * table, evaluated in the page so the check and the page read one list. */
const DESTS = `import('/src/config.js?v=20261021b').then((m) => JSON.stringify(m.destinations()))`;

/* ------------------------------------------------------------------ */
/* index.html at a desktop size, as production                          */
/* ------------------------------------------------------------------ */

async function desktop(browser, server) {
  const L = 'index desktop';
  const page = await openPage(browser, server, '/?debug&ref=YouTube', {
    width: 1600, height: 900, host: 'prod', referrer: 'https://www.reddit.com/r/fpv/',
  });
  try {
    check(`${L}: loads`, page.loaded);
    check(`${L}: the boot screen lifts`, await page.until("!document.getElementById('boot') && !!window.__wf", 30000));
    check(`${L}: the invitation opens when the film is ready`, await page.until("document.getElementById('invite').classList.contains('on')", 5000));
    check(`${L}: the invitation takes the focus on its card`, await page.evaluate("document.activeElement === document.querySelector('.invite-card')"));
    await page.key('Tab', 'Tab', 9);
    check(`${L}: Tab from the card lands on Just fly`, await page.evaluate("document.activeElement === document.querySelector('.invite-fly')"));
    await page.key('Escape', 'Escape', 27);
    check(`${L}: Escape dismisses the invitation`, await page.until("document.getElementById('invite').hidden && !document.body.classList.contains('invite-open')", 10000));
    check(`${L}: the focus is handed to Fly now`, await page.evaluate("document.activeElement === document.querySelector('.nav a.is-primary') && document.activeElement.classList.contains('handoff')"));
    check(`${L}: the dismissal is remembered`, await page.evaluate("Number(localStorage.getItem('webfpv.invite.seen')) > 0"));

    /* The drone builds itself on the first screen. */
    /* It builds on the frame clock (dt capped at 50 ms), so on a software
     * rasteriser, with the loader building the places behind it and coverage
     * counting every block, a single tick can take tens of seconds: what is
     * asserted is that it builds, without a scroll, not how fast. */
    const ticks = "parseInt(document.getElementById('tick-count').textContent, 10)";
    const tick0 = await page.evaluate(ticks);
    check(`${L}: the build order ticks on by itself at the top`, await page.until(`${ticks} > ${tick0} && window.scrollY === 0`, 120000),
      `${tick0} to ${await page.evaluate("document.getElementById('tick-count').textContent")}`);

    /* The manga page and the lettering. */
    const top = await film(page);
    check(`${L}: the first screen is the manga page (body.on-paper at T 0)`, top.paper && top.T === 0, `T ${top.T}`);
    const panels = await page.evaluate("JSON.stringify([...document.querySelectorAll('.worlds .world')].map((a) => a.style.clipPath.startsWith('polygon(')))");
    check(`${L}: page.js clips each chapter panel to its quad`, JSON.parse(panels).length === 3 && JSON.parse(panels).every(Boolean), panels);
    check(`${L}: page.js draws the paper and its ink`, await page.evaluate("(() => { const p = [...document.querySelectorAll('svg.page-ink path')]; return p.length >= 2 && p.every((e) => (e.getAttribute('d') || '').length > 20); })()"));
    const lettered = JSON.parse(await page.evaluate(`JSON.stringify({
      h2: [...document.querySelectorAll('main h2, #why h2, #close h2')].filter((h) => !h.closest('[hidden]')).map((h) => !!h.querySelector('canvas.lettered-art')),
      mark: !!document.querySelector('.wordmark canvas.lettered-art'),
      transparent: getComputedStyle(document.querySelector('.wordmark')).color,
    })`));
    check(`${L}: titles.js letters the wordmark`, lettered.mark);
    check(`${L}: titles.js letters every act's h2`, lettered.h2.length > 0 && lettered.h2.every(Boolean), `${lettered.h2.filter(Boolean).length} of ${lettered.h2.length}`);
    const ink = await page.evaluate(canvasInk('.wordmark canvas.lettered-art'));
    check(`${L}: the lettered wordmark has ink in it`, ink && ink.inked > 20, ink ? `${ink.inked} of 1600 samples` : 'no canvas');

    /* The stage itself. */
    const size = JSON.parse(await page.evaluate("JSON.stringify({ w: document.getElementById('stage').width, h: document.getElementById('stage').height })"));
    check(`${L}: the stage canvas fills the window`, size.w === 1600 && size.h === 900, `${size.w}x${size.h}`);
    /* On paper the studio is drawn as ink, so its buffer is nearly one
     * colour by design: the render is sampled again once the film is in
     * colour, on the lap. */
    const px = await page.evaluate(STAGE_PIXELS);
    check(`${L}: the 3D stage draws a frame on the first screen`, px && px.w === 1600 && px.h === 900, px ? `${px.w}x${px.h}, ${px.distinct} distinct of 81` : 'no frame drawn');
    const shot0 = await page.screenshot();
    const ink0 = inkFraction(shot0);
    check(`${L}: the first screen is not blank`, ink0 > 0.1, `${Math.round(ink0 * 100)} per cent off the commonest colour`);

    /* The links: production, carrying the visitor's ref and referrer. */
    const dests = JSON.parse(await page.evaluate(DESTS));
    const links = JSON.parse(await page.evaluate("JSON.stringify([...document.querySelectorAll('[data-dest]')].map((a) => ({ d: a.dataset.dest, href: a.href })))"));
    const byId = new Map(dests.map((d) => [d.id, d.href]));
    const wrong = links.filter((l) => {
      const want = new URL(byId.get(l.d));
      want.searchParams.set('ref', 'youtube');
      want.searchParams.set('referrer', 'www.reddit.com');
      return l.href !== want.href;
    });
    check(`${L}: every launch link is its production address with ref and referrer`, links.length > 20 && wrong.length === 0,
      wrong.length ? wrong.slice(0, 3).map((w) => `${w.d} ${w.href}`).join(' | ') : `${links.length} links`);
    const fly = await page.evaluate("document.querySelector('.nav a.is-primary').href");
    check(`${L}: Fly now goes to the simulator`, fly === 'https://webfpv.org/sim/?map=field&ref=youtube&referrer=www.reddit.com', fly);
    check(`${L}: the board link goes to the board`, await page.evaluate("[...document.querySelectorAll('a[data-dest=board]')].length >= 2 && [...document.querySelectorAll('a[data-dest=board]')].every((a) => a.href.startsWith('https://webfpv.org/board/?'))"));
    check(`${L}: the partners link and every roster mark go to the board's partners page`, await page.evaluate("[...document.querySelectorAll('a[data-dest^=partners]')].length >= 9 && [...document.querySelectorAll('a[data-dest^=partners]')].every((a) => a.href.startsWith('https://webfpv.org/board/partners?'))"));
    check(`${L}: the partners' strip is on the first screen`, await page.evaluate("document.querySelectorAll('.hero-partners .hpmark img').length >= 4 && [...document.querySelectorAll('.hero-partners .hpmark img')].every((i) => i.complete && i.naturalWidth > 0)"));
    check(`${L}: the supporters list ships hidden while supporters.json is empty`, await page.evaluate("document.getElementById('supporters').hidden && document.getElementById('supporters-list').children.length === 0"));
    check(`${L}: the Also by marks are left alone`, await page.evaluate("['https://thebodyweightgym.org/', 'https://my-app-hub.com/', 'https://webcoloring.org/'].every((h) => !!document.querySelector(`a[href='${h}']`))"));
    check(`${L}: Patreon and the tip carry their notes`, await page.evaluate("document.getElementById('support-link').getAttribute('aria-label').includes('Patreon') && document.getElementById('tip-link').getAttribute('aria-label').includes('$5')"));
    const steam = await page.evaluate("JSON.stringify([...document.querySelectorAll('a[href*=\"store.steampowered.com\"]')].map((a) => new URL(a.href).searchParams.get('utm_campaign')).sort())");
    check(`${L}: Wishlist on Steam in its four places`, steam === JSON.stringify(['card', 'footer', 'hero', 'nav']), steam);

    /* A wheel scrolls the page and the page drives the film. */
    await page.wheel(500);
    check(`${L}: a wheel notch scrolls the page`, await page.until('window.scrollY > 100', 5000), `${await page.evaluate('window.scrollY')} px`);
    check(`${L}: and the film follows it`, await page.until('window.__wf.live().T > 0.05', 15000));

    /* Through the film by scrolling. */
    const seen = [];
    let shotPrev = shot0;
    const stops = [
      [0.5, (f) => f.paper && f.on.includes('ticker') && f.copies.includes('assemble') && f.ledger === 0,
        'act one: still paper, the build order and the copy up, ledger on Build'],
      [1.5, (f) => !f.paper && f.on.includes('builder') && f.ledger === 1 && Number(f.text['tb-gates']) > 0 && f.copies.includes('build'),
        'act two: the track builder panel counting gates, ledger on Racing'],
      [2.5, (f) => f.on.includes('osd') && /^Gate [1-7] of 7$/.test(f.text['osd-gate']) && parseFloat(f.text['osd-speed']) > 0 && parseFloat(f.text['osd-timer']) > 0,
        'the lap: OSD up with a gate, a speed and a clock'],
      [3.5, (f) => f.on.includes('mapper') && f.ledger === 2 && Number(f.text['mb-els']) > 0,
        'the map builder: the mapper panel counting elements, ledger on Freestyle'],
      [4.5, (f) => f.on.includes('osd') && f.text['osd-label'] === 'Flight' && f.ledger === 2 && /drift/.test(f.text['mb-cars']),
        'the yard: flying the chase, the tandem counted'],
      [5.5, (f) => f.on.includes('osd') && f.text['osd-label'] === 'Run' && /^Lap [1-3] of 3$/.test(f.text['osd-gate']) && f.ledger === 3,
        'the shed: the whoop run, ledger on Whoop'],
      [6.99, (f) => f.ledger === 4 && f.progress > 99,
        'the close: ledger on Practise, progress full'],
    ];
    for (const [t, ok, what] of stops) {
      const arrived = await scrollToT(page, t);
      const f = await film(page);
      seen.push(f);
      check(`${L}: scroll to T ${t}, ${what}`, arrived && ok(f), `T ${f.T.toFixed(3)} on [${f.on}] ledger ${f.ledger} ${JSON.stringify(f.text)}`);
      if (t === 2.5) {
        const lapPx = await page.evaluate(STAGE_PIXELS);
        check(`${L}: on the lap the 3D stage renders in colour, sampled pixels differ`, lapPx && lapPx.distinct >= 6, lapPx ? `${lapPx.distinct} distinct of 81` : 'no frame drawn');
      }
      const shot = await page.screenshot();
      const d = diffFraction(shotPrev, shot);
      check(`${L}: the picture at T ${t} is not the one before it`, d > 0.2, `${Math.round(d * 100)} per cent of samples changed`);
      shotPrev = shot;
    }
    check(`${L}: the progress bar only moves forward`, seen.every((f, i) => i === 0 || f.progress > seen[i - 1].progress), seen.map((f) => f.progress.toFixed(1)).join(' '));
    check(`${L}: the camera travels between acts`, seen.every((f, i) => i === 0 || camMoved(f.cam, seen[i - 1].cam) > 0.5));
    const lap = seen.find((f) => f.T > 2.4 && f.T < 2.6);
    const px2 = await page.evaluate(STAGE_PIXELS);
    check(`${L}: the stage still renders at the close`, px2 && px2.distinct >= 6, px2 ? `${px2.distinct} distinct` : 'no frame');
    check(`${L}: the lap clock is driven by the scroll`, lap && parseFloat(lap.text['osd-timer']) > 0);

    const loads = await page.evaluate('JSON.stringify(window.__wf.loads())');
    check(`${L}: the loader built every place without an error`, JSON.parse(loads).length >= 3 && JSON.parse(loads).every((j) => j.done && !j.error), loads.slice(0, 300));
    const clr = JSON.parse(await page.evaluate('JSON.stringify(window.__wf.yard.clearance())'));
    check(`${L}: the yard's line never enters a solid`, clr && clr.nearest.gap > 0 && clr.under === 0, clr ? `nearest ${clr.nearest.gap} m, ${clr.nearest.what}` : 'no yard');
    check(`${L}: the yard's line never enters a drift car`, clr && clr.cars.gap > 0, clr ? `nearest ${clr.cars.gap} m` : 'no yard');
    /* After the scroll down, because the footer's marks load lazily. */
    check(`${L}: the footer's partner row has its marks, drawn`, await page.until("[...document.querySelectorAll('#partner-row .pmark img')].length >= 5 && [...document.querySelectorAll('#partner-row .pmark img')].every((i) => i.complete && i.naturalWidth > 0)", 10000));
    check(`${L}: the closing cards are on screen`, await page.until("(() => { const r = document.getElementById('cards').getBoundingClientRect(); return r.top < innerHeight && r.bottom > 0; })()", 5000));

    /* The partners' marks are counted as seen, at production's address. */
    await page.sleep(1500);
    const bodies = page.beacons.map((b) => { try { return { url: b.url, ...JSON.parse(b.body) }; } catch (e) { return { url: b.url, bad: b.body }; } });
    const seenOf = (place) => bodies.filter((b) => b.kind === 'partner' && b.what === 'seen' && b.place === place).map((b) => b.partner).sort();
    check(`${L}: every beacon goes to the board's stats endpoint as v1 JSON`, bodies.length > 0 && bodies.every((b) => b.url === 'https://webfpv.org/board/api/stats/events' && b.v === 1), `${bodies.length} beacons`);
    check(`${L}: the hero strip's marks are counted seen`, JSON.stringify(seenOf('landing_hero')) === JSON.stringify(['gds', 'mantisfpv', 'wcmrc', 'webleedfpv']), seenOf('landing_hero').join(','));
    check(`${L}: the film's partner moments are counted seen`, seenOf('landing_moment').includes('wcmrc') && seenOf('landing_moment').includes('mantisfpv'), seenOf('landing_moment').join(','));
    check(`${L}: the footer row's marks are counted seen`, seenOf('landing_row').length >= 4, seenOf('landing_row').join(','));
    check(`${L}: no mark is counted twice`, ['landing_hero', 'landing_moment', 'landing_row'].every((p) => new Set(seenOf(p)).size === seenOf(p).length));

    /* Clicks that are counted, kept on the page so the check stays on it. */
    await page.evaluate("for (const s of ['#partner-row .pmark[data-partner=gds]', '#support-link', '.foot-offers [data-offer=sign]']) { document.querySelector(s).addEventListener('click', (e) => e.preventDefault()); }");
    const n0 = page.beacons.length;
    await page.evaluate("document.querySelector('#partner-row .pmark[data-partner=gds]').scrollIntoView({ block: 'center' })");
    await page.sleep(300);
    await page.clickOn('#partner-row .pmark[data-partner=gds]');
    await page.evaluate("document.getElementById('support-link').scrollIntoView({ block: 'center' })");
    await page.sleep(300);
    await page.clickOn('#support-link');
    await page.clickOn('.foot-offers [data-offer=sign]');
    await page.sleep(800);
    const clicks = page.beacons.slice(n0).map((b) => JSON.parse(b.body));
    check(`${L}: a partner mark click is counted`, clicks.some((c) => c.kind === 'partner' && c.what === 'click' && c.partner === 'gds' && c.place === 'landing_row'), JSON.stringify(clicks));
    check(`${L}: a Support click is counted`, clicks.some((c) => c.kind === 'support_click' && c.source === 'landing'));
    check(`${L}: an offer click is counted`, clicks.some((c) => c.kind === 'offer_click' && c.offer === 'sign'));

    /* The chapter panels are a jump, and so are the ledger's rows. */
    await page.evaluate('window.scrollTo(0, 0)');
    check(`${L}: back at the top the page is paper again`, await page.until("window.__wf.live().T < 0.01 && document.body.classList.contains('on-paper')", 60000));
    await page.clickOn(".world[data-chapter='whoop']");
    check(`${L}: the whoop panel jumps to its chapter`, await page.until("location.hash === '#whoop' && window.__wf.live().T > 5 && window.__wf.live().T < 5.2", 30000),
      `${await page.evaluate('location.hash')} T ${(await film(page)).T.toFixed(3)}`);
    check(`${L}: the jump focuses the chapter's heading`, await page.evaluate("document.activeElement && document.activeElement.tagName === 'H2' && document.activeElement.closest('section').dataset.act === 'room'"));
    await page.clickOn("#ledger .ledger-row[href='#freestyle']");
    check(`${L}: the ledger's Freestyle row jumps to the map act`, await page.until("location.hash === '#freestyle' && window.__wf.live().T > 3 && window.__wf.live().T < 3.2", 30000),
      `T ${(await film(page)).T.toFixed(3)}`);
    await page.evaluate('history.back()');
    check(`${L}: Back returns to the previous chapter`, await page.until("location.hash === '#whoop' && window.__wf.live().T > 5 && window.__wf.live().T < 5.2", 30000),
      `${await page.evaluate('location.hash')} T ${(await film(page)).T.toFixed(3)}`);

    clean(page, L);
  } finally {
    await page.close();
  }
}

/* ------------------------------------------------------------------ */
/* index.html at a phone size, served locally                           */
/* ------------------------------------------------------------------ */

const SUPPORTERS = JSON.stringify([
  { name: 'Ada Pilot', optIn: true },
  { name: 'Hidden Person', optIn: false },
  { name: '   ', optIn: true },
  { name: 'B'.repeat(60), optIn: true },
  { optIn: true },
]);

async function phone(browser, server) {
  const L = 'index phone';
  const page = await openPage(browser, server, '/', {
    width: 430, height: 932, mobile: true, host: 'local',
    overrides: { '/supporters.json': SUPPORTERS },
    /* Global Privacy Control on: the page must send nothing at all. */
    seed: ["Object.defineProperty(Navigator.prototype, 'globalPrivacyControl', { get: () => true });"],
  });
  try {
    check(`${L}: loads`, page.loaded);
    check(`${L}: the boot screen lifts`, await page.until("!document.getElementById('boot')", 30000));
    check(`${L}: the invitation opens`, await page.until("document.getElementById('invite').classList.contains('on')", 5000));
    /* Past the card's fade and rise, so the tap lands where the cross is
     * going to be rather than where it was a frame ago. */
    await page.sleep(800);
    await page.clickOn('.invite-x');
    check(`${L}: the cross closes it`, await page.until("document.getElementById('invite').hidden", 3000));

    const links = JSON.parse(await page.evaluate("JSON.stringify(Object.fromEntries([...document.querySelectorAll('[data-dest]')].map((a) => [a.dataset.dest, a.href])))"));
    check(`${L}: Fly now is retargeted to the local simulator`, links.sim === `${LOCAL_SIM}/?map=field`, links.sim);
    check(`${L}: the board is retargeted to the local board`, links.board === `${LOCAL_BOARD}/`, links.board);
    check(`${L}: the yard link fetches from the local board`, links.yard && links.yard.startsWith(`${LOCAL_SIM}/?map=built&mapshare=`) && links.yard.includes(`board=${encodeURIComponent(LOCAL_BOARD)}`), links.yard);
    check(`${L}: the partners page is the local board's`, links.partners === `${LOCAL_BOARD}/partners`, links.partners);

    check(`${L}: the ledger is put away on a phone`, await page.evaluate("getComputedStyle(document.getElementById('ledger')).display === 'none' || +getComputedStyle(document.getElementById('ledger')).opacity === 0"));
    check(`${L}: the menu starts closed`, await page.evaluate("!document.getElementById('topbar').classList.contains('menu-open') && document.getElementById('nav-toggle').getAttribute('aria-expanded') === 'false'"));
    await page.clickOn('#nav-toggle');
    check(`${L}: the menu button opens the menu`, await page.until("document.getElementById('topbar').classList.contains('menu-open') && document.getElementById('nav-toggle').getAttribute('aria-expanded') === 'true'", 2000));
    check(`${L}: the open menu shows its links`, await page.until("(() => { const r = document.querySelector('#nav-links a[href=\"wiki/\"]').getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.top >= 0 && r.top < innerHeight; })()", 2000));
    await page.key('Escape', 'Escape', 27);
    check(`${L}: Escape closes the menu`, await page.until("!document.getElementById('topbar').classList.contains('menu-open')", 2000));
    await page.clickOn('#nav-toggle');
    await page.until("document.getElementById('topbar').classList.contains('menu-open')", 2000);
    /* Outside the sheet and on nothing that is itself a link, because a tap
     * on a chapter panel is a jump and would scroll the film. */
    const spot = JSON.parse(await page.evaluate(`JSON.stringify((() => {
      for (let y = 900; y > 100; y -= 20) {
        for (let x = 20; x < 420; x += 40) {
          const e = document.elementFromPoint(x, y);
          if (e && !e.closest('a, button, .nav-links, .nav-toggle, input, label')) return { x, y };
        }
      }
      return null;
    })())`));
    await page.click(spot ? spot.x : 215, spot ? spot.y : 880);
    check(`${L}: a tap outside closes the menu`, await page.until("!document.getElementById('topbar').classList.contains('menu-open')", 2000));

    const size = JSON.parse(await page.evaluate("JSON.stringify({ w: document.getElementById('stage').width, h: document.getElementById('stage').height })"));
    check(`${L}: the stage canvas fills the phone`, size.w === 430 && size.h === 932, `${size.w}x${size.h}`);
    check(`${L}: closing the menu left the page at the top`, await page.evaluate('window.scrollY === 0'), `${await page.evaluate('window.scrollY')} px`);
    await page.sleep(500);
    const shot0 = await page.screenshot();
    const ink0 = inkFraction(shot0);
    check(`${L}: the first screen is not blank`, ink0 > 0.1, `${Math.round(ink0 * 100)} per cent off the commonest colour`);

    const p0 = await page.evaluate("parseFloat(document.querySelector('#progress i').style.width) || 0");
    await page.evaluate('window.scrollTo(0, document.documentElement.scrollHeight * 0.33)');
    check(`${L}: scrolling a third of the way drives the progress bar`, await page.until("parseFloat(document.querySelector('#progress i').style.width) > 20", 60000),
      `${p0} to ${await page.evaluate("document.querySelector('#progress i').style.width")}`);
    await page.sleep(1500);
    const shot1 = await page.screenshot();
    const d = diffFraction(shot0, shot1);
    check(`${L}: and the picture changes with it`, d > 0.2, `${Math.round(d * 100)} per cent of samples changed`);
    check(`${L}: the paper has gone by the lap`, await page.evaluate("!document.body.classList.contains('on-paper')"));

    await page.evaluate("document.getElementById('partner-row').scrollIntoView({ block: 'center' })");
    const names = await page.until("!document.getElementById('supporters').hidden", 5000);
    check(`${L}: the supporters list shows opted in names only`, names && await page.evaluate("JSON.stringify([...document.querySelectorAll('#supporters-list .supporter-name')].map((s) => s.textContent)) === JSON.stringify(['Ada Pilot', 'B'.repeat(50) + '...'])"),
      await page.evaluate("JSON.stringify([...document.querySelectorAll('#supporters-list .supporter-name')].map((s) => s.textContent.slice(0, 12)))"));
    await page.sleep(2000);
    check(`${L}: Global Privacy Control sends no beacon, footer marks seen or not`, page.beacons.length === 0, `${page.beacons.length} sent`);

    clean(page, L);
  } finally {
    await page.close();
  }
}

/* ------------------------------------------------------------------ */
/* Reduced motion                                                       */
/* ------------------------------------------------------------------ */

async function reduced(browser, server) {
  const L = 'index reduced motion';
  const page = await openPage(browser, server, '/?debug', { width: 1280, height: 800, reducedMotion: true });
  try {
    check(`${L}: the boot screen lifts`, await page.until("!document.getElementById('boot') && !!window.__wf", 30000));
    await page.until('window.__wf.live().T > 0', 10000);
    const a = await film(page);
    check(`${L}: the film is pinned in act three`, Math.abs(a.T - 2.55) < 1e-9, `T ${a.T}`);
    check(`${L}: the instruments are not shown`, await page.evaluate("['osd', 'ticker', 'builder', 'mapper', 'beats'].every((id) => getComputedStyle(document.getElementById(id)).display === 'none')"));
    await page.evaluate('window.scrollTo(0, document.documentElement.scrollHeight * 0.6)');
    await page.sleep(2500);
    const b = await film(page);
    check(`${L}: scrolling does not move the film`, Math.abs(b.T - 2.55) < 1e-9 && camMoved(a.cam, b.cam) < 1e-6, `T ${b.T}`);
    const px = await page.evaluate(STAGE_PIXELS);
    check(`${L}: the stage still renders`, px && px.distinct >= 6, px ? `${px.distinct} distinct` : 'no frame');
    check(`${L}: no sticker is slapped`, await page.evaluate("[...document.querySelectorAll('.slap')].every((s) => getComputedStyle(s).animationName === 'none')"));
    clean(page, L);
  } finally {
    await page.close();
  }
}

/* ------------------------------------------------------------------ */
/* Degraded: the CDN and the board are down                             */
/* ------------------------------------------------------------------ */

async function degraded(browser, server) {
  const L = 'index without the CDN or the board';
  const page = await openPage(browser, server, '/?thanks=track&from=x', { width: 1280, height: 800, cdn: 'fail', board: 'fail' });
  try {
    check(`${L}: loads`, page.loaded);
    check(`${L}: the thank you card opens for ?thanks=track`, await page.until("document.getElementById('thanks').classList.contains('on')", 5000));
    check(`${L}: it gives the buyer the address with the subject`, await page.evaluate("document.getElementById('thanks-h').textContent === 'Thanks for the order' && document.querySelector('#thanks-p a').href === 'mailto:mathewharvey@gmail.com?subject=Track%20order'"));
    check(`${L}: ?thanks is stripped and the rest kept`, await page.evaluate("location.search === '?from=x'"), await page.evaluate('location.search'));
    await page.key('Escape', 'Escape', 27);
    check(`${L}: Escape closes the thank you card`, await page.until("document.getElementById('thanks').hidden", 3000));
    check(`${L}: the titles are lettered without three.js`, await page.until("!!document.querySelector('.wordmark canvas.lettered-art') && !!document.querySelector('#boot canvas.lettered-art, #boot .lettered-art, .boot-mark canvas')", 5000)
      || await page.evaluate("document.querySelectorAll('canvas.lettered-art').length > 5"));
    check(`${L}: support-boot still labels the Support link`, await page.evaluate("document.getElementById('support-link').getAttribute('aria-label').includes('Patreon')"));
    check(`${L}: the boot screen says what it is waiting for`, await page.evaluate("document.getElementById('boot-note').textContent.trim() === 'Fetching the renderer'"));
    check(`${L}: the invitation is the way in after thirteen seconds`, await page.until("document.getElementById('invite').classList.contains('on')", 16000));
    check(`${L}: and its Just fly is still a link to production`, await page.evaluate("document.querySelector('.invite-fly').href === 'https://webfpv.org/sim/?map=field'"));
    await page.evaluate("document.getElementById('support-link').addEventListener('click', (e) => e.preventDefault())");
    await page.key('Escape', 'Escape', 27);
    await page.until("document.getElementById('invite').hidden", 3000);
    await page.evaluate("document.getElementById('support-link').click()");
    await page.sleep(500);
    check(`${L}: a Support click still tries the board`, page.beacons.length >= 1, `${page.beacons.length} tried`);
    check(`${L}: the CDN failure is the only network failure`, page.networkFailures.length > 0 && page.networkFailures.every((f) => f.includes('cdn.jsdelivr.net') || f.includes(LOCAL_BOARD)), page.networkFailures.join(' | '));
    clean(page, L);
  } finally {
    await page.close();
  }
}

/* ------------------------------------------------------------------ */
/* Degraded: no WebGL                                                   */
/* ------------------------------------------------------------------ */

async function noWebgl(browser, server) {
  const L = 'index without WebGL';
  const page = await openPage(browser, server, '/', {
    width: 1280, height: 800,
    seed: ["{ const o = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function (t, ...a) { return /webgl/i.test(t) ? null : o.call(this, t, ...a); }; }"],
  });
  try {
    check(`${L}: says so on #nowebgl`, await page.until("document.getElementById('nowebgl').classList.contains('on')", 20000));
    check(`${L}: the boot screen lifts off the message`, await page.until("!document.getElementById('boot')", 5000));
    await page.sleep(1500);
    check(`${L}: the invitation stays away`, await page.evaluate("document.getElementById('invite').hidden"));
    check(`${L}: the titles are still lettered`, await page.evaluate("!!document.querySelector('.wordmark canvas.lettered-art')"));
    check(`${L}: Fly now is still a link`, await page.evaluate("document.querySelector('.nav a.is-primary').href === 'https://webfpv.org/sim/?map=field'"));
    clean(page, L, [/WebGLRenderer: Error creating WebGL context/, /stage: could not start WebGL/, /^uncaught: Error: Error creating WebGL context/]);
  } finally {
    await page.close();
  }
}

/* ------------------------------------------------------------------ */
/* The wiki                                                             */
/* ------------------------------------------------------------------ */

/* A sample of the generated article pages, spread evenly through the sorted
 * list so every family of page (cli settings, physics, start, and the rest)
 * is in it, and the same sample every run. */
function wikiSample(n = 10) {
  const all = readdirSync(join(ROOT, 'wiki'), { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(join(ROOT, 'wiki', d.name, 'index.html')))
    .map((d) => d.name)
    .sort();
  const pick = new Set(['physics-yaw', 'start-welcome']);
  for (let i = 0; i < n && all.length; i += 1) {
    pick.add(all[Math.floor((i * (all.length - 1)) / Math.max(1, n - 1))]);
  }
  return [...pick].filter((s) => all.includes(s));
}

async function staticH1(slug) {
  const html = await readFile(join(ROOT, 'wiki', slug, 'index.html'), 'utf8');
  const m = html.match(/<h1>([\s\S]*?)<\/h1>/);
  return m ? m[1].replace(/&#0?39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').trim() : null;
}

async function wikiStatic(browser, server, slugs) {
  for (const slug of slugs) {
    const L = `wiki/${slug}/`;
    const page = await openPage(browser, server, `/wiki/${slug}/`, { width: 1280, height: 800 });
    try {
      const r = JSON.parse(await page.evaluate(`JSON.stringify({
        h1: document.querySelectorAll('h1').length,
        canonical: document.querySelector('link[rel=canonical]')?.href,
        live: !!document.querySelector('a[href="/wiki/#wiki/${slug}"]'),
        og: document.querySelector('meta[property="og:image"]')?.content || '',
      })`));
      check(`${L}: one h1, its canonical address, a way into the live wiki and the share card`,
        page.loaded && r.h1 === 1 && r.canonical === `https://webfpv.org/wiki/${slug}/` && r.live && /og\.jpg\?v=[0-9a-f]{8}$/.test(r.og), JSON.stringify(r));
      clean(page, L);
    } finally {
      await page.close();
    }
  }
}

async function wikiLive(browser, server, slugs) {
  const L = 'wiki';
  const page = await openPage(browser, server, '/wiki/', { width: 1280, height: 860 });
  try {
    check(`${L}: loads and opens an article`, page.loaded && await page.until("document.querySelectorAll('#wiki h1').length === 1", 15000));
    check(`${L}: the wordmark is lettered`, await page.until("!!document.querySelector('#topbar .mark canvas.lettered-art')", 5000));
    check(`${L}: Fly now is retargeted to the local simulator`, await page.evaluate(`document.querySelector('a[data-dest=sim]').href === ${SEL(`${LOCAL_SIM}/?map=field`)}`));

    for (const slug of slugs) {
      const want = await staticH1(slug);
      await page.evaluate(`location.hash = ${SEL(`#wiki/${slug}`)}`);
      const ok = await page.until(`(document.querySelector('#wiki h1')?.textContent || '').trim() === ${SEL(want)}`, 8000);
      check(`${L}: #wiki/${slug} opens the article its static page names`, ok, ok ? want : `wanted ${want}, got ${await page.evaluate("document.querySelector('#wiki h1')?.textContent")}`);
      check(`${L}: #wiki/${slug} titles the document`, await page.evaluate(`document.title.startsWith(${SEL(want)})`), await page.evaluate('document.title'));
    }

    /* A figure computes, and its knob moves it. */
    await page.evaluate("location.hash = '#wiki/physics-yaw'");
    await page.until(`document.querySelector('#wiki h1')?.textContent.trim() === ${SEL(await staticH1('physics-yaw'))} && document.querySelector('#wiki .wiki-figure')?.dataset.fig === 'yawtorque'`, 5000);
    await page.sleep(600);
    const before = await page.evaluate(canvasInk('#wiki .wiki-fig-canvas'));
    check(`${L}: the yaw figure is drawn`, before && before.inked > 100, before ? `${before.inked} of 1600 samples inked` : 'no canvas');
    const readout0 = await page.evaluate("document.querySelector('#wiki .wiki-ctl-value').textContent");
    await page.evaluate("(() => { const r = document.querySelector('#wiki .wiki-ctl-range'); r.value = '0.9'; r.dispatchEvent(new Event('input', { bubbles: true })); })()");
    await page.sleep(600);
    const readout1 = await page.evaluate("document.querySelector('#wiki .wiki-ctl-value').textContent");
    const after = await page.evaluate(canvasInk('#wiki .wiki-fig-canvas'));
    check(`${L}: moving the throttle knob changes its readout`, readout0 !== readout1 && /90/.test(readout1), `${readout0} to ${readout1}`);
    check(`${L}: and redraws the figure`, after && before && after.sum !== before.sum);

    /* Every article carries a figure, every figure has a knob with a
     * readout (CLAUDE.md). For each article of the book the figure draws,
     * and turning its first knob (a slider to its far end, a pick to the
     * next choice, a toggle over) changes the knob's state and the drawing.
     *
     * Two figures have no knob on unmodified main: physics-missing has no
     * controls at all and start-compiled has only Pause. That disagrees with
     * the rule, and it is reported rather than fixed here, so they are named
     * below and the check asserts the list is exactly them: a third knobless
     * figure fails, and so does giving one of these a knob without taking
     * it off the list. */
    const KNOBLESS = ['physics-missing', 'start-compiled'];
    const book = readdirSync(join(ROOT, 'wiki')).filter((d) => /^(start|physics|control)-/.test(d)).sort();
    const quiet = [];
    const knobless = [];
    for (const slug of book) {
      const title = await staticH1(slug);
      await page.evaluate(`location.hash = ${SEL(`#wiki/${slug}`)}`);
      const has = await page.until(`(document.querySelector('#wiki h1')?.textContent || '').trim() === ${SEL(title)} && !!document.querySelector('#wiki .wiki-figure canvas')`, 5000);
      await page.sleep(300);
      const r = has ? JSON.parse(await page.evaluate(`(async () => {
        const fig = document.querySelector('#wiki .wiki-figure');
        const c = fig.querySelector('canvas');
        const ink = () => { const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0, s = 0; for (let i = 0; i < d.length; i += 4 * 97) { if (d[i + 3]) n += 1; s = (s * 31 + d[i] + d[i + 1] * 7 + d[i + 2] * 13) % 1000000007; } return { n, s }; };
        const ctl = fig.querySelector('.wiki-ctl');
        const state = () => ctl ? ctl.querySelector('.wiki-ctl-value').textContent + '|' + [...ctl.querySelectorAll('[aria-pressed]')].map((b) => b.getAttribute('aria-pressed')).join() + '|' + (ctl.querySelector('input[type=checkbox]') || {}).checked : null;
        const play = fig.querySelector('.wiki-fig-play[aria-pressed=true]');
        if (play) play.click();
        await new Promise((res) => setTimeout(res, 100));
        const a = ink();
        const s0 = state();
        let kind = null;
        if (ctl) {
          const range = ctl.querySelector('input[type=range]');
          const pick = ctl.querySelector('.wiki-ctl-pick:not(.on)');
          const box = ctl.querySelector('input[type=checkbox]');
          if (range) { kind = 'range'; range.value = String(Number(range.value) === Number(range.max) ? range.min : range.max); range.dispatchEvent(new Event('input', { bubbles: true })); }
          else if (pick) { kind = 'pick'; pick.click(); }
          else if (box) { kind = 'toggle'; box.click(); }
        }
        await new Promise((res) => setTimeout(res, 400));
        const b = ink();
        return JSON.stringify({ inked: a.n, kind, moved: s0 !== null && state() !== s0, redrawn: a.s !== b.s });
      })()`)) : null;
      if (r && !r.kind) {
        knobless.push(slug);
        if (!(r.inked > 0)) {
          quiet.push(`${slug} ${JSON.stringify(r)}`);
        }
      } else if (!r || !(r.inked > 0 && r.moved && r.redrawn)) {
        quiet.push(`${slug} ${JSON.stringify(r)}`);
      }
    }
    check(`${L}: every one of the ${book.length} articles has a figure that draws and whose knob moves it`, book.length > 30 && quiet.length === 0, quiet.join(' | '));
    check(`${L}: the figures without a knob are exactly the two known ones`, JSON.stringify(knobless) === JSON.stringify(KNOBLESS), knobless.join(', '));

    /* Search, and Enter opens the first hit. */
    await page.evaluate("(() => { const s = document.querySelector('#wiki .wiki-search'); s.focus(); s.value = 'motor_pwm_rate'; s.dispatchEvent(new Event('input', { bubbles: true })); })()");
    check(`${L}: searching a setting lists hits`, await page.until("document.querySelectorAll('#wiki .wiki-hit').length > 0", 3000));
    await page.key('Enter', 'Enter', 13);
    check(`${L}: Enter opens the first hit`, await page.until("location.hash.includes('motor_pwm_rate') && /motor_pwm_rate/.test(document.querySelector('#wiki h1').textContent + document.title)", 3000),
      await page.evaluate('location.hash'));

    /* The journey: the arrow key walks to the next page. */
    await page.evaluate("location.hash = '#wiki/start-welcome'");
    await page.until("location.hash === '#wiki/start-welcome' && !!document.querySelector('#wiki .wiki-journey-link.is-next')", 5000);
    const next = await page.evaluate("document.querySelector('#wiki .wiki-journey-link.is-next .wiki-journey-title').textContent");
    await page.evaluate('document.activeElement && document.activeElement.blur()');
    await page.key('ArrowRight', 'ArrowRight', 39);
    check(`${L}: ArrowRight walks the journey to the next page`, await page.until(`document.querySelector('#wiki h1').textContent.trim() === ${SEL(next.trim())}`, 3000), next);
    clean(page, L);
  } finally {
    await page.close();
  }
}

/* ------------------------------------------------------------------ */
/* The patch notes and the slap pack                                    */
/* ------------------------------------------------------------------ */

async function notes(browser, server) {
  const L = 'notes';
  const page = await openPage(browser, server, '/notes/', { width: 1280, height: 860 });
  try {
    check(`${L}: loads with the velocity graph first`, page.loaded && await page.evaluate("!!document.querySelector('#velocity .viz .plots') && document.querySelector('#velocity').compareDocumentPosition(document.querySelector('article, .entry, section:not(#velocity)')) & Node.DOCUMENT_POSITION_FOLLOWING"));
    await page.evaluate("document.querySelector('#velocity .plots').focus()");
    const last = await page.evaluate("document.querySelector('#velocity .plots .sr').textContent");
    await page.key('Home', 'Home', 36);
    await page.sleep(100);
    const first = await page.evaluate("document.querySelector('#velocity .plots .sr').textContent");
    const firstRow = await page.evaluate("[...document.querySelectorAll('#velocity .viz-table tbody tr')].pop().querySelector('th').textContent");
    check(`${L}: focus reads the newest day, Home the first`, last && first && last !== first && first.startsWith(firstRow), `${first.slice(0, 40)} / ${last.slice(0, 40)}`);
    await page.key('ArrowRight', 'ArrowRight', 39);
    await page.sleep(100);
    const second = await page.evaluate("document.querySelector('#velocity .plots .sr').textContent");
    check(`${L}: ArrowRight steps a day`, second !== first, second.slice(0, 40));
    clean(page, L);
  } finally {
    await page.close();
  }
}

async function stickers(browser, server) {
  const L = 'stickers';
  const page = await openPage(browser, server, '/stickers/', { width: 1280, height: 860 });
  try {
    const n = await page.evaluate("document.querySelectorAll('.card[data-key] .art svg').length");
    check(`${L}: twenty two stickers`, page.loaded && n === 22, `${n}`);
    await page.clickOn('.card[data-key]');
    check(`${L}: a sticker opens in the sheet`, await page.until("document.getElementById('modal').classList.contains('open') && document.querySelector('#view svg') && document.getElementById('mtitle').textContent.length > 0", 3000));
    await page.clickOn('#png300');
    check(`${L}: the 300 dpi PNG renders and saves`, await page.until("/^Saved \\d+ × \\d+ px PNG\\.$/.test(document.getElementById('status').textContent)", 20000),
      await page.evaluate("document.getElementById('status').textContent"));
    await page.key('Escape', 'Escape', 27);
    check(`${L}: Escape closes the sheet`, await page.until("!document.getElementById('modal').classList.contains('open')", 2000));
    clean(page, L);
  } finally {
    await page.close();
  }
}

/* ------------------------------------------------------------------ */
/* The run                                                              */
/* ------------------------------------------------------------------ */

async function main() {
  const t0 = Date.now();
  const server = await startServer();
  const browser = await launch();
  const slugs = wikiSample(10);
  const suites = [
    ['index desktop', () => desktop(browser, server)],
    ['index phone', () => phone(browser, server)],
    ['index reduced motion', () => reduced(browser, server)],
    ['index without the CDN or the board', () => degraded(browser, server)],
    ['index without WebGL', () => noWebgl(browser, server)],
    ['wiki', () => wikiLive(browser, server, slugs)],
    ['wiki static pages', () => wikiStatic(browser, server, slugs)],
    ['notes', () => notes(browser, server)],
    ['stickers', () => stickers(browser, server)],
  ];
  const only = process.argv.slice(2).filter((a) => !a.startsWith('-'));
  try {
    for (const [name, run] of suites) {
      if (only.length && !only.some((o) => name.includes(o))) {
        continue;
      }
      console.log(`\n${name}`);
      try {
        await run();
      } catch (e) {
        check(`${name}: ran to the end`, false, e.message.split('\n')[0]);
      }
    }
  } finally {
    await browser.close();
    await server.close();
  }
  console.log(`\n${passed} of ${passed + failed} checks pass in ${((Date.now() - t0) / 1000).toFixed(1)} s${COVERAGE ? `, coverage in ${COVERAGE}` : ''}`);
  if (failed) {
    console.log(`FAIL: ${failures.join('; ')}`);
    process.exitCode = 1;
  }
}

const run = (() => {
  try {
    return fileURLToPath(import.meta.url) === process.argv[1] || import.meta.url.endsWith(process.argv[1]);
  } catch (e) {
    return false;
  }
})();
if (run) {
  await main();
}
