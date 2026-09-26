/*
 * vendor.js: copy the simulator's own code into src/sim/, laid out exactly
 * as the simulator lays it out under src/.
 *
 *   node scripts/vendor.js ../WebFPVSimulator
 *
 * WHY A MIRROR AND NOT A FOLDER PER THING. The town used to live at
 * src/city/vendored/ and nothing else of the simulator's was here. The
 * freestyle story needs the simulator's asset library and its built map
 * drawing as well, and those import the town's kit by relative path
 * (src/props/kit.js asks for ../maps/city/vendored/core/toon.js). Put them
 * anywhere but where the simulator puts them and every one of those imports
 * has to be rewritten, which turns a copy into an edit. Laid out as the
 * simulator lays itself out, every file arrives byte for byte and every
 * import resolves.
 *
 * WHAT IS COPIED, and nothing else:
 *
 *   WHOLE    src/maps/city/vendored/, the town: sakura-crossing, MIT, with
 *            its LICENSE and its PATCH files. NOTICE requires the whole
 *            directory, so the two can never drift a file at a time.
 *   CLOSURE  every module the entries below import, followed through their
 *            relative imports (static, re-exports and dynamic import()).
 *            'three' and its addons come from the page's import map and are
 *            not followed.
 *
 * Files under src/sim/ that the copy no longer produces are deleted, so a
 * module the simulator dropped does not linger here.
 *
 * THE MANIFEST, src/sim/MANIFEST.json, records the simulator's commit, and
 * whether its tree was clean, and the SHA-256 of every file copied.
 * scripts/page-lint.js checks the directory against it, which is what makes
 * "recopy, do not edit" something a check can see. Regenerate, do not edit.
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

import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, readdir, rm, writeFile, stat } from 'node:fs/promises';
import { dirname, join, posix, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const OUT = join(root, 'src/sim');

/* Copied whole: directories under the simulator's src/. */
const WHOLE = ['maps/city/vendored'];

/* Followed through their imports: modules under the simulator's src/. */
const ENTRIES = [
  'maps/city/vendored/world/index.js',
  'maps/city/bake.js',
];

/* Relative specifiers in a module: static imports, re-exports, and dynamic
 * import() with a string literal. */
const SPEC = /(?:^|[\n;])\s*(?:import|export)\s[^;]*?\sfrom\s*['"]([^'"]+)['"]|(?:^|[\n;])\s*import\s*['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g;

export function relativeImports(source) {
  const out = [];
  let m;
  SPEC.lastIndex = 0;
  while ((m = SPEC.exec(source))) {
    const spec = m[1] || m[2] || m[3];
    if (spec && (spec.startsWith('./') || spec.startsWith('../'))) {
      out.push(spec);
    }
  }
  return out;
}

async function walkDir(dir, base = dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) {
      out.push(...await walkDir(p, base));
    } else {
      out.push(relative(base, p).split('\\').join('/'));
    }
  }
  return out;
}

const sha = (buf) => createHash('sha256').update(buf).digest('hex');

async function main() {
  const simRoot = resolve(process.argv[2] ?? '../WebFPVSimulator');
  const src = join(simRoot, 'src');
  await stat(src);

  /* Everything to copy, as paths relative to the simulator's src/. */
  const want = new Set();
  for (const dir of WHOLE) {
    for (const f of await walkDir(join(src, dir))) {
      want.add(posix.join(dir, f));
    }
  }
  const queue = [...ENTRIES];
  const seen = new Set();
  while (queue.length) {
    const rel = queue.shift();
    if (seen.has(rel)) {
      continue;
    }
    seen.add(rel);
    want.add(rel);
    const text = await readFile(join(src, rel), 'utf8');
    for (const spec of relativeImports(text)) {
      const next = posix.normalize(posix.join(posix.dirname(rel), spec));
      if (next.startsWith('..')) {
        throw new Error(`${rel} imports ${spec}, which is outside the simulator's src/`);
      }
      queue.push(next);
    }
  }

  /* Copy, and hash on the way. */
  const files = {};
  for (const rel of [...want].sort()) {
    const buf = await readFile(join(src, rel));
    const to = join(OUT, rel);
    await mkdir(dirname(to), { recursive: true });
    await writeFile(to, buf);
    files[rel] = sha(buf);
  }

  /* And nothing the copy did not produce. */
  let removed = 0;
  try {
    for (const rel of await walkDir(OUT)) {
      if (rel !== 'MANIFEST.json' && !(rel in files)) {
        await rm(join(OUT, rel));
        removed += 1;
      }
    }
  } catch (e) {
    /* A first copy: there was nothing here to prune. */
  }

  let commit = 'unknown';
  let clean = false;
  try {
    commit = execFileSync('git', ['-C', simRoot, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
    clean = execFileSync('git', ['-C', simRoot, 'status', '--porcelain', '--', 'src'], { encoding: 'utf8' }).trim() === '';
  } catch (e) {
    /* Not a git checkout. The manifest says so rather than guessing. */
  }
  const manifest = {
    note: 'Copied from Mathew-Harvey/WebFPVSimulator by scripts/vendor.js. Regenerate, do not edit: scripts/page-lint.js checks every file here against its hash.',
    from: 'Mathew-Harvey/WebFPVSimulator',
    commit,
    clean,
    whole: WHOLE,
    entries: ENTRIES,
    files,
  };
  await writeFile(join(OUT, 'MANIFEST.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`vendor: ${Object.keys(files).length} files from ${commit.slice(0, 12)}${clean ? '' : ' (with uncommitted changes under src/)'}, ${removed} removed`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => {
    console.error(`vendor: ${e.message}`);
    process.exit(1);
  });
}
