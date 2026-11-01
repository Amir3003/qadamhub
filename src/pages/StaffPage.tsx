import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { AccessCard, NetworkAccess } from '../components/NetworkAccess';
import { CheckIcon, CopyIcon, LogOutIcon, PlusIcon, RefreshIcon, SearchIcon, UsersIcon } from '../components/Icons';
import { networkClient } from '../lib/network';
import {
  Cohort,
  Institution,
  RosterRow,
  cohortRoster,
  createCohort,
  listCohorts,
  myInstitutions,
  removeLearner,
  rosterCsv,
  studentInviteUrl,
} from '../lib/cohorts';

// Staff workspace (Phase 2): cohorts, invite links and a roster of learner progress.
// Access is enforced by row level security; this page only shows what the API returns.

const glass =
  'rounded-2xl bg-gradient-to-br from-[#EDF7F6]/95 via-[#F3F6FF]/95 to-[#E8F4F8]/95 backdrop-blur-xl border border-teal-300/40 shadow-[0_20px_50px_-20px_rgba(6,182,212,0.25)] text-slate-900';
const primary =
  'h-10 px-4 rounded-btn bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white text-[13px] font-semibold transition-all shadow-md shadow-emerald-900/20 cursor-pointer disabled:opacity-60 inline-flex items-center justify-center gap-2';
const secondary =
  'h-10 px-3.5 rounded-btn border border-teal-300/80 bg-white/90 hover:bg-white text-teal-900 text-[13px] font-semibold transition-colors cursor-pointer inline-flex items-center justify-center gap-2 disabled:opacity-60';
const input =
  'w-full h-10 px-3 bg-white border border-teal-200/90 rounded-xl text-[14px] text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none';

function formatDate(value: string | null) {
  if (!value) return '';
  return new Date(value.length === 10 ? `${value}T00:00:00` : value).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function errorText(e: unknown) {
  return e instanceof Error ? e.message : 'Something went wrong. Please retry.';
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className={secondary}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1600);
        } catch {
          window.prompt('Copy this:', value);
        }
      }}
    >
      {copied ? <CheckIcon size={14} /> : <CopyIcon size={14} />}
      {copied ? 'Copied' : label}
    </button>
  );
}

function NewCohortForm({ institutionId, onCreated }: { institutionId: string; onCreated: (cohort: Cohort) => void }) {
  const [name, setName] = useState('');
  const [startsOn, setStartsOn] = useState('');
  const [endsOn, setEndsOn] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (name.trim().length < 2) {
      setError('Give the cohort a name, for example "Data Analytics, Fall 2026".');
      return;
    }
    if (startsOn && endsOn && endsOn < startsOn) {
      setError('The end date is before the start date.');
      return;
    }
    setBusy(true);
    try {
      onCreated(await createCohort(institutionId, name, startsOn, endsOn));
      setName('');
      setStartsOn('');
      setEndsOn('');
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3" noValidate>
      <label className="block">
        <span className="block mb-1 text-[12px] font-semibold text-indigo-950">Cohort name</span>
        <input className={input} value={name} onChange={(e) => setName(e.target.value)} maxLength={120} placeholder="Data Analytics, Fall 2026" />
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="block mb-1 text-[12px] font-semibold text-indigo-950">Starts</span>
          <input type="date" className={input} value={startsOn} onChange={(e) => setStartsOn(e.target.value)} />
        </label>
        <label className="block">
          <span className="block mb-1 text-[12px] font-semibold text-indigo-950">Ends</span>
          <input type="date" className={input} value={endsOn} onChange={(e) => setEndsOn(e.target.value)} />
        </label>
      </div>
      <p className="text-[12px] text-teal-800 leading-relaxed">The invite code stops working after the end date.</p>
      {error && <p role="alert" className="text-[12px] text-rose-700">{error}</p>}
      <button type="submit" disabled={busy} className={`${primary} w-full`}>
        <PlusIcon size={14} />
        {busy ? 'Creating...' : 'Create cohort'}
      </button>
    </form>
  );
}

function Roster({ cohort }: { cohort: Cohort }) {
  const [rows, setRows] = useState<RosterRow[] | null>(null);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'applied' | 'attention'>('all');
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError('');
    try {
      setRows(await cohortRoster(cohort.id));
    } catch (e) {
      setError(errorText(e));
      setRows([]);
    }
  }, [cohort.id]);

  useEffect(() => {
    setRows(null);
    load();
  }, [load]);

  const stats = useMemo(() => {
    const list = rows || [];
    const avg = list.length ? Math.round(list.reduce((sum, r) => sum + r.profile_completion, 0) / list.length) : 0;
    return {
      learners: list.length,
      avgProfile: avg,
      applying: list.filter((r) => r.preparing + r.applied > 0).length,
      applied: list.reduce((sum, r) => sum + r.applied, 0),
    };
  }, [rows]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (rows || []).filter((r) => {
      if (q && !`${r.full_name} ${r.email} ${r.track}`.toLowerCase().includes(q)) return false;
      if (filter === 'applied') return r.applied > 0;
      if (filter === 'attention') return r.profile_completion < 60 || r.saved + r.preparing + r.applied === 0;
      return true;
    });
  }, [rows, query, filter]);

  const exportCsv = () => {
    const blob = new Blob([rosterCsv(rows || [])], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${cohort.name.replace(/[^\w-]+/g, '_')}_learners.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const remove = async (userId: string) => {
    try {
      await removeLearner(cohort.id, userId);
      setConfirmRemove(null);
      load();
    } catch (e) {
      setError(errorText(e));
    }
  };

  const inviteLink = studentInviteUrl(cohort.invite_code);
  const expired = Boolean(cohort.ends_on && cohort.ends_on < new Date().toISOString().slice(0, 10));

  return (
    <div className="space-y-5">
      <div className={`${glass} p-5 sm:p-6`}>
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[12px] font-mono uppercase tracking-wider text-teal-800">Cohort</p>
            <h2 className="text-[22px] font-bold text-indigo-950 tracking-tight break-words">{cohort.name}</h2>
            <p className="text-[13px] text-teal-900 mt-1">
              {cohort.starts_on || cohort.ends_on
                ? `${formatDate(cohort.starts_on) || 'No start date'} to ${formatDate(cohort.ends_on) || 'no end date'}`
                : 'No dates set'}
              {expired && <span className="ml-2 text-rose-700 font-semibold">Ended, invite code closed</span>}
            </p>
          </div>
          <div className="space-y-2 lg:text-right">
            <p className="text-[12px] font-mono uppercase tracking-wider text-teal-800">Invite code</p>
            <p className="text-[24px] font-mono font-bold tracking-[0.18em] text-indigo-950">{cohort.invite_code}</p>
            <div className="flex flex-wrap gap-2 lg:justify-end">
              <CopyButton value={inviteLink} label="Copy invite link" />
              <CopyButton value={cohort.invite_code} label="Copy code" />
            </div>
          </div>
        </div>
        <p className="mt-4 text-[12px] text-teal-800 leading-relaxed">
          Send the link to your learners. They sign in with their email and join this cohort; without the code nobody can
          sign up.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Learners', value: stats.learners },
          { label: 'Avg. profile', value: `${stats.avgProfile}%` },
          { label: 'Preparing or applied', value: stats.applying },
          { label: 'Applications', value: stats.applied },
        ].map((stat) => (
          <div key={stat.label} className={`${glass} p-4`}>
            <p className="text-[26px] font-mono font-bold text-indigo-950">{rows ? stat.value : '...'}</p>
            <p className="text-[12px] text-teal-800">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className={`${glass} overflow-hidden`}>
        <div className="p-4 flex flex-col md:flex-row md:items-center gap-3 border-b border-teal-200/70">
          <div className="flex gap-1.5 flex-wrap">
            {([
              ['all', 'All learners'],
              ['applied', 'Applied'],
              ['attention', 'Needs attention'],
            ] as const).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={`h-9 px-3 rounded-full text-[12px] font-semibold cursor-pointer transition-colors ${
                  filter === key ? 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white' : 'bg-white/80 text-teal-900 border border-teal-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="relative md:ml-auto md:w-64">
            <SearchIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-teal-700" />
            <input className={`${input} pl-8`} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name or email" />
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={load} className={secondary} aria-label="Refresh">
              <RefreshIcon size={14} />
            </button>
            <button type="button" onClick={exportCsv} disabled={!rows?.length} className={secondary}>
              Export CSV
            </button>
          </div>
        </div>

        {error && <p role="alert" className="m-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-[13px] text-rose-700">{error}</p>}

        {rows === null ? (
          <p className="p-6 text-[13px] text-teal-800 font-mono" role="status">Loading learners...</p>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center space-y-2">
            <UsersIcon size={28} className="mx-auto text-teal-600" />
            <p className="text-[15px] font-semibold text-indigo-950">No learners yet</p>
            <p className="text-[13px] text-teal-800">Share the invite link above. Learners appear here as soon as they join.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left">
              <thead>
                <tr className="text-[12px] font-mono uppercase tracking-wider text-teal-800">
                  <th className="font-semibold px-4 py-3">Learner</th>
                  <th className="font-semibold px-3 py-3">Profile</th>
                  <th className="font-semibold px-3 py-3">Saved</th>
                  <th className="font-semibold px-3 py-3">Preparing</th>
                  <th className="font-semibold px-3 py-3">Applied</th>
                  <th className="font-semibold px-3 py-3">Next deadline</th>
                  <th className="font-semibold px-3 py-3">Last active</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-teal-100 border-t border-teal-100">
                {visible.map((r) => (
                  <tr key={r.user_id} className="text-[13px] text-indigo-950 bg-white/40">
                    <td className="px-4 py-3">
                      <p className="font-semibold">{r.full_name || 'Profile not filled in'}</p>
                      <p className="text-[12px] text-teal-800">{r.email}{r.track ? ` · ${r.track}` : ''}</p>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <span className="w-16 h-1.5 rounded-full bg-teal-100 overflow-hidden">
                          <span className="block h-full bg-gradient-to-r from-emerald-600 to-teal-700" style={{ width: `${r.profile_completion}%` }} />
                        </span>
                        <span className="font-mono text-[12px]">{r.profile_completion}%</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 font-mono">{r.saved}</td>
                    <td className="px-3 py-3 font-mono">{r.preparing}</td>
                    <td className="px-3 py-3 font-mono">{r.applied}</td>
                    <td className="px-3 py-3">{formatDate(r.next_deadline) || 'None'}</td>
                    <td className="px-3 py-3">{formatDate(r.last_active) || formatDate(r.joined_at)}</td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {confirmRemove === r.user_id ? (
                        <span className="inline-flex gap-2">
                          <button type="button" onClick={() => remove(r.user_id)} className="h-8 px-3 rounded-btn bg-rose-600 text-white text-[12px] font-semibold cursor-pointer">
                            Remove
                          </button>
                          <button type="button" onClick={() => setConfirmRemove(null)} className="h-8 px-3 rounded-btn border border-teal-300 bg-white text-[12px] cursor-pointer">
                            Cancel
                          </button>
                        </span>
                      ) : (
                        <button type="button" onClick={() => setConfirmRemove(r.user_id)} className="h-8 px-3 rounded-btn text-[12px] text-teal-800 hover:text-rose-700 cursor-pointer">
                          Remove
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {visible.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-6 text-center text-[13px] text-teal-800">No learners match this filter.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StaffWorkspace({ user }: { user: User }) {
  const [institutions, setInstitutions] = useState<Institution[] | null>(null);
  const [institutionId, setInstitutionId] = useState('');
  const [cohorts, setCohorts] = useState<Cohort[] | null>(null);
  const [cohortId, setCohortId] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    myInstitutions(user.id)
      .then((list) => {
        setInstitutions(list);
        if (list[0]) setInstitutionId(list[0].id);
      })
      .catch((e) => {
        setError(errorText(e));
        setInstitutions([]);
      });
  }, [user.id]);

  useEffect(() => {
    if (!institutionId) return;
    setCohorts(null);
    listCohorts(institutionId)
      .then((list) => {
        setCohorts(list);
        setCohortId(list[0]?.id || '');
      })
      .catch((e) => {
        setError(errorText(e));
        setCohorts([]);
      });
  }, [institutionId]);

  const signOut = () => networkClient?.auth.signOut();

  if (institutions === null) {
    return <p className="relative z-10 p-8 text-teal-100 font-mono text-mini text-center" role="status">Loading your institution...</p>;
  }

  if (institutions.length === 0) {
    return (
      <AccessCard title="No institution linked yet" brandLine="QADAM Hub · Staff workspace">
        <p className="text-[14px] text-teal-950 leading-relaxed">
          You are signed in as <strong>{user.email}</strong>, but this email is not linked to an institution. If your center
          runs a pilot with QADAM Hub, send this email to the QADAM team and we will link it.
        </p>
        {error && <p role="alert" className="text-[13px] text-rose-700">{error}</p>}
        <a href="/welcome?pilot=1" className={`${primary} w-full`}>Request a pilot</a>
        <button type="button" onClick={signOut} className="block mx-auto text-mini font-mono text-teal-800 hover:text-emerald-700 underline cursor-pointer">
          Use another email
        </button>
      </AccessCard>
    );
  }

  const institution = institutions.find((inst) => inst.id === institutionId);
  const cohort = cohorts?.find((c) => c.id === cohortId);

  return (
    <div className="relative z-10 min-h-[100dvh] pb-28 lg:pb-12">
      <header className="sticky top-0 z-30 bg-slate-900/70 backdrop-blur-md border-b border-teal-500/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <img src="/brand/qadam-icon.png" alt="" className="w-8 h-8 rounded-md shrink-0" />
            <div className="min-w-0">
              <p className="text-[15px] font-bold text-white truncate">{institution?.name}</p>
              <p className="text-[12px] font-mono text-teal-300 truncate">Staff workspace · {user.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {institutions.length > 1 && (
              <select
                value={institutionId}
                onChange={(e) => setInstitutionId(e.target.value)}
                className="h-9 px-2 rounded-btn bg-slate-800 border border-teal-500/30 text-teal-100 text-[12px]"
                aria-label="Institution"
              >
                {institutions.map((inst) => <option key={inst.id} value={inst.id}>{inst.name}</option>)}
              </select>
            )}
            <button type="button" onClick={signOut} className="h-9 px-3 rounded-btn border border-teal-500/30 text-teal-100 hover:text-white text-[12px] font-semibold inline-flex items-center gap-2 cursor-pointer">
              <LogOutIcon size={14} />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 grid lg:grid-cols-[280px_1fr] gap-6">
        <aside className="space-y-4">
          <div className={`${glass} p-4`}>
            <p className="text-[12px] font-mono uppercase tracking-wider text-teal-800 mb-2">Cohorts</p>
            {cohorts === null ? (
              <p className="text-[13px] text-teal-800" role="status">Loading...</p>
            ) : cohorts.length === 0 ? (
              <p className="text-[13px] text-teal-800">No cohorts yet. Create the first one below.</p>
            ) : (
              <ul className="space-y-1">
                {cohorts.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => setCohortId(c.id)}
                      className={`w-full text-left px-3 py-2.5 rounded-xl text-[13px] cursor-pointer transition-colors ${
                        c.id === cohortId ? 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white font-semibold' : 'hover:bg-white/80 text-indigo-950'
                      }`}
                    >
                      {c.name}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className={`${glass} p-4`}>
            <p className="text-[12px] font-mono uppercase tracking-wider text-teal-800 mb-3">New cohort</p>
            <NewCohortForm
              institutionId={institutionId}
              onCreated={(created) => {
                setCohorts((list) => [created, ...(list || [])]);
                setCohortId(created.id);
              }}
            />
          </div>
        </aside>

        <section className="min-w-0">
          {error && <p role="alert" className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-[13px] text-rose-700">{error}</p>}
          {cohort ? (
            <Roster key={cohort.id} cohort={cohort} />
          ) : (
            <div className={`${glass} p-8 text-center`}>
              <p className="text-[16px] font-semibold text-indigo-950">Create your first cohort</p>
              <p className="text-[13px] text-teal-800 mt-1">You will get an invite code and link to send to your learners.</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export const StaffPage: React.FC = () => (
  <NetworkAccess
    title="Staff sign in"
    intro="For staff of partner institutions. Verify your work email to open your cohorts and see learner progress."
    brandLine="QADAM Hub · Staff workspace"
  >
    {(user) => <StaffWorkspace user={user} />}
  </NetworkAccess>
);
