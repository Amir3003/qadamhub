import type { Opportunity } from '../db/opportunities';

// The verified program catalog (public/data/programs.json). Every entry points to an official
// page and carries the date it was last checked. Programs that repeat every year or take
// applications all year stay on the Radar between cycles, with their usual timing shown instead
// of a deadline. Run `npm run check:catalog` after any edit.
export interface CatalogProgram {
  id: string;
  type: Opportunity['type'];
  title: string;
  organization: string;
  url: string;
  countries: string[];
  location: string;
  level: string[];
  summary: string;
  eligibility: string;
  cycle: 'annual' | 'rolling' | 'one-off';
  /** Free text: when applications usually open, or what to check. Shown in the details panel. */
  opens: string;
  /** ISO date of the next confirmed deadline, or null. A past date is ignored. */
  nextDeadline: string | null;
  lastVerified: string;
}

export function catalogToOpportunities(programs: unknown, today: string): Opportunity[] {
  if (!Array.isArray(programs)) return [];
  const seen = new Set<string>();
  const out: Opportunity[] = [];
  for (const item of programs as Partial<CatalogProgram>[]) {
    if (!item || typeof item.id !== 'string' || seen.has(item.id)) continue;
    if (!['HACKATHON', 'GRANT', 'INTERNSHIP'].includes(item.type || '')) continue;
    if (!item.title || !item.organization || !/^https:\/\/[^\s]+$/i.test(item.url || '')) continue;
    seen.add(item.id);
    const upcoming = item.nextDeadline && /^\d{4}-\d{2}-\d{2}$/.test(item.nextDeadline) && item.nextDeadline >= today;
    out.push({
      id: `catalog-${item.id}`,
      type: item.type as Opportunity['type'],
      title: item.title,
      organization: item.organization,
      orgKey: item.id.startsWith('mext') ? 'mext' : 'general',
      // The badge stays short. The usual timing goes first in the description.
      deadline: upcoming ? `Due ${item.nextDeadline}` : item.cycle === 'rolling' ? 'Open all year' : item.cycle === 'one-off' ? 'See dates' : 'Yearly call',
      deadlineDate: upcoming ? (item.nextDeadline as string) : '',
      match: 0,
      description: item.summary || 'Details and eligibility are on the official page.',
      skills: [],
      url: item.url,
      location: item.location || '',
      countries: Array.isArray(item.countries) ? item.countries : [],
      award: '',
      details: {
        about: item.summary,
        eligibility: item.eligibility,
        timing: [item.opens ? `${item.opens.replace(/\.$/, '')}.` : '', upcoming ? `Next deadline: ${item.nextDeadline}.` : ''].filter(Boolean).join(' '),
        level: Array.isArray(item.level) ? item.level : [],
        verified: item.lastVerified,
      },
    });
  }
  return out;
}
