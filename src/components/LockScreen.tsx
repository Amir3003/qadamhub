import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { verifyProfilePassword } from '../lib/passwordLock';
import { ShieldIcon } from './Icons';

// Shown instead of the app when the profile on this device has a password. It is a lock for people
// who pick up the device or the browser, not encryption of the data. There is no way to reset a
// forgotten password, because nothing is stored on a server: the way back in is to erase the data
// on this device. The screen has no close button on purpose.

const FAIL_KEY = 'qadam_lock_fail_v1';
const MAX_TRIES = 5;
const PAUSE_SECONDS = 30;

function readFails(): { count: number; until: number } {
  try {
    const raw = JSON.parse(sessionStorage.getItem(FAIL_KEY) || '{}');
    return { count: Number(raw.count) || 0, until: Number(raw.until) || 0 };
  } catch {
    return { count: 0, until: 0 };
  }
}

function writeFails(value: { count: number; until: number }) {
  try {
    sessionStorage.setItem(FAIL_KEY, JSON.stringify(value));
  } catch {
    // The pause then only lasts until the page is reloaded.
  }
}

export const LockScreen: React.FC = () => {
  const { userProfile, unlockSession, resetToDefaultProfile } = useApp();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmErase, setConfirmErase] = useState(false);
  const [waitUntil, setWaitUntil] = useState<number>(() => readFails().until);
  const [now, setNow] = useState(() => Date.now());
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    input.current?.focus();
  }, []);

  // Count the pause down.
  useEffect(() => {
    if (waitUntil <= Date.now()) return;
    const timer = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(timer);
  }, [waitUntil]);

  const secondsLeft = Math.max(0, Math.ceil((waitUntil - now) / 1000));
  const paused = secondsLeft > 0;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy || paused || !password) return;
    setBusy(true);
    setError('');
    const ok = await verifyProfilePassword(password, userProfile);
    setBusy(false);
    if (ok) {
      writeFails({ count: 0, until: 0 });
      unlockSession();
      return;
    }
    const fails = readFails();
    const count = fails.count + 1;
    if (count >= MAX_TRIES) {
      const until = Date.now() + PAUSE_SECONDS * 1000;
      writeFails({ count: 0, until });
      setWaitUntil(until);
      setNow(Date.now());
      setError('');
    } else {
      writeFails({ count, until: 0 });
      setError(`Wrong password. ${MAX_TRIES - count} ${MAX_TRIES - count === 1 ? 'try' : 'tries'} left before a short pause.`);
    }
    setPassword('');
  };

  const first = (userProfile.name || '').trim();

  return (
    <div className="min-h-[100dvh] flex items-center justify-center p-4 bg-transparent text-slate-900 font-sans relative z-10">
      <div className="w-full max-w-sm rounded-card bg-gradient-to-br from-[#EDF7F6] via-[#F3F6FF] to-[#E8F4F8] border border-teal-300/60 shadow-2xl p-6 sm:p-7 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-btn bg-emerald-50 border border-emerald-200 flex items-center justify-center flex-shrink-0">
            <ShieldIcon size={20} className="text-emerald-700" />
          </div>
          <div className="min-w-0">
            <h1 className="text-[19px] font-bold text-indigo-950 leading-tight">Unlock QADAM</h1>
            <p className="text-[13px] text-slate-700 mt-0.5 truncate">{first ? `Profile of ${first} on this device` : 'Profile on this device'}</p>
          </div>
        </div>

        {!confirmErase ? (
          <form onSubmit={submit} className="space-y-3" noValidate>
            <label className="block">
              <span className="block text-mini font-mono uppercase text-teal-900 font-semibold mb-1.5">Password</span>
              <input
                ref={input}
                type="password"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setError('');
                }}
                autoComplete="current-password"
                placeholder="Enter your password"
                disabled={paused}
                className="w-full h-12 px-3.5 bg-white border border-teal-200 focus:border-emerald-600 rounded-xl text-base md:text-[14px] text-slate-900 placeholder:text-slate-500 outline-none font-mono disabled:opacity-60"
              />
            </label>
            {error && <p role="alert" className="text-[13px] text-rose-700">{error}</p>}
            {paused && <p role="alert" className="text-[13px] text-amber-800">Too many wrong tries. Try again in {secondsLeft} seconds.</p>}
            <button
              type="submit"
              disabled={busy || paused || !password}
              className="w-full min-h-[48px] rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-[15px] font-semibold shadow-md shadow-emerald-900/20 cursor-pointer"
            >
              {busy ? 'Checking...' : 'Unlock'}
            </button>
            <p className="text-[13px] text-slate-700 leading-relaxed">
              This lock keeps other people out of the profile saved on this device. Your data never left it.
            </p>
            <button
              type="button"
              onClick={() => setConfirmErase(true)}
              className="text-[13px] font-mono text-teal-900 hover:text-indigo-950 underline underline-offset-2 cursor-pointer min-h-[40px]"
            >
              Forgot the password?
            </button>
          </form>
        ) : (
          <div className="space-y-3">
            <p className="text-[14px] text-slate-800 leading-relaxed">
              A forgotten password cannot be reset, because nothing is saved on a server. To get back in you must erase the profile, CV text, Agent Memory and progress from this device and start again.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={resetToDefaultProfile}
                className="min-h-[46px] px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-[14px] font-semibold cursor-pointer"
              >
                Erase and start again
              </button>
              <button
                type="button"
                onClick={() => setConfirmErase(false)}
                className="min-h-[46px] px-4 rounded-xl bg-white border border-teal-200 text-teal-950 text-[14px] font-semibold cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
