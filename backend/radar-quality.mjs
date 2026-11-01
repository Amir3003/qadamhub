const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];

export function confirmedDeadline(deadline, quote, source, today) {
  if (typeof deadline !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(deadline)) return false;
  const parsed = new Date(`${deadline}T00:00:00Z`);
  if (Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== deadline || deadline < today) return false;
  if (typeof quote !== 'string' || !quote.trim() || !source.toLowerCase().includes(quote.trim().toLowerCase())) return false;
  if (!/deadline|registration|apply|applications|submit|clos(e|es|ing)|due|until|last date/i.test(quote)) return false;
  const [year, month, day] = deadline.split('-').map(Number);
  const clean = quote.toLowerCase();
  if (!clean.includes(String(year))) return false;
  const monthName = MONTHS[month - 1];
  // The patterns below are built only from these validated numbers and the fixed MONTHS list.
  const namedMonth = new RegExp(`\\b${monthName.slice(0, 3)}[a-z]*\\b`, 'i').test(clean); // nosemgrep: javascript.lang.security.audit.detect-non-literal-regexp.detect-non-literal-regexp
  const dayNumber = new RegExp(`(^|\\D)0?${day}(?:st|nd|rd|th)?(?!\\d)`, 'i').test(clean); // nosemgrep: javascript.lang.security.audit.detect-non-literal-regexp.detect-non-literal-regexp
  const numericDate = new RegExp(`\\b${year}[-/.]0?${month}[-/.]0?${day}\\b`).test(clean) || // nosemgrep: javascript.lang.security.audit.detect-non-literal-regexp.detect-non-literal-regexp
    new RegExp(`\\b0?${day}[-/.]0?${month}[-/.]${year}\\b`).test(clean); // nosemgrep: javascript.lang.security.audit.detect-non-literal-regexp.detect-non-literal-regexp
  return numericDate || (namedMonth && dayNumber);
}

export function publishable(item, today) {
  if (!item || !['HACKATHON', 'GRANT', 'INTERNSHIP'].includes(item.type)) return false;
  if (!item.title || /^\s*(unknown|untitled|n\/?a)\s*$/i.test(item.title)) return false;
  if (!item.organization || /^\s*(unknown|n\/?a)\s*$/i.test(item.organization)) return false;
  if (!/^https:\/\/[^\s]+$/i.test(item.url || '')) return false;
  if (!item.deadline || item.deadline < today || !/^\d{4}-\d{2}-\d{2}$/.test(item.deadline)) return false;
  // Directory pages are not evidence for the deadline of any one event.
  const pathname = new URL(item.url).pathname.replace(/\/$/, '');
  if (/^\/(?:c|hackathons|events|search|category|categories)(?:\/[^/]+)?$/i.test(pathname)) return false;
  return true;
}

// Takes result lists in query order and returns up to `max` unique http(s) URLs, one from each
// query in turn. Without this the first queries would fill the whole budget and the rest would
// never contribute.
export function balancedUrls(lists, max) {
  const out = [];
  const seen = new Set();
  const longest = Math.max(0, ...lists.map((list) => list.length));
  for (let i = 0; i < longest && out.length < max; i++) {
    for (const list of lists) {
      const url = list[i];
      if (out.length < max && /^https?:\/\//.test(url || '') && !seen.has(url)) {
        seen.add(url);
        out.push(url);
      }
    }
  }
  return out;
}
