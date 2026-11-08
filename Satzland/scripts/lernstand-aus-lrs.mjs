// Takes the Satzland progress over from the local LRS-Trainer: every Satzland round and answer, the settings and
// the parent PIN. Word training data stays in the LRS-Trainer. Run it while neither app's dev server is running:
//   node scripts/lernstand-aus-lrs.mjs [path/to/LRS-Trainer/Schreibi]
// It can be run again later; newer rows win, nothing is deleted.
import { copyFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const here = path.dirname(fileURLToPath(import.meta.url));
const appDir = path.resolve(here, '..');
const lrsDir = path.resolve(process.argv[2] || path.join(appDir, '../../LRS-Trainer/Schreibi'));
const d1 = dir => path.join(dir, '.wrangler/state/v3/d1/miniflare-D1DatabaseObject');
const dbFile = dir => existsSync(d1(dir)) ? readdirSync(d1(dir)).find(f => f.endsWith('.sqlite') && f !== 'metadata.sqlite') : undefined;

const sourceName = dbFile(lrsDir);
if (!sourceName) { console.error(`Keine lokale Datenbank des LRS-Trainers gefunden unter ${d1(lrsDir)}`); process.exit(1); }
const source = new DatabaseSync(path.join(d1(lrsDir), sourceName), { readOnly: true });

// Both apps use the same local database id, so the file name is the same; a fresh copy starts from an empty table.
mkdirSync(d1(appDir), { recursive: true });
const targetName = dbFile(appDir) || sourceName;
const target = new DatabaseSync(path.join(d1(appDir), targetName));
if (!existsSync(path.join(d1(appDir), 'metadata.sqlite')) && existsSync(path.join(d1(lrsDir), 'metadata.sqlite'))) copyFileSync(path.join(d1(lrsDir), 'metadata.sqlite'), path.join(d1(appDir), 'metadata.sqlite'));
target.exec(`CREATE TABLE IF NOT EXISTS schreibi_records (owner text NOT NULL, id text NOT NULL, kind text NOT NULL, payload text NOT NULL, updated_at integer NOT NULL, PRIMARY KEY(owner, id));
  CREATE INDEX IF NOT EXISTS schreibi_owner_kind ON schreibi_records (owner, kind);
  CREATE INDEX IF NOT EXISTS schreibi_owner_updated ON schreibi_records (owner, updated_at);`);

const rows = source.prepare('SELECT owner, id, kind, payload, updated_at FROM schreibi_records').all();
const satz = row => { try { return String(JSON.parse(row.payload).mode || '').startsWith('satz-'); } catch { return false; } };
const keep = rows.filter(row => row.kind === 'setting' || row.kind === 'pin' || (['attempt', 'session'].includes(row.kind) && satz(row)));
const upsert = target.prepare(`INSERT INTO schreibi_records (owner, id, kind, payload, updated_at) VALUES (?, ?, ?, ?, ?)
  ON CONFLICT(owner, id) DO UPDATE SET kind = excluded.kind, payload = excluded.payload, updated_at = excluded.updated_at WHERE excluded.updated_at > schreibi_records.updated_at`);
target.exec('BEGIN');
for (const row of keep) upsert.run(row.owner, row.id, row.kind, row.payload, row.updated_at);
target.exec('COMMIT');

const count = kind => keep.filter(row => row.kind === kind).length;
console.log(`Übernommen: ${count('session')} Satzland-Runden, ${count('attempt')} Antworten, ${count('setting')} Einstellungen${count('pin') ? ', Eltern-PIN' : ''}.`);
console.log(`Ziel: ${path.join(d1(appDir), targetName)}`);
