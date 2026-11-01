import React, { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AccessCard, NetworkAccess } from '../components/NetworkAccess';
import { OnboardingWizard } from '../components/OnboardingWizard';
import { useApp } from '../context/AppContext';
import { isProfileValid } from '../db/userProfile';
import { networkClient } from '../lib/network';
import {
  Membership,
  fetchMembership,
  fetchMyStatuses,
  inviteInfo,
  joinCohort,
  normalizeInviteCode,
  saveMembership,
  syncLearnerProgress,
} from '../lib/cohorts';

// Learners enter only through their institution: email sign-in, then an invite code
// from staff (or an invite link that carries it). No code, no access.

const inputClass =
  'w-full h-11 px-3.5 bg-white border border-teal-200/90 rounded-xl text-base md:text-[15px] text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none shadow-xs font-mono tracking-[0.2em] uppercase text-center';
const primaryClass =
  'w-full h-11 rounded-btn bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white text-[14px] font-semibold transition-all shadow-md shadow-emerald-900/20 cursor-pointer disabled:opacity-60 disabled:cursor-wait';

function StudentGate({ user, initialCode }: { user: User; initialCode: string }) {
  const navigate = useNavigate();
  const { userProfile, setIsOnboardingOpen, updateUserProfile } = useApp();
  const [phase, setPhase] = useState<'checking' | 'code' | 'profile'>('checking');
  const [code, setCode] = useState(initialCode);
  const [preview, setPreview] = useState<{ cohortName: string; institutionName: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const proceed = async (membership: Membership) => {
    saveMembership(membership);
    fetchMyStatuses(user.id).catch(() => undefined);
    if (isProfileValid(userProfile)) {
      syncLearnerProgress(user.id, userProfile).catch(() => undefined);
      navigate('/', { replace: true });
      return;
    }
    if (!userProfile.email && user.email) updateUserProfile({ email: user.email });
    setPhase('profile');
    setIsOnboardingOpen(true);
  };

  useEffect(() => {
    let alive = true;
    fetchMembership(user.id)
      .then((membership) => {
        if (!alive) return;
        if (membership) proceed(membership);
        else setPhase('code');
      })
      .catch((e) => {
        if (!alive) return;
        setError(e instanceof Error ? e.message : 'Could not check your cohort.');
        setPhase('code');
      });
    return () => {
      alive = false;
    };
    // Runs once per signed-in user.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  useEffect(() => {
    const clean = normalizeInviteCode(code);
    if (clean.length < 6) {
      setPreview(null);
      return;
    }
    let alive = true;
    const timer = window.setTimeout(() => {
      inviteInfo(clean)
        .then((info) => alive && setPreview(info))
        .catch(() => alive && setPreview(null));
    }, 300);
    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, [code]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (normalizeInviteCode(code).length < 6) {
      setError('Enter the invite code from your institution.');
      return;
    }
    setBusy(true);
    try {
      await proceed(await joinCohort(code, user.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not join the cohort. Please retry.');
    } finally {
      setBusy(false);
    }
  };

  const signOut = async () => {
    await networkClient?.auth.signOut();
  };

  if (phase === 'checking') {
    return (
      <p className="relative z-10 p-8 text-teal-100 font-mono text-mini text-center" role="status">
        Checking your cohort...
      </p>
    );
  }

  if (phase === 'profile') {
    return (
      <>
        <AccessCard title="Almost there" brandLine="QADAM Hub · Student access">
          <p className="text-[14px] text-teal-950 leading-relaxed">
            You joined your cohort. Fill in your profile to start getting matched opportunities.
          </p>
          <button type="button" onClick={() => setIsOnboardingOpen(true)} className={primaryClass}>
            Fill in my profile
          </button>
        </AccessCard>
        <OnboardingWizard />
      </>
    );
  }

  return (
    <AccessCard title="Join your cohort" brandLine="QADAM Hub · Student access">
      <p className="text-[14px] text-teal-950 leading-relaxed">
        Signed in as <strong>{user.email}</strong>. QADAM Hub is available to learners of partner institutions. Enter the
        invite code your institution gave you.
      </p>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <label className="block">
          <span className="block mb-1 text-mini font-mono uppercase tracking-wider text-teal-900 font-semibold">Invite code</span>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="A1B2C3D4E5"
            autoComplete="off"
            maxLength={24}
            className={inputClass}
            aria-invalid={Boolean(error)}
          />
        </label>
        {preview && (
          <p className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-[13px] text-emerald-900">
            You are joining <strong>{preview.cohortName}</strong>
            {preview.institutionName ? ` at ${preview.institutionName}` : ''}.
          </p>
        )}
        {error && (
          <p role="alert" className="p-2.5 rounded-btn bg-rose-50 border border-rose-200 text-[13px] text-rose-700">
            {error}
          </p>
        )}
        <button type="submit" disabled={busy} className={primaryClass}>
          {busy ? 'Joining...' : 'Join cohort'}
        </button>
      </form>
      <p className="text-[12px] text-teal-800 leading-relaxed">
        No code? Ask your program lead. Institutions can request a pilot on the{' '}
        <a href="/welcome?pilot=1" className="underline hover:text-emerald-700">
          QADAM Hub page
        </a>
        .
      </p>
      <button type="button" onClick={signOut} className="block mx-auto text-mini font-mono text-teal-800 hover:text-emerald-700 underline cursor-pointer">
        Use another email
      </button>
    </AccessCard>
  );
}

export const StudentAccessPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [initialCode] = useState(() => normalizeInviteCode(searchParams.get('code') || ''));
  const [invite, setInvite] = useState<{ cohortName: string; institutionName: string } | null>(null);

  useEffect(() => {
    if (!initialCode || !networkClient) return;
    inviteInfo(initialCode).then(setInvite).catch(() => setInvite(null));
  }, [initialCode]);

  const intro = invite
    ? `You are invited to ${invite.cohortName}${invite.institutionName ? ` at ${invite.institutionName}` : ''}. Verify your email to continue.`
    : 'QADAM Hub is available to learners of partner institutions. Verify your email, then enter the invite code from your institution.';

  return (
    <NetworkAccess title="Student sign in" intro={intro} brandLine="QADAM Hub · Student access">
      {(user) => <StudentGate user={user} initialCode={initialCode} />}
    </NetworkAccess>
  );
};
