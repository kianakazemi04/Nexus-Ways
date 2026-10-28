// Nexus Desk file transactions: all-or-nothing writes with a recovery journal, plus a store-level lock.
//
// Transactions. Every write is staged as "<file>.desk-tmp" and renamed into place, after the previous version of the
// file has been copied into the journal directory (_txn/). The journal lists each file touched, with the content hash
// before and after the write. On any failure rollback() restores the previous versions and removes files that did
// not exist before. If the process dies mid-commit, the journal survives and the next command rolls it back first.
//
// Safe recovery. Recovery only restores a file whose current content is exactly what the interrupted transaction left
// (its "after" hash) or still the original (its "before" hash). If anything else changed the file since — a newer
// operation or a manual edit — recovery refuses and keeps the journal, so it can never overwrite newer content with
// stale content. That situation needs a person to look at it.
//
// Lock. Commands that change a store or the public tree hold "_lock.json" in that directory for their whole run (read,
// decide, write). A second command on the same directory fails clearly instead of racing. A lock left by a process
// that no longer runs on this machine is detected as stale and cleared; a lock from another machine or a live process
// is never broken automatically (`ingest.mjs unlock --store <dir> --force` after checking).
//
// Filesystem safety. Paths must resolve inside the transaction root; symbolic links on the way to a target (or as the
// target) are refused, so a write can never be redirected outside the root.
//
// Fault injection (tests only): DESK_FAULT is a comma-separated list. "<label>:write:<n>" throws before the n-th write,
// "<label>:rename:<n>" throws after the n-th temporary file is written but before it is renamed into place, and the
// prefix "crash:" exits the process at that point without any rollback. Nothing in normal use sets DESK_FAULT.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';

const JOURNAL_DIR = '_txn'; // underscore: never published by the Pages builder, skipped by the published-tree checks
const LOCK_FILE = '_lock.json';
export class TxnError extends Error {}
export class LockError extends Error {}
export class RecoveryConflictError extends Error {}

export function fault(point) {
  const list = (process.env.DESK_FAULT || '').split(',').map(s => s.trim()).filter(Boolean);
  if (list.includes(`crash:${point}`)) { process.stderr.write(`✗ simulated crash at ${point}\n`); process.exit(137); }
  if (list.includes(point)) throw new TxnError(`injected fault at ${point}`);
}
const hashOf = (p) => { try { return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex'); } catch (e) { if (e.code === 'ENOENT') return null; throw e; } };
const realRoot = (root) => { const r = path.resolve(root); try { return fs.realpathSync.native(r); } catch { return r; } };

function writeAtomic(dest, data, faultPoint = null) {
  const tmp = `${dest}.desk-tmp`;
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  try { if (fs.lstatSync(tmp)) fs.rmSync(tmp, { force: true }); } catch { /* none */ }
  const fd = fs.openSync(tmp, 'wx');
  try { fs.writeSync(fd, typeof data === 'string' ? Buffer.from(data) : data); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
  if (faultPoint) fault(faultPoint);
  fs.renameSync(tmp, dest);
}

// ------------------------------------------------------------ lock
const HELD = new Map(); // resolved root → depth (re-entrant within one process)
const pidAlive = (pid) => { try { process.kill(pid, 0); return true; } catch (e) { return e.code === 'EPERM'; } };
export function readLock(root) { try { return JSON.parse(fs.readFileSync(path.join(realRoot(root), LOCK_FILE), 'utf8')); } catch { return null; } }
export function lockIsStale(l) { return !!l && l.host === os.hostname() && !pidAlive(l.pid); }
export function acquireLock(root, label) {
  const r = realRoot(root);
  if (HELD.has(r)) { HELD.set(r, HELD.get(r) + 1); return { root: r, clearedStale: false }; }
  fs.mkdirSync(r, { recursive: true });
  const f = path.join(r, LOCK_FILE); let clearedStale = false;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const fd = fs.openSync(f, 'wx');
      fs.writeSync(fd, JSON.stringify({ pid: process.pid, host: os.hostname(), label, started_at: new Date().toISOString() })); fs.closeSync(fd);
      HELD.set(r, 1); return { root: r, clearedStale };
    } catch (e) {
      if (e.code !== 'EEXIST') throw e;
      const l = readLock(r);
      if (attempt === 0 && lockIsStale(l)) { fs.rmSync(f, { force: true }); clearedStale = true; continue; }
      throw new LockError(`another Nexus Desk operation holds the lock on ${r} (${l ? `${l.label}, pid ${l.pid} on ${l.host}, since ${l.started_at}` : 'unreadable lock file'}). Wait for it to finish; if it is certainly not running, run: node desk/_tools/ingest.mjs unlock --store <dir> --force`);
    }
  }
  throw new LockError(`could not acquire the lock on ${r}`);
}
export function releaseLock(root) {
  const r = realRoot(root); const d = HELD.get(r); if (!d) return;
  if (d > 1) { HELD.set(r, d - 1); return; }
  HELD.delete(r);
  const l = readLock(r); if (l && l.pid === process.pid && l.host === os.hostname()) fs.rmSync(path.join(r, LOCK_FILE), { force: true });
}
export function withLock(root, label, fn) { acquireLock(root, label); try { return fn(); } finally { releaseLock(root); } }
export function forceUnlock(root) { const f = path.join(realRoot(root), LOCK_FILE); const l = readLock(root); fs.rmSync(f, { force: true }); return l; }

// ------------------------------------------------------------ recovery
// Roll back an interrupted transaction left on disk. Returns the number of journal entries handled (0 if none).
export function recover(root) {
  const r = realRoot(root);
  const dir = path.join(r, JOURNAL_DIR); const jf = path.join(dir, 'journal.json');
  if (!fs.existsSync(dir)) return 0;
  const l = readLock(r);
  if (l && !HELD.has(r) && !lockIsStale(l)) throw new LockError(`an operation is in progress on ${r} (${l.label}, pid ${l.pid}); not recovering underneath it`);
  let entries = [];
  try { entries = JSON.parse(fs.readFileSync(jf, 'utf8')).entries || []; } catch { entries = []; }
  // safety check first: never overwrite content that changed after the interrupted transaction
  for (const e of entries) {
    const cur = hashOf(path.join(r, e.rel));
    const ok = cur === e.before || (e.after !== undefined && cur === e.after);
    if (!ok) throw new RecoveryConflictError(`${e.rel} changed after the interrupted operation (${l ? l.label : 'unknown'}); recovery refused to avoid overwriting newer content. Inspect ${dir} manually.`);
  }
  for (const e of [...entries].reverse()) {
    const abs = path.join(r, e.rel);
    try { fs.rmSync(`${abs}.desk-tmp`, { force: true }); } catch { /* ignore */ }
    if (e.existed) writeAtomic(abs, fs.readFileSync(path.join(dir, 'backup', String(e.n))));
    else fs.rmSync(abs, { force: true });
  }
  for (const d of [...new Set(entries.flatMap(e => e.createdDirs || []))].sort((a, b) => b.length - a.length)) {
    const abs = path.join(r, d);
    try { if (fs.existsSync(abs) && !fs.readdirSync(abs).length) fs.rmdirSync(abs); } catch { /* not empty: keep */ }
  }
  fs.rmSync(dir, { recursive: true, force: true });
  if (l && !HELD.has(r) && lockIsStale(l)) fs.rmSync(path.join(r, LOCK_FILE), { force: true }); // the crashed holder's lock
  return entries.length;
}

// ------------------------------------------------------------ transaction
export class Txn {
  // root: directory every path must live in; label: name used in fault points and messages
  constructor(root, label) {
    this.root = realRoot(root); this.label = label; this.entries = []; this.n = 0; this.open = true;
    this.recovered = recover(this.root);
    this.dir = path.join(this.root, JOURNAL_DIR);
    fs.mkdirSync(path.join(this.dir, 'backup'), { recursive: true });
    this.flush();
  }
  rel(abs) {
    const r = path.relative(this.root, path.resolve(abs));
    if (!r || r.startsWith('..') || path.isAbsolute(r) || r.split(path.sep)[0] === JOURNAL_DIR || r === LOCK_FILE) throw new TxnError(`${abs} is outside the transaction root`);
    // no symbolic link anywhere between the root and the target (the target included)
    let cur = this.root;
    for (const seg of r.split(path.sep)) {
      cur = path.join(cur, seg);
      let st = null; try { st = fs.lstatSync(cur); } catch { break; }
      if (st.isSymbolicLink()) throw new TxnError(`${path.relative(this.root, cur)} is a symbolic link; refusing to write through it`);
    }
    return r;
  }
  flush() { writeAtomic(path.join(this.dir, 'journal.json'), JSON.stringify({ label: this.label, entries: this.entries }, null, 2)); }
  touch(abs) {
    if (!this.open) throw new TxnError('transaction already closed');
    const rel = this.rel(abs);
    const ex = this.entries.find(e => e.rel === rel); if (ex) return ex;
    const n = this.entries.length; const existed = fs.existsSync(abs);
    if (existed && fs.statSync(abs).isDirectory()) throw new TxnError(`${rel} is a directory`);
    if (existed) fs.copyFileSync(abs, path.join(this.dir, 'backup', String(n)));
    const createdDirs = []; let d = path.dirname(path.resolve(abs));
    while (d !== this.root && !fs.existsSync(d)) { createdDirs.push(path.relative(this.root, d)); d = path.dirname(d); }
    const entry = { n, rel, existed, before: existed ? hashOf(abs) : null, createdDirs };
    this.entries.push(entry); this.flush();
    return entry;
  }
  write(abs, data) {
    this.n++; fault(`${this.label}:write:${this.n}`);
    const entry = this.touch(abs);
    const buf = typeof data === 'string' ? Buffer.from(data) : data;
    entry.after = crypto.createHash('sha256').update(buf).digest('hex'); this.flush(); // recorded before the rename
    writeAtomic(abs, buf, `${this.label}:rename:${this.n}`);
  }
  copy(src, abs) { this.write(abs, fs.readFileSync(src)); }
  remove(abs) {
    this.n++; fault(`${this.label}:write:${this.n}`);
    if (!fs.existsSync(abs)) return;
    const entry = this.touch(abs); entry.after = null; this.flush();
    fs.rmSync(abs, { force: true });
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
