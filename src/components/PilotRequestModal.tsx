import React, { useEffect, useRef, useState } from 'react';
import { CheckIcon, CloseIcon } from './Icons';
import {
  CONTACT_EMAIL,
  PilotRequest,
  pilotRequestMailto,
  submitPilotRequest,
} from '../lib/pilotRequests';
import { VALID_CITIES } from '../db/cities';
import { PILOT_COHORT_SIZES, PILOT_ROLES, PilotErrors, validatePilotRequest } from '../lib/pilotValidation';

interface PilotRequestModalProps {
  open: boolean;
  onClose: () => void;
}

// Suggestions only: the city field accepts any text.
const CITY_SUGGESTIONS = [...VALID_CITIES.map((city) => city.split(',')[0]), 'Online only'];

const emptyRequest: PilotRequest = {
  institution: '',
  contactName: '',
  role: '',
  email: '',
  phone: '',
  city: '',
  cohortSize: '',
  message: '',
};

// Field ids in form order, used to focus the first invalid field.
const FIELD_IDS: Record<keyof PilotRequest, string> = {
  institution: 'pilot-institution',
  contactName: 'pilot-name',
  role: 'pilot-role',
  email: 'pilot-email',
  phone: 'pilot-phone',
  city: 'pilot-city',
  cohortSize: 'pilot-size',
  message: 'pilot-message',
};

const fieldClass =
  'w-full h-11 px-3 rounded-xl bg-white/90 border border-teal-200 text-[15px] text-indigo-950 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-colors';
const labelClass = 'block text-[13px] font-semibold text-indigo-950 mb-1.5';

export const PilotRequestModal: React.FC<PilotRequestModalProps> = ({ open, onClose }) => {
  const [request, setRequest] = useState<PilotRequest>(emptyRequest);
  const [honeypot, setHoneypot] = useState('');
  const [errors, setErrors] = useState<PilotErrors>({});
  const [status, setStatus] = useState<'idle' | 'sending' | 'stored' | 'email'>('idle');
  const firstFieldRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    firstFieldRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) {
      setStatus('idle');
      setErrors({});
    }
  }, [open]);

  if (!open) return null;

  const update = (key: keyof PilotRequest) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setRequest((current) => ({ ...current, [key]: event.target.value }));
    if (errors[key]) setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const validate = () => {
    const next = validatePilotRequest(request);
    setErrors(next);
    const firstKey = (Object.keys(FIELD_IDS) as (keyof PilotRequest)[]).find((key) => next[key]);
    if (firstKey) document.getElementById(FIELD_IDS[firstKey])?.focus();
    return !firstKey;
  };

  const errorText = (key: keyof PilotRequest) =>
    errors[key] ? <p className="mt-1 text-[13px] text-rose-700">{errors[key]}</p> : null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (honeypot) return;
    if (!validate()) return;
    const clean: PilotRequest = {
      ...request,
      institution: request.institution.trim(),
      contactName: request.contactName.trim(),
      email: request.email.trim(),
      phone: request.phone.trim(),
      city: request.city.trim(),
      message: request.message.trim(),
    };
    setStatus('sending');
    const result = await submitPilotRequest(clean);
    if (result === 'email') window.location.href = pilotRequestMailto(clean);
    else setRequest(emptyRequest);
    setStatus(result);
  };

  const done = status === 'stored' || status === 'email';

  return (
    <div className="animate-overlay-in fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby="pilot-title">
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" />
      <div className="animate-modal-in relative w-full sm:max-w-xl max-h-[92dvh] overflow-y-auto bg-gradient-to-br from-[#EDF7F6] via-[#F3F6FF] to-[#E8F4F8] rounded-t-3xl sm:rounded-3xl border border-teal-300/40 shadow-[0_20px_50px_-15px_rgba(6,182,212,0.3)]">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 px-5 sm:px-7 pt-5 sm:pt-6 pb-4 bg-[#EDF7F6]/95 backdrop-blur-md border-b border-teal-200/80">
          <div>
            <p className="font-mono text-[12px] uppercase tracking-[0.14em] text-emerald-700 font-semibold">Pilot request</p>
            <h2 id="pilot-title" className="mt-1 text-[22px] font-bold tracking-tight text-indigo-950">
              Run a pilot with one cohort
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-11 h-11 -mr-2 -mt-1 flex items-center justify-center rounded-full text-teal-800 hover:bg-white/80 transition-colors cursor-pointer"
          >
            <CloseIcon size={20} />
          </button>
        </div>

        {done ? (
          <div className="px-5 sm:px-7 py-8 space-y-4">
            <div className="w-11 h-11 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <CheckIcon size={22} />
            </div>
            <h3 className="text-[19px] font-bold text-indigo-950">
              {status === 'stored' ? 'Thank you. Your request is in.' : 'Your email app should open now.'}
            </h3>
            <p className="text-[15px] leading-relaxed text-teal-950">
              {status === 'stored'
                ? 'We will reply by email to agree on a short call, the cohort and the start date.'
                : `Press Send in your email app to finish. If it did not open, write to ${CONTACT_EMAIL}.`}
            </p>
            <button
              type="button"
              onClick={onClose}
              className="h-11 px-5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 shadow-md shadow-emerald-900/20 text-white font-mono text-[15px] font-semibold transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="px-5 sm:px-7 py-6 space-y-4">
            <p className="text-[15px] leading-relaxed text-teal-950">
              Free for 4 to 6 weeks with 30 to 50 learners and one staff lead. Tell us about your institution and we will
              reply by email.
            </p>

            <div>
              <label htmlFor="pilot-institution" className={labelClass}>Institution</label>
              <input
                ref={firstFieldRef}
                id="pilot-institution"
                className={fieldClass}
                value={request.institution}
                onChange={update('institution')}
                maxLength={160}
                autoComplete="organization"
                aria-invalid={Boolean(errors.institution)}
              />
              {errorText('institution')}
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="pilot-name" className={labelClass}>Your name</label>
                <input
                  id="pilot-name"
                  className={fieldClass}
                  value={request.contactName}
                  onChange={update('contactName')}
                  maxLength={80}
                  autoComplete="name"
                  aria-invalid={Boolean(errors.contactName)}
                />
                {errorText('contactName')}
              </div>
              <div>
                <label htmlFor="pilot-role" className={labelClass}>Role</label>
                <select id="pilot-role" className={fieldClass} value={request.role} onChange={update('role')} aria-invalid={Boolean(errors.role)}>
                  <option value="">Select</option>
                  {PILOT_ROLES.map((role) => <option key={role} value={role}>{role}</option>)}
                </select>
                {errorText('role')}
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="pilot-email" className={labelClass}>Work email</label>
                <input
                  id="pilot-email"
                  type="email"
                  className={fieldClass}
                  value={request.email}
                  onChange={update('email')}
                  maxLength={200}
                  autoComplete="email"
                  aria-invalid={Boolean(errors.email)}
                />
                {errorText('email')}
              </div>
              <div>
                <label htmlFor="pilot-phone" className={labelClass}>
                  Phone or Telegram <span className="font-normal text-teal-800/80">(optional)</span>
                </label>
                <input
                  id="pilot-phone"
                  className={fieldClass}
                  value={request.phone}
                  onChange={update('phone')}
                  maxLength={60}
                  autoComplete="tel"
                  placeholder="+7 701 123 4567 or @username"
                  aria-invalid={Boolean(errors.phone)}
                />
                {errorText('phone')}
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="pilot-city" className={labelClass}>
                  City
                </label>
                <input
                  id="pilot-city"
                  list="pilot-city-options"
                  className={fieldClass}
                  value={request.city}
                  onChange={update('city')}
                  maxLength={60}
                  autoComplete="address-level2"
                  placeholder="Start typing, e.g. Tokyo"
                  aria-invalid={Boolean(errors.city)}
                />
                {errorText('city')}
                <datalist id="pilot-city-options">
                  {CITY_SUGGESTIONS.map((city) => <option key={city} value={city} />)}
                </datalist>
              </div>
              <div>
                <label htmlFor="pilot-size" className={labelClass}>Learners per cohort</label>
                <select id="pilot-size" className={fieldClass} value={request.cohortSize} onChange={update('cohortSize')} aria-invalid={Boolean(errors.cohortSize)}>
                  <option value="">Select</option>
                  {PILOT_COHORT_SIZES.map((size) => <option key={size} value={size}>{size}</option>)}
                </select>
                {errorText('cohortSize')}
              </div>
            </div>

            <div>
              <label htmlFor="pilot-message" className={labelClass}>
                Anything we should know <span className="font-normal text-teal-800/80">(optional)</span>
              </label>
              <textarea
                id="pilot-message"
                rows={3}
                className={`${fieldClass} h-auto py-2.5 resize-y min-h-[88px]`}
                value={request.message}
                onChange={update('message')}
                maxLength={1000}
                aria-invalid={Boolean(errors.message)}
              />
              {errorText('message')}
            </div>

            <div className="hidden" aria-hidden="true">
              <label htmlFor="pilot-website">Website</label>
              <input id="pilot-website" tabIndex={-1} autoComplete="off" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} />
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
              <p className="text-[12px] leading-relaxed text-teal-800/80">
                We use these details only to reply to your request.
              </p>
              <button
                type="submit"
                disabled={status === 'sending'}
                className="h-11 px-6 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 shadow-md shadow-emerald-900/20 disabled:opacity-60 text-white font-mono text-[15px] font-semibold transition-colors cursor-pointer whitespace-nowrap"
              >
                {status === 'sending' ? 'Sending' : 'Send request'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
