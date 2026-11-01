// The site serves the same files the daily radar Action and the catalog publish. Reading them from
// the site (not raw GitHub) keeps the bots working when the repository is private.
const DEFAULT_RADAR_URL = 'https://www.qadamhub.com/data/opportunities.json';
const DEFAULT_CATALOG_URL = 'https://www.qadamhub.com/data/programs.json';

async function fetchJson(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}`);
  return response.json();
}

// Dated listings from the daily feed. Same rules as the site: a future deadline with its evidence.
export function normalizeFeed(data, today) {
  if (!Array.isArray(data)) throw new Error('Radar feed is not a list');
  const seen = new Set();
  return data.flatMap((item) => {
    const title = String(item?.title || '').trim();
    const url = String(item?.url || '').trim();
    if (!title || /^unknown$/i.test(title) || !/^https:\/\/[^\s]+$/i.test(url)) return [];
    const deadline = /^\d{4}-\d{2}-\d{2}$/.test(item.deadline || '') ? item.deadline : null;
    if (!deadline || deadline < today || !item.deadlineEvidence ||
      !item.organization || /^unknown$/i.test(item.organization)) return [];
    const key = `${title.toLowerCase()}|${url}`;
    if (seen.has(key)) return [];
    seen.add(key);
    return [{
      id: String(item.id || `feed-${url}`).slice(0, 60),
      title: title.slice(0, 160),
      url,
      deadline,
      type: String(item.type || 'Opportunity').slice(0, 40),
      organization: String(item.organization || '').trim().slice(0, 80),
      opensMonths: [],
    }];
  });
}

// Verified yearly and rolling programs. A deadline is shown only when it is still in the future.
export function normalizeCatalog(data, today) {
  if (!Array.isArray(data)) return [];
  const seen = new Set();
  return data.flatMap((item) => {
    const id = String(item?.id || '');
    const title = String(item?.title || '').trim();
    const url = String(item?.url || '').trim();
    if (!/^[a-z0-9-]+$/.test(id) || !title || !/^https:\/\/[^\s]+$/i.test(url) || seen.has(id)) return [];
    seen.add(id);
    const upcoming = /^\d{4}-\d{2}-\d{2}$/.test(item.nextDeadline || '') && item.nextDeadline >= today;
    const months = Array.isArray(item.opensMonths) ? item.opensMonths.filter((m) => Number.isInteger(m) && m >= 1 && m <= 12) : [];
    return [{
      id: `catalog-${id}`,
      title: title.slice(0, 160),
      url,
      deadline: upcoming ? item.nextDeadline : null,
      type: String(item.type || 'Opportunity').slice(0, 40),
      organization: String(item.organization || '').trim().slice(0, 80),
      opensMonths: months,
    }];
  });
}

export async function loadAllItems(today = new Date().toISOString().slice(0, 10)) {
  const feed = normalizeFeed(await fetchJson(process.env.RADAR_DATA_URL || DEFAULT_RADAR_URL), today);
  // The catalog is optional: a failure must never hide the dated feed.
  let catalog = [];
  try {
    catalog = normalizeCatalog(await fetchJson(process.env.CATALOG_DATA_URL || DEFAULT_CATALOG_URL), today);
  } catch (error) {
    console.error('[Catalog Error]', error.message);
  }
  const feedUrls = new Set(feed.map((item) => item.url));
  return [...feed, ...catalog.filter((item) => !feedUrls.has(item.url))];
}

// What /radar and /draft show: dated listings first, then the catalog.
export async function loadRadar(limit = 5) {
  return (await loadAllItems()).slice(0, limit);
}
