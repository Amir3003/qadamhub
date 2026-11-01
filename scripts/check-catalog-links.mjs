// Weekly check of the program catalog (public/data/programs.json): do the official links still
// open, is a confirmed deadline already past, was an entry last verified long ago. Writes a
// Markdown report (also to the GitHub job summary) and exits 1 only when a link is broken.
// Sites that refuse automated requests (403, 429) are reported as "cannot check", never as broken.
// Usage: node scripts/check-catalog-links.mjs
import fs from 'node:fs';

const STALE_DAYS = 120;

// ok: the page opens. blocked: the site refuses bots, so a person must look. broken: gone or down.
export function classify(status) {
  if (status >= 200 && status < 400) return 'ok';
  if ([401, 403, 405, 429, 451, 999].includes(status)) return 'blocked';
  return 'broken';
}

export function daysBetween(fromIso, toIso) {
  return Math.round((Date.parse(`${toIso}T00:00:00Z`) - Date.parse(`${fromIso}T00:00:00Z`)) / 86_400_000);
}

export function notes(program, today) {
  const out = [];
  if (program.nextDeadline && program.nextDeadline < today) out.push(`deadline ${program.nextDeadline} has passed, update it`);
  const age = daysBetween(program.lastVerified, today);
  if (age > STALE_DAYS) out.push(`last verified ${age} days ago`);
  return out;
}

async function probe(url) {
  const headers = { 'User-Agent': 'Mozilla/5.0 (compatible; QadamCatalogCheck/1.0)', Accept: 'text/html,*/*' };
  try {
    const response = await fetch(url, { method: 'GET', headers, redirect: 'follow', signal: AbortSignal.timeout(20_000) });
    await response.body?.cancel();
    return { status: response.status };
  } catch (error) {
    return { status: 0, error: error instanceof Error ? error.name : 'error' };
  }
}

async function main() {
  const programs = JSON.parse(fs.readFileSync(new URL('../public/data/programs.json', import.meta.url), 'utf8'));
  const today = new Date().toISOString().slice(0, 10);
  const rows = [];
  for (const program of programs) {
    let result = await probe(program.url);
    // One retry: a single timeout is usually a hiccup, not a dead page.
    if (classify(result.status) === 'broken') result = await probe(program.url);
    rows.push({ program, kind: classify(result.status), status: result.status || result.error, notes: notes(program, today) });
  }
  const broken = rows.filter((r) => r.kind === 'broken');
  const blocked = rows.filter((r) => r.kind === 'blocked');
  const flagged = rows.filter((r) => r.notes.length);
  const line = (r) => `- ${r.program.title} (${r.program.id}): ${r.status} ${r.program.url}${r.notes.length ? `, ${r.notes.join('; ')}` : ''}`;
  const report = [
    `# Catalog check ${today}`,
    `${programs.length} programs: ${rows.length - broken.length - blocked.length} open, ${blocked.length} cannot be checked automatically, ${broken.length} broken.`,
    broken.length ? `\n## Broken links, fix or remove\n${broken.map(line).join('\n')}` : '',
    flagged.length ? `\n## Needs a look\n${flagged.map(line).join('\n')}` : '',
    blocked.length ? `\n## Cannot be checked automatically (the site refuses bots), open by hand now and then\n${blocked.map(line).join('\n')}` : '',
  ].filter(Boolean).join('\n');
  console.log(report);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${report}\n`);
  if (broken.length) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) await main();
