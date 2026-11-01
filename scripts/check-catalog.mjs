// Checks public/data/programs.json: required fields, https links, unique ids, real dates, no em
// dashes or emojis. Run after every catalog edit: npm run check:catalog
import fs from 'node:fs';

const file = new URL('../public/data/programs.json', import.meta.url);
const raw = fs.readFileSync(file, 'utf8');
const programs = JSON.parse(raw);
const errors = [];
const ids = new Set();
const isDate = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(new Date(`${v}T00:00:00Z`).valueOf());

if (!Array.isArray(programs)) errors.push('The catalog must be an array.');
if (raw.includes('—')) errors.push('Em dash found. Use a comma, colon or full stop.');
if (/\p{Extended_Pictographic}/u.test(raw)) errors.push('Emoji found.');

for (const p of Array.isArray(programs) ? programs : []) {
  const tag = p && p.id ? p.id : '(no id)';
  if (!p.id || !/^[a-z0-9-]+$/.test(p.id)) errors.push(`${tag}: id must be lowercase letters, digits and dashes.`);
  if (ids.has(p.id)) errors.push(`${tag}: duplicate id.`);
  ids.add(p.id);
  if (!['HACKATHON', 'GRANT', 'INTERNSHIP'].includes(p.type)) errors.push(`${tag}: bad type.`);
  for (const key of ['title', 'organization', 'summary', 'eligibility', 'opens', 'location']) {
    if (typeof p[key] !== 'string' || !p[key].trim()) errors.push(`${tag}: ${key} is required.`);
  }
  if (!/^https:\/\/[^\s]+$/.test(p.url || '')) errors.push(`${tag}: url must be https.`);
  if (!Array.isArray(p.countries) || !Array.isArray(p.level)) errors.push(`${tag}: countries and level must be arrays.`);
  if (!['annual', 'rolling', 'one-off'].includes(p.cycle)) errors.push(`${tag}: bad cycle.`);
  if (p.nextDeadline !== null && !isDate(p.nextDeadline)) errors.push(`${tag}: nextDeadline must be a date or null.`);
  if (!isDate(p.lastVerified)) errors.push(`${tag}: lastVerified must be a date.`);
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(`Catalog OK: ${programs.length} programs.`);
