import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckIcon, CloseIcon } from './Icons';
import { CONTACT_EMAIL } from '../lib/pilotRequests';
import {
  OpportunitySuggestion,
  SUGGESTION_TYPES,
  SuggestionErrors,
  submitSuggestion,
  suggestionMailto,
  validateSuggestion,
} from '../lib/opportunitySuggestions';

interface SuggestOpportunityModalProps {
  open: boolean;
  onClose: () => void;
}

const emptySuggestion: OpportunitySuggestion = {
  title: '',
  url: '',
  type: 'hackathon',
  deadline: '',
  note: '',
};

// Field ids in form order, used to focus the first invalid field.
const FIELD_IDS: Record<keyof OpportunitySuggestion, string> = {
  title: 'suggest-title',
  url: 'suggest-url',
  type: 'suggest-type',
  deadline: 'suggest-deadline',
  note: 'suggest-note',
};

const fieldClass =
  'w-full h-11 px-3 rounded-xl bg-white/90 border border-teal-200 text-[15px] text-indigo-950 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-colors';
const labelClass = 'block text-[13px] font-semibold text-indigo-950 mb-1.5';

export const SuggestOpportunityModal: React.FC<SuggestOpportunityModalProps> = ({ open, onClose }) => {
  const [suggestion, setSuggestion] = useState<OpportunitySuggestion>(emptySuggestion);
  const [errors, setErrors] = useState<SuggestionErrors>({});
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
  }, [open]);

  useEffect(() => {
    if (!open) {
      setStatus('idle');
      setErrors({});
      setSuggestion(emptySuggestion);
    }
  }, [open]);

  if (!open) return null;

  const update = (key: keyof OpportunitySuggestion) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setSuggestion((current) => ({ ...current, [key]: event.target.value }));
    if (errors[key]) setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const validate = () => {
    const next = validateSuggestion(suggestion);
    setErrors(next);
    const firstKey = (Object.keys(FIELD_IDS) as (keyof OpportunitySuggestion)[]).find((key) => next[key]);
    if (firstKey) document.getElementById(FIELD_IDS[firstKey])?.focus();
    return !firstKey;
  };

  const errorText = (key: keyof OpportunitySuggestion) =>
    errors[key] ? <p className="mt-1 text-[13px] text-rose-700">{errors[key]}</p> : null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validate()) return;
    const clean: OpportunitySuggestion = {
      title: suggestion.title.trim(),
      url: suggestion.url.trim(),
      type: suggestion.type,
      deadline: suggestion.deadline.trim(),
      note: suggestion.note.trim(),
    };
    setStatus('sending');
    const result = await submitSuggestion(clean);
    if (result === 'email') window.location.href = suggestionMailto(clean);
    else setSuggestion(emptySuggestion);
    setStatus(result);
  };

  const done = status === 'stored' || status === 'email';

  // Portaled to <body>: the page's <main> is its own stacking context, under the mobile nav.
  return createPortal(
    <div className="animate-overlay-in fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby="suggest-title-heading">
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" />
      <div className="animate-modal-in relative w-full sm:max-w-xl max-h-[92dvh] overflow-y-auto bg-gradient-to-br from-[#EDF7F6] via-[#F3F6FF] to-[#E8F4F8] rounded-t-3xl sm:rounded-3xl border border-teal-300/40 shadow-[0_20px_50px_-15px_rgba(6,182,212,0.3)]">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 px-5 sm:px-7 pt-5 sm:pt-6 pb-4 bg-[#EDF7F6]/95 backdrop-blur-md border-b border-teal-200/80">
          <div>
            <p className="font-mono text-[12px] uppercase tracking-[0.14em] text-emerald-700 font-semibold">Radar suggestion</p>
            <h2 id="suggest-title-heading" className="mt-1 text-[22px] font-bold tracking-tight text-indigo-950">
              Suggest an opportunity
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
              {status === 'stored' ? 'Thank you. We will review it and add it to the radar if it is open to you.' : 'Your email app should open now.'}
            </h3>
            <p className="text-[15px] leading-relaxed text-teal-950">
              {status === 'stored'
                ? 'Suggestions are checked by hand, so it can take a few days.'
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
              Saw a hackathon, grant or internship on Instagram or elsewhere that is not here? Send it to us and we will
              check it and add it.
            </p>

            <div>
              <label htmlFor="suggest-title" className={labelClass}>Title</label>
              <input
                ref={firstFieldRef}
                id="suggest-title"
                className={fieldClass}
                value={suggestion.title}
                onChange={update('title')}
                maxLength={200}
                aria-invalid={Boolean(errors.title)}
              />
              {errorText('title')}
            </div>

            <div>
              <label htmlFor="suggest-url" className={labelClass}>Link</label>
              <input
                id="suggest-url"
                type="url"
                inputMode="url"
                className={fieldClass}
                value={suggestion.url}
                onChange={update('url')}
                maxLength={500}
                placeholder="https://instagram.com/p/..."
                aria-invalid={Boolean(errors.url)}
              />
              {errorText('url')}
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="suggest-type" className={labelClass}>Type</label>
                <select
                  id="suggest-type"
                  className={fieldClass}
                  value={suggestion.type}
                  onChange={update('type')}
                  aria-invalid={Boolean(errors.type)}
                >
                  {SUGGESTION_TYPES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
                {errorText('type')}
              </div>
              <div>
                <label htmlFor="suggest-deadline" className={labelClass}>
                  Deadline <span className="font-normal text-teal-800/80">(optional)</span>
                </label>
                <input
                  id="suggest-deadline"
                  type="date"
                  className={fieldClass}
                  value={suggestion.deadline}
                  onChange={update('deadline')}
                  aria-invalid={Boolean(errors.deadline)}
                />
                {errorText('deadline')}
              </div>
            </div>

            <div>
              <label htmlFor="suggest-note" className={labelClass}>
                Note <span className="font-normal text-teal-800/80">(optional)</span>
              </label>
              <textarea
                id="suggest-note"
                rows={3}
                className={`${fieldClass} h-auto py-2.5 resize-y min-h-[88px]`}
                value={suggestion.note}
                onChange={update('note')}
                maxLength={500}
                placeholder="Where you saw it, eligibility, prize, anything else"
                aria-invalid={Boolean(errors.note)}
              />
              {errorText('note')}
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
              <p className="text-[12px] leading-relaxed text-teal-800/80">
                Only the fields above are sent. Your account id is attached if you are signed in.
              </p>
              <button
                type="submit"
                disabled={status === 'sending'}
                className="h-11 px-6 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 shadow-md shadow-emerald-900/20 disabled:opacity-60 text-white font-mono text-[15px] font-semibold transition-colors cursor-pointer whitespace-nowrap"
              >
                {status === 'sending' ? 'Sending' : 'Send suggestion'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body
  );
};
