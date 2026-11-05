import { submitPublicForm, type PublicFormResult } from './publicForm';

export const CONTACT_EMAIL = 'a.nagiyev.dev@gmail.com';

export interface PilotRequest {
  institution: string;
  contactName: string;
  role: string;
  email: string;
  phone: string;
  city: string;
  cohortSize: string;
  message: string;
}

export function pilotRequestMailto(request: PilotRequest): string {
  const lines = [
    `Institution: ${request.institution}`,
    `Name: ${request.contactName}`,
    `Role: ${request.role || 'Not specified'}`,
    `Email: ${request.email}`,
    `Phone or Telegram: ${request.phone || 'Not specified'}`,
    `City: ${request.city || 'Not specified'}`,
    `Learners per cohort: ${request.cohortSize || 'Not specified'}`,
    '',
    request.message,
  ];
  const subject = `Pilot request: ${request.institution}`;
  return `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join('\n'))}`;
}

// Public writes go through the server so the database can enforce rate limits.
export async function submitPilotRequest(request: PilotRequest): Promise<PublicFormResult> {
  return submitPublicForm('pilot', {
    institution: request.institution,
    contact_name: request.contactName,
    role: request.role,
    email: request.email,
    phone: request.phone,
    city: request.city,
    cohort_size: request.cohortSize,
    message: request.message,
  });
}
