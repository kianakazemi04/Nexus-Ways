#!/usr/bin/env node
// Private store snapshot (owner decision 29 Oct 2026: project material is sent in the chat and kept in the owner's
// Claude project, not in a separate repository). A working session builds its store outside this repository; at the end
// of a session the store's text records (data/*.json, private/**, reports/**) are packed into one JSON file that is saved
// to the Claude project (nexus-desk/private/store/…). The next session unpacks it into a new folder outside the
// repository and continues. Images and raw documents are not packed: originals stay with the owner (the chat), and
// published media are already in the public tree.
//   node desk/_tools/storepack.mjs pack   --store <dir> --out <file.json>
//   node desk/_tools/storepack.mjs unpack --in <file.json> --store <new dir>
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const PACK_VERSION = 'STP-1';
const TEXT = /\.(json|md|txt|csv)$/i;
const SKIP = (rel) => /(^|\/)(_txn|_lock\.json|media\/|raw\/)/.test(rel);
const inside = (child, parent) => { const r = path.relative(parent, child); return r === '' || (!r.startsWith('..') && !path.isAbsolute(r)); };
const real = (p) => { try { return fs.realpathSync(p); } catch { return path.resolve(p); } };

function assertOutsideRepo(dir) {
  const d = real(dir);
  if (inside(d, real(REPO)) || inside(real(REPO), d)) throw new Error(`refused: ${dir} is inside (or contains) the public repository`);
}

export function pack(storeDir) {
  assertOutsideRepo(storeDir);
  const files = {};
  for (const rel of fs.readdirSync(storeDir, { recursive: true }).map(String).map(f => f.split(path.sep).join('/')).sort()) {
    const abs = path.join(storeDir, rel);
    if (!fs.statSync(abs).isFile() || SKIP(rel) || !TEXT.test(rel)) continue;
    files[rel] = fs.readFileSync(abs, 'utf8');
  }
  const body = JSON.stringify(files);
  return { version: PACK_VERSION, note: 'PRIVATE — Nexus Desk research store snapshot. Never commit to the public repository.', files_count: Object.keys(files).length, sha256: crypto.createHash('sha256').update(body).digest('hex'), files };
}

export function unpack(bundle, storeDir) {
  assertOutsideRepo(storeDir);
  if (!bundle || bundle.version !== PACK_VERSION || typeof bundle.files !== 'object') throw new Error('not a store snapshot (STP-1)');
  if (crypto.createHash('sha256').update(JSON.stringify(bundle.files)).digest('hex') !== bundle.sha256) throw new Error('snapshot checksum mismatch — file damaged or edited');
  if (fs.existsSync(storeDir) && fs.readdirSync(storeDir).length) throw new Error(`refused: ${storeDir} is not empty`);
  for (const [rel, text] of Object.entries(bundle.files)) {
    const abs = path.resolve(storeDir, rel);
    if (!inside(abs, path.resolve(storeDir)) || !TEXT.test(rel)) throw new Error(`refused path in snapshot: ${rel}`);
    fs.mkdirSync(path.dirname(abs), { recursive: true }); fs.writeFileSync(abs, text);
  }
  return Object.keys(bundle.files).length;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const [cmd, ...rest] = process.argv.slice(2); const arg = (k) => { const i = rest.indexOf(k); return i >= 0 ? rest[i + 1] : null; };
  try {
    if (cmd === 'pack' && arg('--store') && arg('--out')) {
      if (inside(path.resolve(arg('--out')), REPO)) throw new Error('refused: the snapshot must not be written inside the public repository');
      const b = pack(arg('--store')); fs.writeFileSync(arg('--out'), JSON.stringify(b, null, 1) + '\n'); console.log(`packed ${b.files_count} files → ${arg('--out')}`);
    } else if (cmd === 'unpack' && arg('--in') && arg('--store')) {
      console.log(`restored ${unpack(JSON.parse(fs.readFileSync(arg('--in'), 'utf8')), arg('--store'))} files → ${arg('--store')}`);
    } else { console.log('usage: storepack.mjs pack --store <dir> --out <file> | unpack --in <file> --store <new dir>'); process.exit(2); }
  } catch (e) { console.error(`✗ ${e.message}`); process.exit(1); }
}
