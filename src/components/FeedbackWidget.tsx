import React, { useEffect, useId, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ChevronRightIcon, CloseIcon, MessageSquareIcon } from './Icons';
import { networkClient } from '../lib/network';
import { CONTACT_EMAIL } from '../lib/pilotRequests';

// Beta feedback layer: a small floating button and a dark dialog with two paths, rate the app
// or send feedback. Everything goes to POST /api/beta-feedback. The dialog closes only with its
// Close button, so a half-written report is never lost.

type FeedbackType = 'bug' | 'feature' | 'general';
type View = 'menu' | 'rate' | 'send';
type Phase = 'idle' | 'sending' | 'sent' | 'error' | 'unavailable';

const TYPES: { value: FeedbackType; label: string; hint: string }[] = [
  { value: 'bug', label: 'Bug', hint: 'What did you do, what happened, and what did you expect?' },
  { value: 'feature', label: 'Feature request', hint: 'What would you like to do that you cannot do today?' },
  { value: 'general', label: 'General', hint: 'Anything else you want us to know.' },
];

const STAR_LABELS = ['Poor', 'Fair', 'Good', 'Very good', 'Great'];
const MIN_LENGTH = 10;
const MAX_LENGTH = 2000;

// Where happy users are sent for a public review. There is no app store listing, so the link is
// set per launch (for example a Product Hunt page) and hidden while VITE_REVIEW_URL is empty.
const REVIEW_URL = (() => {
  try {
    const url = new URL(import.meta.env.VITE_REVIEW_URL?.trim() || '');
    return url.protocol === 'https:' ? url.href : '';
  } catch {
    return '';
  }
})();

const FOCUSABLE = 'button:not(:disabled), a[href], textarea, input:not([tabindex="-1"]), [tabindex]:not([tabindex="-1"])';

async function signedInUserId(): Promise<string | undefined> {
  try {
    const { data } = (await networkClient?.auth.getSession()) ?? { data: null };
    return data?.session?.user.id;
  } catch {
    return undefined;
  }
}

const Star: React.FC<{ filled: boolean }> = ({ filled }) => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" aria-hidden="true">
    <polygon points="12 2.5 15.1 8.8 22 9.8 17 14.7 18.2 21.5 12 18.2 5.8 21.5 7 14.7 2 9.8 8.9 8.8" />
  </svg>
);

const fieldClass =
  'w-full resize-none rounded-lg bg-black/25 border border-white/10 focus:border-teal-400/60 focus:outline-none px-3 py-2.5 text-[14px] leading-relaxed text-slate-100 placeholder:text-slate-500';
const primaryClass =
  'w-full h-11 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 disabled:from-white/10 disabled:to-white/10 disabled:text-slate-500 text-white text-[14px] font-semibold transition-colors cursor-pointer disabled:cursor-not-allowed';
const quietClass =
  'w-full h-11 rounded-lg bg-white/10 hover:bg-white/15 border border-white/10 text-[14px] font-medium text-white transition-colors cursor-pointer inline-flex items-center justify-center';

export const FeedbackWidget: React.FC = () => {
  const { pathname } = useLocation();
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>('menu');
  const [type, setType] = useState<FeedbackType>('bug');
  const [text, setText] = useState('');
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [phase, setPhase] = useState<Phase>('idle');
  const [message, setMessage] = useState('');
  const [page, setPage] = useState(pathname);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const trimmed = text.trim();
  const hint = TYPES.find((item) => item.value === type)?.hint ?? '';
  const canSend = view === 'rate' ? stars > 0 && phase !== 'sending' : trimmed.length >= MIN_LENGTH && phase !== 'sending';
  const title = view === 'rate' ? 'Rate QADAM Hub' : view === 'send' ? 'Send feedback' : 'Help us improve';

  // Moves focus to the first useful control of the current view.
  useEffect(() => {
    if (!open || phase === 'sent') return;
    const target = panelRef.current?.querySelector<HTMLElement>('[data-autofocus]');
    target?.focus();
  }, [open, view, phase]);

  const openDialog = () => {
    setPage(pathname);
    setView('menu');
    setPhase('idle');
    setMessage('');
    setOpen(true);
  };

  const closeDialog = () => {
    setOpen(false);
    if (phase === 'sent') {
      setText('');
      setComment('');
      setStars(0);
      setType('bug');
    }
    triggerRef.current?.focus();
  };

  const goTo = (next: View) => {
    setView(next);
    setPhase('idle');
    setMessage('');
  };

  // Keeps Tab inside the dialog while it is open.
  const trapTab = (event: React.KeyboardEvent) => {
    if (event.key !== 'Tab' || !panelRef.current) return;
    const items = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSend) return;
    setPhase('sending');
    setMessage('');
    const payload =
      view === 'rate'
        ? { type: 'rating', rating: stars, description: comment.trim() }
        : { type, description: trimmed };
    try {
      const response = await fetch('/api/beta-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, userId: await signedInUserId(), pageUrl: page, website: honeypot }),
      });
      if (response.ok) {
        setPhase('sent');
        return;
      }
      const body = (await response.json().catch(() => null)) as { message?: string } | null;
      if (response.status === 422 || response.status === 429) {
        setPhase('error');
        setMessage(body?.message || 'Could not send this.');
      } else {
        setPhase('unavailable');
      }
    } catch {
      setPhase('unavailable');
    }
  };

  const emailBody = view === 'rate' ? `${stars} of 5 stars\n${comment.trim()}` : trimmed;
  const mailto = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(view === 'rate' ? 'QADAM rating' : `QADAM feedback (${type})`)}&body=${encodeURIComponent(`${emailBody}\n\nPage: ${page}`)}`;

  const statusNotes = (
    <>
      {message && (
        <p role="alert" className="text-[13px] text-rose-300">
          {message}
        </p>
      )}
      {phase === 'unavailable' && (
        <p role="alert" className="text-[13px] leading-relaxed text-amber-200">
          This is not available right now.{' '}
          <a href={mailto} className="underline hover:text-white">
            Send it by email instead
          </a>
          .
        </p>
      )}
    </>
  );

  const honeypotField = (
    <input
      type="text"
      name="website"
      value={honeypot}
      onChange={(event) => setHoneypot(event.target.value)}
      tabIndex={-1}
      autoComplete="off"
      aria-hidden="true"
      className="absolute -left-[9999px] h-0 w-0 opacity-0"
    />
  );

  const privacyNote = (
    <p className="text-[12px] leading-relaxed text-slate-500">
      We store your message, the page path and your browser type. No profile data is sent.{' '}
      <a href="/privacy" target="_blank" rel="noopener noreferrer" className="underline hover:text-slate-300">
        Privacy
      </a>
    </p>
  );

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={openDialog}
        aria-haspopup="dialog"
        aria-label="Rate the app or send feedback"
        className="fixed z-40 right-4 bottom-24 lg:bottom-6 lg:right-6 h-11 min-w-11 px-3 sm:px-4 inline-flex items-center justify-center gap-2 rounded-full bg-[#0E1320]/95 backdrop-blur-md border border-white/10 hover:border-white/25 text-[13px] font-medium text-slate-300 hover:text-white shadow-[0_10px_30px_-10px_rgba(0,0,0,0.7)] transition-colors cursor-pointer"
      >
        <MessageSquareIcon size={16} />
        <span className="hidden sm:inline">Feedback</span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          onKeyDown={trapTab}
          className="animate-overlay-in fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-6 bg-[#070A12]/70 backdrop-blur-sm"
        >
          <div
            ref={panelRef}
            className="animate-modal-in w-full sm:max-w-md max-h-[92dvh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-[#0E1320] border border-white/10 text-slate-100 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.75)]"
          >
            <div className="flex items-start justify-between gap-4 px-5 pt-5 pb-3">
              <div className="min-w-0">
                {view !== 'menu' && phase !== 'sent' && (
                  <button
                    type="button"
                    onClick={() => goTo('menu')}
                    className="mb-1 -ml-1 px-1 h-7 inline-flex items-center gap-1 rounded text-[12px] font-mono text-slate-400 hover:text-white transition-colors cursor-pointer"
                  >
                    <ChevronRightIcon size={12} className="rotate-180" />
                    Back
                  </button>
                )}
                <h2 id={titleId} className="text-[16px] font-semibold tracking-tight text-white">
                  {title}
                </h2>
                <p className="mt-0.5 text-[12px] font-mono text-slate-400">Beta · your words shape what we build next</p>
              </div>
              <button
                type="button"
                onClick={closeDialog}
                aria-label="Close feedback"
                className="-mr-1.5 w-9 h-9 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
              >
                <CloseIcon size={16} />
              </button>
            </div>

            {phase === 'sent' ? (
              <div className="px-5 pb-5 space-y-4 animate-fadeIn">
                <p role="status" className="text-[14px] leading-relaxed text-slate-200">
                  {view === 'rate' && stars >= 4 && REVIEW_URL
                    ? 'Thank you. A public review helps other students find QADAM Hub.'
                    : view === 'rate'
                      ? 'Thank you. We read every rating.'
                      : 'Thank you. We read every report.'}
                </p>
                {view === 'rate' && stars >= 4 && REVIEW_URL && (
                  <a href={REVIEW_URL} target="_blank" rel="noopener noreferrer" className={`${primaryClass} inline-flex items-center justify-center`}>
                    Leave a public review
                  </a>
                )}
                <button type="button" onClick={closeDialog} className={quietClass}>
                  Close
                </button>
              </div>
            ) : view === 'menu' ? (
              <div className="px-5 pb-5 space-y-2.5">
                {[
                  { target: 'rate' as const, label: 'Rate the app', text: 'Two taps. Tell us how it feels so far.' },
                  { target: 'send' as const, label: 'Send feedback or report a bug', text: 'Something broken, confusing or missing?' },
                ].map((item, index) => (
                  <button
                    key={item.target}
                    type="button"
                    onClick={() => goTo(item.target)}
                    data-autofocus={index === 0 ? '' : undefined}
                    className="w-full text-left px-4 py-3.5 rounded-xl bg-black/25 hover:bg-white/5 border border-white/10 hover:border-white/20 transition-colors cursor-pointer flex items-center justify-between gap-3"
                  >
                    <span>
                      <span className="block text-[14px] font-semibold text-white">{item.label}</span>
                      <span className="mt-0.5 block text-[12px] text-slate-400">{item.text}</span>
                    </span>
                    <ChevronRightIcon size={16} className="text-slate-500 shrink-0" />
                  </button>
                ))}
              </div>
            ) : view === 'rate' ? (
              <form onSubmit={submit} className="px-5 pb-5 space-y-4" noValidate>
                <div>
                  <div role="radiogroup" aria-label="Rating" className="flex items-center justify-between gap-1">
                    {STAR_LABELS.map((label, index) => {
                      const value = index + 1;
                      return (
                        <button
                          key={label}
                          type="button"
                          role="radio"
                          aria-checked={stars === value}
                          aria-label={`${value} of 5, ${label}`}
                          data-autofocus={value === 1 ? '' : undefined}
                          onClick={() => setStars(value)}
                          className={`flex-1 h-12 rounded-lg inline-flex items-center justify-center transition-colors cursor-pointer ${
                            value <= stars ? 'text-amber-300' : 'text-slate-600 hover:text-slate-400'
                          }`}
                        >
                          <Star filled={value <= stars} />
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-1 h-4 text-center text-[12px] font-mono text-slate-400" aria-live="polite">
                    {stars > 0 ? STAR_LABELS[stars - 1] : ''}
                  </p>
                </div>
                <label className="block">
                  <span className="sr-only">Comment (optional)</span>
                  <textarea
                    value={comment}
                    onChange={(event) => setComment(event.target.value.slice(0, MAX_LENGTH))}
                    rows={3}
                    placeholder={stars > 0 && stars <= 3 ? 'What should we fix first? (optional)' : 'What do you like most? (optional)'}
                    className={fieldClass}
                  />
                </label>
                {honeypotField}
                {statusNotes}
                <button type="submit" disabled={!canSend} className={primaryClass}>
                  {phase === 'sending' ? 'Sending...' : 'Send rating'}
                </button>
                {privacyNote}
              </form>
            ) : (
              <form onSubmit={submit} className="px-5 pb-5 space-y-4" noValidate>
                <div role="radiogroup" aria-label="Feedback type" className="grid grid-cols-3 gap-1 p-1 rounded-lg bg-black/25 border border-white/10">
                  {TYPES.map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      role="radio"
                      aria-checked={type === item.value}
                      onClick={() => setType(item.value)}
                      className={`min-h-9 px-2 rounded-md text-[12px] font-medium transition-colors cursor-pointer ${
                        type === item.value ? 'bg-white/10 text-white border border-white/15' : 'text-slate-400 hover:text-slate-200 border border-transparent'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
                <label className="block">
                  <span className="sr-only">Your message</span>
                  <textarea
                    data-autofocus=""
                    value={text}
                    onChange={(event) => setText(event.target.value.slice(0, MAX_LENGTH))}
                    rows={6}
                    placeholder={hint}
                    className={fieldClass}
                  />
                </label>
                {honeypotField}
                <div className="flex items-center justify-between gap-3 text-[12px] font-mono text-slate-500">
                  <span className="truncate">Sent with: page {page}</span>
                  <span className={trimmed.length > 0 && trimmed.length < MIN_LENGTH ? 'text-amber-400' : ''}>
                    {trimmed.length}/{MAX_LENGTH}
                  </span>
                </div>
                {statusNotes}
                <button type="submit" disabled={!canSend} className={primaryClass}>
                  {phase === 'sending' ? 'Sending...' : 'Send feedback'}
                </button>
                {privacyNote}
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
};
