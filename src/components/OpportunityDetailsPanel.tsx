import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import type { Opportunity } from '../db/opportunities';
import { CloseIcon, ExternalLinkIcon } from './Icons';
import { ActivityStatus, loadLocalStatuses, loadMembership, setOpportunityStatus } from '../lib/cohorts';

// The details of one opportunity, opened in place on the Radar. The card grows into a full-width
// panel and the other cards move below it: no dimmed overlay, so the page stays readable.
// Text is large on purpose: 16px for the story, 15px for facts, never below 12px.
// It closes with its own Close button.

const STATUS_OPTIONS: { value: ActivityStatus; label: string }[] = [
  { value: 'saved', label: 'Saved' },
  { value: 'preparing', label: 'Preparing' },
  { value: 'applied', label: 'Applied' },
];

const factLabel = 'text-[12px] font-mono font-bold uppercase tracking-wider text-teal-900';
const factValue = 'mt-1 text-[15px] leading-snug font-semibold text-indigo-950';

export const OpportunityDetailsPanel: React.FC<{ opp: Opportunity; onClose: () => void }> = ({ opp, onClose }) => {
  const navigate = useNavigate();
  const { userProfile } = useApp();
  const root = useRef<HTMLElement>(null);
  const [status, setStatus] = useState<ActivityStatus | null>(null);
  const [statusError, setStatusError] = useState('');
  const membership = loadMembership();

  useEffect(() => {
    setStatusError('');
    setStatus(loadLocalStatuses()[opp.id] || null);
  }, [opp.id]);

  // Bring the opened panel to the top of the screen.
  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    root.current?.scrollIntoView({ block: 'start', behavior: reduce ? 'auto' : 'smooth' });
  }, [opp.id]);

  const details = opp.details || {};
  const hasProfileSkills = Boolean(userProfile.skills?.length);
  const isHighMatch = opp.match >= 80;
  const about = details.about || opp.description;

  // Learners in a cohort mark where they are; their staff see the counts.
  const changeStatus = async (next: ActivityStatus) => {
    if (!membership) return;
    const value = status === next ? null : next;
    const previous = status;
    setStatus(value);
    setStatusError('');
    try {
      await setOpportunityStatus(membership.userId, opp, value);
    } catch {
      setStatus(previous);
      setStatusError('Could not save. Check your connection and try again.');
    }
  };

  const facts: { label: string; value: string }[] = [
    { label: 'Deadline', value: opp.deadlineDate ? opp.deadline : 'No fixed date. See "When to apply"' },
    { label: 'Where', value: opp.location },
    { label: 'Level', value: (details.level || []).join(', ') },
    { label: 'Prize or stipend', value: opp.award },
    { label: 'Checked against the official page', value: details.verified || '' },
  ].filter((fact) => fact.value);

  return (
    <section
      ref={root}
      aria-labelledby="opp-details-title"
      className="animate-rise-in col-span-full scroll-mt-20 lg:scroll-mt-4 rounded-card bg-gradient-to-br from-[#EDF7F6] via-[#F3F6FF] to-[#E8F4F8] border-2 border-teal-400/70 shadow-[0_24px_60px_-20px_rgba(6,182,212,0.45)] text-slate-900"
    >
      <div className="px-5 sm:px-8 py-4 border-b border-teal-200/80 flex items-center justify-between gap-3 bg-teal-50/80 rounded-t-card">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="text-[12px] font-mono uppercase tracking-wider px-2.5 py-1 rounded bg-teal-500/10 border border-teal-300 text-teal-950 font-bold">
            {opp.type}
          </span>
          <span className="text-[13px] font-mono px-2.5 py-1 rounded border border-teal-200 bg-white text-teal-950 font-medium">
            {opp.organization}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close details"
          className="min-h-[44px] px-3 inline-flex items-center gap-2 text-[14px] font-semibold text-teal-900 hover:text-indigo-950 hover:bg-teal-100/70 rounded-btn cursor-pointer transition-colors"
        >
          <span>Close</span>
          <CloseIcon size={16} />
        </button>
      </div>

      <div className="px-5 sm:px-8 py-6 sm:py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <h3 id="opp-details-title" className="text-[24px] sm:text-[28px] font-bold text-indigo-950 leading-tight">
            {opp.title}
          </h3>

          <div>
            <h4 className={factLabel}>About</h4>
            <p className="mt-2 text-[16px] leading-7 text-slate-800">{about}</p>
          </div>

          {details.eligibility && (
            <div>
              <h4 className={factLabel}>Who can apply</h4>
              <p className="mt-2 text-[16px] leading-7 text-slate-800">{details.eligibility}</p>
            </div>
          )}

          {details.timing && (
            <div>
              <h4 className={factLabel}>When to apply</h4>
              <p className="mt-2 text-[16px] leading-7 text-slate-800">{details.timing}</p>
            </div>
          )}

          {opp.skills.length > 0 && (
            <div>
              <h4 className={factLabel}>Required tech stack</h4>
              <div className="mt-2 flex flex-wrap gap-2">
                {opp.skills.map((skill) => (
                  <span key={skill} className="px-3 py-1 rounded-btn text-[13px] font-mono border border-sky-300/70 text-sky-950 bg-sky-50 font-medium">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <aside className="space-y-4">
          {facts.length > 0 && (
            <dl className="space-y-3">
              {facts.map((fact) => (
                <div key={fact.label} className="p-4 bg-white rounded-btn border border-teal-200/80">
                  <dt className={factLabel}>{fact.label}</dt>
                  <dd className={factValue}>{fact.value}</dd>
                </div>
              ))}
            </dl>
          )}

          {opp.skills.length > 0 && hasProfileSkills && (
            <div className="p-4 bg-white rounded-btn border border-teal-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className={factLabel}>Match with your skills</span>
                <span className={`text-[14px] font-bold ${isHighMatch ? 'text-emerald-800' : 'text-slate-800'}`}>{opp.match}%</span>
              </div>
              <div className="w-full h-[6px] bg-teal-100 rounded-full overflow-hidden">
                <div
                  className={`h-full ${isHighMatch ? 'bg-gradient-to-r from-emerald-500 to-teal-500' : 'bg-slate-400'}`}
                  style={{ width: `${opp.match}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2.5 pt-1">
            <button
              type="button"
              onClick={() => navigate(`/application-studio?id=${opp.id}`)}
              className="min-h-[48px] px-5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white rounded-btn text-[15px] font-bold transition-all shadow-xs cursor-pointer"
            >
              Prepare &amp; Apply
            </button>
            {opp.url && (
              <a
                href={opp.url}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[48px] px-5 inline-flex items-center justify-center gap-2 rounded-btn border border-teal-300 bg-white hover:bg-teal-50 text-teal-950 text-[15px] font-semibold transition-colors"
              >
                <span>Official page</span>
                <ExternalLinkIcon size={14} />
              </a>
            )}
          </div>
        </aside>
      </div>

      {membership && (
        <div className="px-5 sm:px-8 py-4 border-t border-teal-200/80 bg-white/70 rounded-b-card">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`${factLabel} mr-1`}>My status</span>
            {STATUS_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => changeStatus(option.value)}
                aria-pressed={status === option.value}
                className={`min-h-[40px] px-4 rounded-full text-[14px] font-semibold transition-colors cursor-pointer ${
                  status === option.value
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white'
                    : 'bg-white border border-teal-200 text-teal-950 hover:bg-teal-50'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          {statusError ? (
            <p role="alert" className="mt-2 text-[13px] text-rose-700">{statusError}</p>
          ) : (
            <p className="mt-2 text-[13px] text-teal-900">Your program staff at {membership.institutionName || 'your institution'} can see this status.</p>
          )}
        </div>
      )}
    </section>
  );
};
