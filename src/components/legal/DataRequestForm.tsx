import React, { useId, useState } from 'react';
import { legal } from '../../lib/legal';

type Kind = 'access' | 'deletion' | 'correction';
type Status = { state: 'idle' } | { state: 'sending' } | { state: 'done' } | { state: 'error'; message: string; offerEmail: boolean };

const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/;

const KIND_LABELS: Record<Kind, string> = {
  access: 'Send me a copy of my data',
  deletion: 'Delete my data',
  correction: 'Correct my data',
};

const mailtoFor = (kind: Kind, email: string, details: string) =>
  `mailto:${legal.contactEmail}?subject=${encodeURIComponent(`Data request: ${kind}`)}&body=${encodeURIComponent(
    `Request type: ${KIND_LABELS[kind]}\nAccount email: ${email}\n\n${details}`,
  )}`;

// Access, deletion or correction request. Sent to /api/data-request, which forwards it to the
// team and stores nothing. If that is not available, the visitor gets a prepared email instead.
export const DataRequestForm: React.FC = () => {
  const uid = useId();
  const [kind, setKind] = useState<Kind>('deletion');
  const [email, setEmail] = useState('');
  const [details, setDetails] = useState('');
  const [consent, setConsent] = useState(false);
  const [age, setAge] = useState(false);
  const [website, setWebsite] = useState('');
  const [errors, setErrors] = useState<Partial<Record<'email' | 'consent' | 'age', string>>>({});
  const [status, setStatus] = useState<Status>({ state: 'idle' });

  const validate = () => {
    const next: typeof errors = {};
    if (!EMAIL.test(email.trim())) next.email = 'Enter a valid email address.';
    if (!consent) next.consent = 'Please confirm to continue.';
    if (!age) next.age = 'Please confirm to continue.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (status.state === 'sending' || !validate()) return;
    setStatus({ state: 'sending' });
    try {
      const res = await fetch('/api/data-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, email: email.trim(), details, consent, ageConfirmed: age, website }),
      });
      if (res.ok) {
        setStatus({ state: 'done' });
        return;
      }
      const data: unknown = await res.json().catch(() => null);
      const message =
        typeof data === 'object' && data !== null && 'message' in data && typeof data.message === 'string'
          ? data.message
          : 'Something went wrong. Please try again later.';
      setStatus({ state: 'error', message, offerEmail: res.status >= 500 });
    } catch {
      setStatus({ state: 'error', message: 'Could not reach the server.', offerEmail: true });
    }
  };

  if (status.state === 'done') {
    return (
      <p role="status" className="p-4 rounded-btn bg-emerald-50 border border-emerald-300/60 text-[13px] text-emerald-900">
        Your request was sent. We will reply to the address you entered.
      </p>
    );
  }

  const field =
    'w-full h-11 px-3 rounded-btn bg-white border border-teal-300/60 text-[14px] text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-400';
  const errorText = 'mt-1 text-[12px] text-rose-700';

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-[13px] font-semibold text-slate-900">Request type</legend>
        {(Object.keys(KIND_LABELS) as Kind[]).map((k) => (
          <label key={k} className="flex items-center gap-2 text-[13px] text-slate-700 cursor-pointer">
            <input type="radio" name={`${uid}-kind`} checked={kind === k} onChange={() => setKind(k)} className="accent-teal-600" />
            {KIND_LABELS[k]}
          </label>
        ))}
      </fieldset>

      <div>
        <label htmlFor={`${uid}-email`} className="mb-1 block text-[13px] font-semibold text-slate-900">
          Email you use with QADAM Hub
        </label>
        <input
          id={`${uid}-email`}
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={errors.email ? true : undefined}
          aria-describedby={errors.email ? `${uid}-email-err` : undefined}
          maxLength={254}
          className={field}
        />
        {errors.email ? <p id={`${uid}-email-err`} className={errorText}>{errors.email}</p> : null}
      </div>

      <div>
        <label htmlFor={`${uid}-details`} className="mb-1 block text-[13px] font-semibold text-slate-900">
          Details (optional)
        </label>
        <textarea
          id={`${uid}-details`}
          rows={3}
          maxLength={1000}
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          className={`${field} h-auto py-2`}
        />
      </div>

      {/* Honeypot: hidden from people and assistive tech, bots tend to fill it. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Website
          <input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
        </label>
      </div>

      <div className="flex flex-col gap-3">
        <div>
          <label className="flex items-start gap-2 text-[13px] text-slate-700 cursor-pointer">
            <input type="checkbox" className="mt-0.5 accent-teal-600" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
            <span>I agree that my email address and request are used only to handle this request.</span>
          </label>
          {errors.consent ? <p className={errorText}>{errors.consent}</p> : null}
        </div>
        <div>
          <label className="flex items-start gap-2 text-[13px] text-slate-700 cursor-pointer">
            <input type="checkbox" className="mt-0.5 accent-teal-600" checked={age} onChange={(e) => setAge(e.target.checked)} />
            <span>I am at least 16 years old, or I am a parent or guardian sending this request for my child.</span>
          </label>
          {errors.age ? <p className={errorText}>{errors.age}</p> : null}
        </div>
      </div>

      <div className="flex flex-col items-start gap-2">
        <button
          type="submit"
          disabled={status.state === 'sending'}
          className="h-11 px-5 rounded-btn bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white text-[13px] font-mono font-semibold transition-colors cursor-pointer disabled:opacity-60"
        >
          {status.state === 'sending' ? 'Sending' : 'Send request'}
        </button>
        <div role="status" aria-live="polite" className="text-[13px] text-rose-700">
          {status.state === 'error' ? (
            <>
              {status.message}
              {status.offerEmail ? (
                <>
                  {' '}
                  <a href={mailtoFor(kind, email.trim(), details)} className="font-semibold text-emerald-700 underline">
                    Send it by email instead
                  </a>
                  .
                </>
              ) : null}
            </>
          ) : null}
        </div>
      </div>
    </form>
  );
};
