/*
 * og.js: the share card, drawn by the page it advertises.
 *
 * A link to webfpv.org posted anywhere renders a 1200 by 630 picture, and
 * this is it: the first screen, the manga page, as a visitor gets it once
 * the quad has built itself, drawn by the page itself in headless Chromium.
 * It replaced a composed card, the mark and the tagline beside a frame of
 * the race field, on the owner's ask of 2026-09-27: a front door that opens
 * as a manga page is shared as one, and a picture of the page cannot
 * disagree with the page the way a drawing of it can.
 *
 * WHAT THE FRAME IS. The top of the page, T = 0, after the opening build has
 * played to the end and the pilot sticker has landed. Not a pinned frame:
 * ?t= stops the build's own clock, so a pinned T = 0 is an empty studio. So
 * the capture waits on what the page SHOWS, never on a clock, because on a
 * software rasteriser a frame takes a tenth of a second or more and the
 * build's nine seconds are at least a hundred and eighty frames (main.js
 * clamps a frame's step to 50 ms). It waits for the build order to read
 * seven of seven with its rail full, every title on screen lettered, every
 * picture on screen decoded, the paper up, and the slap finished.
 *
 * WHY IT IS LAID OUT WIDER THAN IT IS SAVED. The page is laid out at LAYOUT_W
 * by the card's shape, which is a spread, the manga page's wide shape, and
 * drawn at twice the card's pixels and brought down, so the ink lines round
 * the quad and the panels are smooth rather than stepped. The page is sized
 * in hundredths of the short side and the top bar and the build order in
 * pixels, tuned at 1440, so the narrower the layout the more of the frame
 * the chrome takes; 1600 by 840 is a laptop's proportions, where it sits as
 * tuned.
 *
 * WHY A JPEG. The frame as a PNG is close to six hundred kilobytes, most of
 * it the three chapter pictures, and WhatsApp is widely reported to drop a
 * preview picture much past three hundred. At quality 0.92 it is about a
 * quarter of that and the ink lines and the lettering come through clean.
 * The board's cards for a track or a map are JPEGs too.
 *
 * WHAT IT SEEDS, through the doors a visitor has: the invitation marked as
 * seen, as it is for anybody who has been before, because a card with a
 * dialog over it is a card of the dialog; and Global Privacy Control on, so
 * src/stats.js sends nothing and a regeneration is never counted as a
 * partner's mark seen. Anything that is neither this server nor the three.js
 * CDN is refused outright as well. And the media the machine might ask for
 * are pinned to the ordinary ones: reduced motion puts the film in act three
 * and forced colours takes the lettering off, and either would be a card of
 * the regenerating machine's settings rather than of the page.
 *
 * WHAT CHANGES WITH THE MACHINE. Chromium draws in software, SwiftShader,
 * everywhere, so the studio is the same studio whoever regenerates it. The
 * type is not: the page ships no font and its stack starts at system-ui, and
 * the lettering is that same stack at its heaviest. Drawn on Windows the card
 * is in Segoe UI, as the owner sees the page; drawn in a bare Linux container
 * it is in DejaVu Sans, which is what the card of 2026-09-27 was drawn in.
 *
 * REGENERATE, DO NOT EDIT, the rule the icons and the stickers have:
 *
 *     node scripts/og.js
 *
 * and commit what it changed. It writes og.jpg, moves the ?v= on every page
 * that names it to the new card's hash (see the end of this file) and
 * regenerates the wiki's articles, and it prints the Sharing Debugger's
 * address for Facebook to fetch the card again once the site has it. On
 * Windows it finds Chrome or Edge where they install; anywhere else that
 * they are not, SIM_CHROME_BIN names the binary. npm run lint:page fails
 * while any page names another address, size or description, or an address
 * that is not the card's own.
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
import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { handle } from './serve.js';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const OUT = join(root, 'og.jpg');

/* Facebook, X and LinkedIn all read 1.91:1 and all crop anything else. */
const CARD_W = 1200;
const CARD_H = 630;
const LAYOUT_W = 1600;
const LAYOUT_H = Math.round((LAYOUT_W * CARD_H) / CARD_W);
const SUPER = 2;
const QUALITY = 0.92;

/* The import map's CDN, which the page cannot start without. */
const CDN = 'https://cdn.jsdelivr.net/';

/* Every file that names the card, the wiki's articles through the last. */
const NAMED_IN = ['index.html', 'wiki/index.html', 'notes/index.html', 'stickers/index.html', 'scripts/generate-wiki-pages.js'];
const DEBUGGER = 'https://developers.facebook.com/tools/debug/?q=https%3A%2F%2Fwebfpv.org%2F';

/* The simulator's harness looks in the same places, and reads the same
 * variable, so one setting points both at a browser. */
const programs = process.env.ProgramFiles || 'C:\\Program Files';
const programs86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';
const CHROME = [
  process.env.SIM_CHROME_BIN,
  '/opt/pw-browsers/chromium',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  join(programs, 'Google', 'Chrome', 'Application', 'chrome.exe'),
  join(programs86, 'Google', 'Chrome', 'Application', 'chrome.exe'),
  process.env.LOCALAPPDATA ? join(process.env.LOCALAPPDATA, 'Google', 'Chrome', 'Application', 'chrome.exe') : null,
  join(programs86, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
  join(programs, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
].find((p) => p && existsSync(p));

/*
 * Run before the first line of the page, in every document it opens. The
 * key is the invitation's own, from its script in index.html.
 */
const SEED = `
try { localStorage.setItem('webfpv.invite.seen', String(Date.now())); } catch (e) {}
Object.defineProperty(Navigator.prototype, 'globalPrivacyControl', { get: () => true, configurable: true });
`;

/*
 * What "built and settled" looks like from the outside, one test per thing
 * the capture waits for, each written against what the page puts on screen
 * rather than against its internals, which it only exposes under ?debug.
 */
const onScreen = `((n) => {
  const r = n.getBoundingClientRect();
  return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth;
})`;
/*
 * The build's test reads the rail as a number: main.js writes 100.0% and the
 * browser hands back 100%, and a test that compared the strings waited five
 * minutes for a quad that had finished at ninety seconds.
 */
const WAITS = [
  ['the boot screen to lift',
    `document.readyState === 'complete' && !document.getElementById('boot')`],
  ['the quad to build',
    `(() => {
      const n = document.getElementById('tick-count').textContent.trim().match(/^(\\d+) \\/ (\\d+)$/);
      return Boolean(n) && n[1] === n[2] && Number.parseFloat(document.getElementById('tick-fill').style.width) >= 100;
    })()`,
    `document.getElementById('tick-count').textContent.trim()`],
  ['the titles to be lettered',
    `[...document.querySelectorAll('.is-lettered')]
      .every((h) => !${onScreen}(h) || h.querySelector(':scope > .lettered-art'))`],
  ['the pictures to decode',
    `document.fonts.status === 'loaded'
      && [...document.images].every((i) => !${onScreen}(i) || (i.complete && i.naturalWidth > 0))`],
  ['the paper',
    `document.body.classList.contains('on-paper')`],
  ['the opening sticker to land',
    `[...document.querySelectorAll('.slap[data-on="0"]')]
      .every((s) => s.classList.contains('on') && s.childElementCount > 0 && s.getAnimations().length === 0)`],
];

/* Brought down to the card in the page, which has a better resampler than
 * anything this repository could ship without a dependency. */
const shrink = (b64) => `(async () => {
  const blob = await (await fetch('data:image/png;base64,${b64}')).blob();
  const bmp = await createImageBitmap(blob, { resizeWidth: ${CARD_W}, resizeHeight: ${CARD_H}, resizeQuality: 'high' });
  const c = new OffscreenCanvas(${CARD_W}, ${CARD_H});
  c.getContext('2d').drawImage(bmp, 0, 0);
  const bytes = new Uint8Array(await (await c.convertToBlob({ type: 'image/jpeg', quality: ${QUALITY} })).arrayBuffer());
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(s);
})()`;

if (!CHROME) {
  console.error('og.js: no Chromium found. Set SIM_CHROME_BIN to a Chrome, Chromium or Edge binary.');
  process.exit(1);
}

const server = http.createServer(handle);
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const profile = await mkdtemp(join(tmpdir(), 'webfpv-og-'));

/*
 * The DevTools protocol over a pipe rather than a socket: no port to find
 * and no WebSocket, which Node before 22 does not have. Messages are JSON,
 * each ended by a NUL, the browser reading fd 3 and writing fd 4.
 */
const chrome = spawn(CHROME, [
  '--headless=new',
  '--no-sandbox',
  '--use-angle=swiftshader',
  '--enable-unsafe-swiftshader',
  '--disable-dev-shm-usage',
  '--no-first-run',
  '--no-default-browser-check',
  '--hide-scrollbars',
  '--mute-audio',
  `--window-size=${LAYOUT_W},${LAYOUT_H}`,
  '--remote-debugging-pipe',
  `--user-data-dir=${profile}`,
  'about:blank',
], { stdio: ['ignore', 'ignore', 'pipe', 'pipe', 'pipe'] });

let stderr = '';
chrome.stderr.on('data', (d) => {
  stderr = (stderr + d).slice(-4000);
});

let nextId = 1;
let dead = null;
const pending = new Map();
const listeners = [];
const die = (e) => {
  if (!dead) {
    dead = e;
    for (const p of pending.values()) {
      p.reject(e);
    }
    pending.clear();
  }
};
chrome.on('error', (e) => die(new Error(`Chromium did not start: ${e.message}`)));
chrome.on('exit', (code) => die(new Error(`Chromium exited with ${code}: ${stderr.slice(-1500)}`)));

let parts = [];
chrome.stdio[4].on('data', (chunk) => {
  let at = chunk.indexOf(0);
  while (at >= 0) {
    parts.push(chunk.subarray(0, at));
    const msg = JSON.parse(Buffer.concat(parts).toString('utf8'));
    parts = [];
    if (msg.id && pending.has(msg.id)) {
      const p = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) {
        p.reject(new Error(`${p.method}: ${msg.error.message}`));
      } else {
        p.resolve(msg.result);
      }
    } else if (msg.method) {
      for (const l of listeners) {
        l(msg);
      }
    }
    chunk = chunk.subarray(at + 1);
    at = chunk.indexOf(0);
  }
  if (chunk.length) {
    parts.push(chunk);
  }
});

function send(method, params = {}, sessionId = undefined) {
  if (dead) {
    return Promise.reject(dead);
  }
  const id = nextId;
  nextId += 1;
  chrome.stdio[3].write(`${JSON.stringify({ id, method, params, sessionId })}\0`);
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject, method }));
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let card = null;
const errors = [];
const refused = new Set();
const cdnCache = new Map();

try {
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  const tab = (method, params) => send(method, params, sessionId);

  listeners.push(async (msg) => {
    if (msg.sessionId !== sessionId) {
      return;
    }
    if (msg.method === 'Runtime.exceptionThrown') {
      const d = msg.params.exceptionDetails;
      errors.push(`uncaught: ${d.exception ? d.exception.description || d.exception.value : d.text}`);
    } else if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
      errors.push(`console.error: ${msg.params.args.map((a) => a.value ?? a.description).join(' ')}`);
    } else if (msg.method === 'Fetch.requestPaused') {
      const { requestId, request } = msg.params;
      try {
        if (request.url.startsWith(`${origin}/`)) {
          await tab('Fetch.continueRequest', { requestId });
        } else if (request.url.startsWith(CDN)) {
          /* The container this was written in gives Node the proxy and not
           * Chromium, so the CDN is fetched here and handed over. */
          if (!cdnCache.has(request.url)) {
            const res = await fetch(request.url);
            if (!res.ok) {
              throw new Error(`${res.status}`);
            }
            cdnCache.set(request.url, Buffer.from(await res.arrayBuffer()).toString('base64'));
          }
          await tab('Fetch.fulfillRequest', {
            requestId,
            responseCode: 200,
            responseHeaders: [
              { name: 'content-type', value: 'text/javascript; charset=utf-8' },
              { name: 'access-control-allow-origin', value: '*' },
            ],
            body: cdnCache.get(request.url),
          });
        } else {
          refused.add(new URL(request.url).host);
          await tab('Fetch.failRequest', { requestId, errorReason: 'BlockedByClient' });
        }
      } catch (e) {
        errors.push(`fetch ${request.url}: ${e.message}`);
        await tab('Fetch.failRequest', { requestId, errorReason: 'Failed' }).catch(() => {});
      }
    }
  });

  await tab('Runtime.enable');
  await tab('Page.enable');
  await tab('Fetch.enable', { patterns: [{ urlPattern: '*' }] });
  await tab('Emulation.setDeviceMetricsOverride', {
    width: LAYOUT_W, height: LAYOUT_H, deviceScaleFactor: (CARD_W * SUPER) / LAYOUT_W, mobile: false,
  });
  await tab('Emulation.setEmulatedMedia', {
    features: [
      { name: 'prefers-reduced-motion', value: 'no-preference' },
      { name: 'forced-colors', value: 'none' },
    ],
  });
  await tab('Page.addScriptToEvaluateOnNewDocument', { source: SEED });
  await tab('Page.navigate', { url: `${origin}/` });

  const evaluate = async (expression) => {
    const r = await tab('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) {
      throw new Error(r.exceptionDetails.exception ? r.exceptionDetails.exception.description : r.exceptionDetails.text);
    }
    return r.result.value;
  };

  const started = Date.now();
  const clock = () => `${((Date.now() - started) / 1000).toFixed(1)} s`;
  for (const [what, test, say] of WAITS) {
    console.log(`waiting for ${what}`);
    const deadline = Date.now() + 5 * 60 * 1000;
    let said = Date.now();
    for (;;) {
      if (await evaluate(test).catch(() => false)) {
        break;
      }
      if (say && Date.now() - said > 10000) {
        said = Date.now();
        console.log(`  ${await evaluate(say).catch(() => '?')} at ${clock()}`);
      }
      if (await evaluate(`document.getElementById('nowebgl')?.classList.contains('on')`).catch(() => false)) {
        throw new Error('the page says it has no WebGL, so there is no studio to draw');
      }
      if (Date.now() > deadline) {
        throw new Error(`gave up waiting for ${what}`);
      }
      await sleep(250);
    }
    console.log(`  done at ${clock()}`);
  }

  /* A few frames more, so the canvas has drawn the state the DOM reports and
   * a title lettered on the last resize has had its settle. */
  await evaluate(`new Promise((done) => {
    let n = 0;
    const tick = () => (++n >= 8 ? setTimeout(() => done(true), 300) : requestAnimationFrame(tick));
    requestAnimationFrame(tick);
  })`);

  const shot = await tab('Page.captureScreenshot', { format: 'png' });
  card = Buffer.from(await evaluate(shrink(shot.data)), 'base64');
  await writeFile(OUT, card);
  console.log(`og.jpg ${CARD_W} x ${CARD_H}, ${(card.length / 1024).toFixed(0)} KB -> ${OUT}`);
} catch (e) {
  /* og.jpg is only written after the last wait, so a failed run leaves the
   * card that was there. */
  console.error(`og.js: ${e.message}. og.jpg is unchanged.`);
  process.exitCode = 1;
} finally {
  /* Gone before its profile is removed, because Windows will not delete a
   * file a live process holds. */
  if (chrome.exitCode === null && chrome.signalCode === null) {
    const gone = new Promise((r) => chrome.once('exit', r));
    chrome.kill();
    await Promise.race([gone, sleep(5000)]);
  }
  server.closeAllConnections?.();
  server.close();
  await rm(profile, { recursive: true, force: true }).catch(() => {});
}

if (refused.size) {
  console.log(`refused, as it should be: ${[...refused].join(', ')}`);
}
if (errors.length) {
  console.log(`the page reported:\n  ${errors.join('\n  ')}`);
}

/*
 * THE ADDRESS IS THE PICTURE'S OWN. Facebook and X keep a picture by its
 * address and the edge keeps it for four hours, so a new card has to go out
 * at a new one, and the surest new address is the card's own hash: a redraw
 * that changes a pixel moves it, and one that changes nothing leaves it
 * where it was. So the run ends by writing it into every page that names the
 * card and regenerating the wiki's articles from their template, and what is
 * left is to commit and push. npm run lint:page holds every page to it.
 */
if (card) {
  const stamp = createHash('sha256').update(card).digest('hex').slice(0, 8);
  for (const rel of NAMED_IN) {
    const was = await readFile(join(root, rel), 'utf8');
    const now = was.replace(/og\.jpg\?v=[0-9a-z]+/g, `og.jpg?v=${stamp}`);
    if (now !== was) {
      await writeFile(join(root, rel), now);
    }
  }
  const wiki = spawnSync(process.execPath, [join(root, 'scripts', 'generate-wiki-pages.js')], {
    cwd: root, stdio: ['ignore', 'ignore', 'inherit'],
  });
  if (wiki.status === 0) {
    console.log(`og.jpg?v=${stamp} on every page, the wiki's articles regenerated`);
    console.log(`next: npm run lint:page, commit, push, and once the site has it, Scrape Again at\n  ${DEBUGGER}`);
  } else {
    console.error(`og.js: the wiki's generator failed, so its articles still name the old address. Run npm run build:wiki.`);
    process.exitCode = 1;
  }
}
