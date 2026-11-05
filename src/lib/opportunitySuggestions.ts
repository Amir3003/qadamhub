import { submitPublicForm, type PublicFormResult } from './publicForm';
import { CONTACT_EMAIL } from './pilotRequests';

export type SuggestionType = 'hackathon' | 'grant' | 'internship' | 'other';

export interface OpportunitySuggestion {
  title: string;
  url: string;
  type: SuggestionType;
  deadline: string;
  note: string;
}

export type SuggestionErrors = Partial<Record<keyof OpportunitySuggestion, string>>;

export const SUGGESTION_TYPES: { value: SuggestionType; label: string }[] = [
  { value: 'hackathon', label: 'Hackathon' },
  { value: 'grant', label: 'Grant' },
  { value: 'internship', label: 'Internship' },
  { value: 'other', label: 'Other' },
];

const LETTER = /\p{L}/u;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// Today's date in the user's local calendar as YYYY-MM-DD.
function localToday(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function validateSuggestion(suggestion: OpportunitySuggestion): SuggestionErrors {
  const errors: SuggestionErrors = {};

  const title = suggestion.title.trim();
  if (title.length < 3) errors.title = 'Enter the name of the opportunity (at least 3 characters).';
  else if (title.length > 200) errors.title = 'Keep the title under 200 characters.';
  else if (!LETTER.test(title)) errors.title = 'The title should contain letters.';

  const url = suggestion.url.trim();
  let validUrl = false;
  if (url.length > 0) {
    try {
      const parsed = new URL(url);
      validUrl = parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      validUrl = false;
    }
  }
  if (!url) errors.url = 'Paste the link to the opportunity.';
  else if (!validUrl) errors.url = 'Enter a full link that starts with https://.';
  else if (url.length > 500) errors.url = 'Keep the link under 500 characters.';

  const deadline = suggestion.deadline.trim();
  if (deadline) {
    const [year, month, day] = ISO_DATE.test(deadline)
      ? deadline.split('-').map(Number)
      : [NaN, NaN, NaN];
    const real = !Number.isNaN(year) && new Date(Date.UTC(year, month - 1, day)).getUTCDate() === day;
    if (!real) errors.deadline = 'Enter the deadline as a real date.';
    else if (deadline < localToday()) errors.deadline = 'The deadline has already passed. Pick today or a later date.';
  }

  if (suggestion.note.trim().length > 500) errors.note = 'Keep the note under 500 characters.';

  return errors;
}

// Public writes go through the server so the database can enforce rate limits.
export async function submitSuggestion(suggestion: OpportunitySuggestion): Promise<PublicFormResult> {
  return submitPublicForm('suggestion', {
    title: suggestion.title.trim(),
    url: suggestion.url.trim(),
    type: suggestion.type,
    deadline: suggestion.deadline.trim() || null,
    note: suggestion.note.trim(),
  });
}

export function suggestionMailto(suggestion: OpportunitySuggestion): string {
  const lines = [
    `Title: ${suggestion.title.trim()}`,
    `Link: ${suggestion.url.trim()}`,
    `Type: ${suggestion.type}`,
    `Deadline: ${suggestion.deadline.trim() || 'Not specified'}`,
    '',
    suggestion.note.trim() || 'No note.',
  ];
  const subject = `Missing opportunity: ${suggestion.title.trim()}`;
  return `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join('\n'))}`;
}
