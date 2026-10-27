// Nexus Desk file transactions: all-or-nothing writes with a recovery journal (audit Phase 2: no partial writes).
//
// A transaction stages every write as "<file>.desk-tmp" and renames it into place, after copying the previous version
// of the file into the journal directory. The journal (journal.json) lists every file touched so far. If anything
// fails, rollback() restores the previous versions and removes files that did not exist before. If the process dies
// mid-commit, the journal survives; the next transaction opened on the same root finds it and rolls it back before
// doing anything else (fail closed: a half-applied change is never kept).
//
// Fault injection (tests only): DESK_FAULT is a comma-separated list of points. "<label>:write:<n>" throws on the
// n-th write of a transaction, "crash:<label>:write:<n>" exits the process at that point without rollback (simulated
// crash), and named points passed to fault() throw when listed. Nothing in production sets DESK_FAULT.
import fs from 'node:fs';
import path from 'node:path';

const JOURNAL_DIR = '_txn'; // underscore: never published by the Pages builder, skipped by the published-tree checks
export class TxnError extends Error {}

export function fault(point) {
  const list = (process.env.DESK_FAULT || '').split(',').map(s => s.trim()).filter(Boolean);
  if (list.includes(`crash:${point}`)) { process.stderr.write(`✗ simulated crash at ${point}\n`); process.exit(137); }
  if (list.includes(point)) throw new TxnError(`injected fault at ${point}`);
}

function writeAtomic(dest, data) {
  const tmp = `${dest}.desk-tmp`;
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const fd = fs.openSync(tmp, 'w');
  try { fs.writeSync(fd, typeof data === 'string' ? Buffer.from(data) : data); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
  fs.renameSync(tmp, dest);
}

// Roll back an interrupted transaction left on disk (returns the number of files restored/removed, or 0).
export function recover(root) {
  const dir = path.join(root, JOURNAL_DIR); const jf = path.join(dir, 'journal.json');
  if (!fs.existsSync(dir)) return 0;
  let entries = [];
  try { entries = JSON.parse(fs.readFileSync(jf, 'utf8')).entries || []; } catch { entries = []; }
  for (const e of [...entries].reverse()) {
    const abs = path.join(root, e.rel);
    try { fs.rmSync(`${abs}.desk-tmp`, { force: true }); } catch { /* ignore */ }
    if (e.existed) writeAtomic(abs, fs.readFileSync(path.join(dir, 'backup', String(e.n))));
    else fs.rmSync(abs, { force: true, recursive: true });
  }
  for (const d of [...new Set(entries.flatMap(e => e.createdDirs || []))].sort((a, b) => b.length - a.length)) {
    const abs = path.join(root, d);
    try { if (fs.existsSync(abs) && !fs.readdirSync(abs).length) fs.rmdirSync(abs); } catch { /* not empty: keep */ }
  }
  fs.rmSync(dir, { recursive: true, force: true });
  return entries.length;
}

export class Txn {
  // root: directory every path must live in; label: name used in fault points and messages
  constructor(root, label) {
    this.root = path.resolve(root); this.label = label; this.entries = []; this.n = 0; this.open = true;
    this.recovered = recover(this.root);
    this.dir = path.join(this.root, JOURNAL_DIR);
    fs.mkdirSync(path.join(this.dir, 'backup'), { recursive: true });
    this.flush();
  }
  rel(abs) {
    const r = path.relative(this.root, path.resolve(abs));
    if (!r || r.startsWith('..') || path.isAbsolute(r) || r.split(path.sep)[0] === JOURNAL_DIR) throw new TxnError(`${abs} is outside the transaction root`);
    return r;
  }
  flush() { writeAtomic(path.join(this.dir, 'journal.json'), JSON.stringify({ label: this.label, entries: this.entries }, null, 2)); }
  touch(abs) {
    if (!this.open) throw new TxnError('transaction already closed');
    const rel = this.rel(abs);
    if (this.entries.some(e => e.rel === rel)) return;
    const n = this.entries.length; const existed = fs.existsSync(abs);
    if (existed && fs.statSync(abs).isDirectory()) throw new TxnError(`${rel} is a directory`);
    if (existed) fs.copyFileSync(abs, path.join(this.dir, 'backup', String(n)));
    const createdDirs = []; let d = path.dirname(path.resolve(abs));
    while (d !== this.root && !fs.existsSync(d)) { createdDirs.push(path.relative(this.root, d)); d = path.dirname(d); }
    this.entries.push({ n, rel, existed, createdDirs }); this.flush();
  }
  write(abs, data) {
    this.n++; fault(`${this.label}:write:${this.n}`);
    this.touch(abs); writeAtomic(abs, data);
  }
  copy(src, abs) { this.write(abs, fs.readFileSync(src)); }
  remove(abs) {
    this.n++; fault(`${this.label}:write:${this.n}`);
    if (!fs.existsSync(abs)) return;
    this.touch(abs); fs.rmSync(abs, { force: true });
  }
  commit() { fault(`${this.label}:commit`); fs.rmSync(this.dir, { recursive: true, force: true }); this.open = false; }
  rollback() { if (!this.open) return; recover(this.root); this.open = false; }
}

// Run fn(txn); commit on success, roll back on any error (and re-throw).
export function withTxn(root, label, fn) {
  const t = new Txn(root, label);
  try { const r = fn(t); t.commit(); return r; }
  catch (e) { t.rollback(); throw e; }
}
