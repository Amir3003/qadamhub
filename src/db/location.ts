import type { Opportunity } from './opportunities';
import { VALID_CITIES } from './cities';

// Profile location is "City, Country". Returns the country, or '' if unknown.
export function profileCountry(location: string): string {
  const value = location.trim();
  if (!value) return '';
  if (value.includes(',')) return value.split(',').pop()!.trim();
  const known = VALID_CITIES.find((c) => c.toLowerCase().startsWith(value.toLowerCase() + ','));
  return known ? known.split(',').pop()!.trim() : '';
}

const OPEN_ANYWHERE = /online|virtual|remote|worldwide|global|international|anywhere/i;

// True when the source says the opportunity is open from this country: it is
// online or worldwide, or it names the country. Unknown location returns false.
export function availableIn(opp: Opportunity, country: string): boolean {
  if (!country) return false;
  const c = country.toLowerCase();
  if ((opp.countries || []).some((x) => x.toLowerCase() === c)) return true;
  return OPEN_ANYWHERE.test(opp.location) || opp.location.toLowerCase().includes(c);
}

const EUROPE = [
  'austria', 'belgium', 'bulgaria', 'croatia', 'cyprus', 'czech republic', 'czechia', 'denmark', 'estonia',
  'finland', 'france', 'germany', 'greece', 'hungary', 'iceland', 'ireland', 'italy', 'latvia', 'lithuania',
  'luxembourg', 'malta', 'netherlands', 'norway', 'poland', 'portugal', 'romania', 'slovakia', 'slovenia',
  'spain', 'sweden', 'switzerland', 'europe', 'european',
];
const ALIASES: Record<string, string[]> = {
  'united states': ['united states', 'usa', 'u.s.', 'america'],
  'united kingdom': ['united kingdom', 'uk', 'england', 'scotland', 'wales', 'britain'],
  'south korea': ['south korea', 'korea'],
  europe: EUROPE,
  online: ['online', 'virtual', 'remote', 'worldwide', 'global'],
};

function namesFor(destination: string): string[] {
  const key = destination.toLowerCase();
  return ALIASES[key] || [key];
}

// Whole-word match without building a pattern from data: "uk" must not match "Dubuque".
function mentions(text: string, name: string): boolean {
  const normalize = (value: string) => ` ${value.toLowerCase().replace(/[^a-z.]+/g, ' ').trim()} `;
  return normalize(text).includes(normalize(name));
}

// 2 when the listing names one of the chosen destinations, 1 when it is open from anywhere
// (online or worldwide), 0 otherwise. No chosen destination means no preference, so 0.
export function destinationRank(opp: Opportunity, destinations: string[]): number {
  if (!destinations.length) return 0;
  const text = [opp.location, ...(opp.countries || [])].join(' | ');
  const named = destinations.some((d) => d !== 'Online' && namesFor(d).some((n) => mentions(text, n)));
  if (named) return 2;
  return OPEN_ANYWHERE.test(opp.location) ? 1 : 0;
}
