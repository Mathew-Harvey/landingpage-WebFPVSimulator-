/*
 * serve.js: a static file server for local development, with no
 * dependencies, because the page it serves has none either.
 *
 * ES modules will not load from file://, so the page needs a server even
 * though it is a pile of static files. This is that server and nothing more:
 * it does not watch, it does not reload, and it does not build.
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
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PORT || 8080);
const HOST = process.env.HOST || '127.0.0.1';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
};

/*
 * The handler on its own, because scripts/og.js serves the page to a
 * headless browser to draw the share card, and a card drawn off a second
 * server with its own idea of a MIME type is a card of a different page:
 * an SVG sent as octet-stream is an empty box in an <img>, and the partners'
 * marks are SVGs.
 */
export function handle(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  let rel = decodeURIComponent(url.pathname);
  if (rel.endsWith('/')) {
    rel += 'index.html';
  }
  const file = path.join(ROOT, rel);
  /* Nothing outside the repo, whatever the path says. */
  if (!file.startsWith(ROOT)) {
    res.writeHead(403).end('no');
    return;
  }
  fs.readFile(file, (err, buf) => {
    if (err) {
      res.writeHead(404, { 'content-type': 'text/plain' }).end('404');
      return;
    }
    res.writeHead(200, {
      'content-type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'cache-control': 'no-cache',
    }).end(buf);
  });
}

/*
 * Run, it listens. Imported, it only hands over the handler. Both sides
 * through realpath, because Node resolves the module it runs through
 * symlinks and junctions and argv keeps the path as typed, and a checkout
 * under a link would otherwise make npm run serve exit having served
 * nothing.
 */
const run = (() => {
  try {
    return Boolean(process.argv[1]) && fs.realpathSync(process.argv[1]) === fileURLToPath(import.meta.url);
  } catch (e) {
    return false;
  }
})();
if (run) {
  http.createServer(handle).listen(PORT, HOST, () => {
    console.log(`landing page on http://${HOST}:${PORT}/`);
  });
}
