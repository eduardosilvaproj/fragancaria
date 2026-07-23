import { readFileSync, existsSync } from 'fs';
import { inflateSync } from 'zlib';

const root = 'C:/dev/fragancaria/.git';

// Check FETCH_HEAD object
const hash = '1b158c833a7932966e263662ec8a27abb26e3ce7';
const dir = hash.slice(0,2);
const file = hash.slice(2);
const objPath = root + '/objects/' + dir + '/' + file;
if (existsSync(objPath)) {
  const raw = inflateSync(readFileSync(objPath));
  const content = raw.toString('utf-8');
  const lines = content.split('\n');
  console.log('FETCH_HEAD object type:', lines[0].split(' ')[0]);
  for (const l of lines) {
    if (l.startsWith('parent ')) console.log('parent:', l.slice(7).trim());
  }
  const msgStart = lines.findIndex(l => l === '') + 1;
  if (msgStart > 0 && msgStart < lines.length) {
    console.log('message:', lines.slice(msgStart, msgStart+3).join(' | '));
  }
} else {
  console.log('FETCH_HEAD object NOT in objects/');
}

// Also check if we can find the Camada B commits in the packfile
// by looking at the commit graph from HEAD
// HEAD = a8f5460
const headHash = 'a8f546002f901b611bd3bde7fdc665196bea3873';
const hdir = headHash.slice(0,2);
const hfile = headHash.slice(2);
const hPath = root + '/objects/' + hdir + '/' + hfile;
if (existsSync(hPath)) {
  const raw = inflateSync(readFileSync(hPath));
  const content = raw.toString('utf-8');
  const lines = content.split('\n');
  console.log('\nHEAD commit parents:');
  for (const l of lines) {
    if (l.startsWith('parent ')) console.log(' ', l.slice(7).trim());
  }
}

// Walk parents to find Camada B commits
const targetHashes = ['cba2169', 'd33fd07', '17b6734'];
function findCommit(hash) {
  const d = hash.slice(0,2);
  const f = hash.slice(2);
  const p = root + '/objects/' + d + '/' + f;
  if (!existsSync(p)) return null;
  try {
    const raw = inflateSync(readFileSync(p));
    const content = raw.toString('utf-8');
    if (!content.startsWith('commit ')) return null;
    const lines = content.split('\n');
    const msgStart = lines.findIndex(l => l === '') + 1;
    const msg = msgStart > 0 && msgStart < lines.length ? lines.slice(msgStart).join(' ').trim() : '';
    const parents = lines.filter(l => l.startsWith('parent ')).map(l => l.slice(7).trim());
    return { msg, parents };
  } catch { return null; }
}

console.log('\nWalking from HEAD to find Camada B commits:');
let cur = headHash;
let found = [];
for (let i = 0; i < 20; i++) {
  const c = findCommit(cur);
  if (!c) { console.log('  stopped at', cur, '(not found)'); break; }
  const short = cur.slice(0,7);
  for (const t of targetHashes) {
    if (short.startsWith(t)) found.push(t + ' -> ' + c.msg);
  }
  if (c.parents.length === 0) break;
  cur = c.parents[0];
}
if (found.length === 0) console.log('  NONE of the Camada B commits found in ancestry');
found.forEach(f => console.log('  FOUND:', f));
