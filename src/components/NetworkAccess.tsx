import React, { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { checked, networkClient } from "../lib/network";

export function NetworkAccess({
  children,
  title = "Sign in to the shared network",
  intro = "Verify your email to connect with real teammates on any device. Your existing local workspace stays on this device.",
  brandLine = "QADAM network",
}: {
  children: (user: User) => React.ReactNode;
  title?: string;
  intro?: string;
  brandLine?: string;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!networkClient) {
      setLoading(false);
      return;
    }
    let alive = true;
    networkClient.auth.getSession().then(({ data, error }) => {
      if (alive) {
        setUser(data.session?.user || null);
        setLoading(false);
        if (error) setError(error.message);
      }
    });
    const { data } = networkClient.auth.onAuthStateChange((_event, session) => {
      if (alive) {
        setUser(session?.user || null);
        setLoading(false);
      }
    });
    return () => {
      alive = false;
      data.subscription.unsubscribe();
    };
  }, []);
  if (!networkClient)
    return (
      <AccessCard title="Shared network is not connected yet">
        <p className="text-[13px] text-teal-950 leading-relaxed">
          The team needs to finish setting up the shared network service.
          Profiles, invitations and chats will become available here once it is
          connected.
        </p>
      </AccessCard>
    );
  if (loading)
    return (
      <p className="p-8 text-teal-100 font-mono text-mini text-center" role="status">
        Checking network account...
      </p>
    );
  if (user)
    return <React.Fragment key={user.id}>{children(user)}</React.Fragment>;
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (!sent) {
        checked(
          await networkClient!.auth.signInWithOtp({
            email: email.trim(),
            options: { shouldCreateUser: true },
          }),
        );
        setSent(true);
      } else
        checked(
          await networkClient!.auth.verifyOtp({
            email: email.trim(),
            token: code.trim(),
            type: "email",
          }),
        );
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Unable to sign in. Please retry.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <AccessCard title={title} step={sent ? 2 : 1} brandLine={brandLine}>
      <p className="text-[13px] text-teal-950 leading-relaxed">
        {sent
          ? `We sent a sign-in code to ${email.trim()}. Check your inbox and spam folder.`
          : intro}
      </p>
      <form onSubmit={submit} className="space-y-4">
        <label className="block">
          <span className={labelClass}>Email</span>
          <input
            required
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            disabled={sent || busy}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
        </label>
        {sent && (
          <label className="block">
            <span className={labelClass}>Code from your email</span>
            <input
              required
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="123456"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className={`${inputClass} font-mono tracking-[0.3em] text-center`}
            />
          </label>
        )}
        {error && (
          <p
            role="alert"
            className="p-2.5 rounded-btn bg-rose-50 border border-rose-200 text-mini font-mono text-rose-700"
          >
            {error}
          </p>
        )}
        <button
          disabled={busy}
          className="w-full h-11 rounded-btn bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white text-[13px] font-mono font-semibold transition-all shadow-md shadow-emerald-900/20 cursor-pointer disabled:opacity-60 disabled:cursor-wait"
        >
          {busy
            ? "Please wait..."
            : sent
              ? "Verify and continue"
              : "Send sign-in code"}
        </button>
        {sent && (
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setSent(false);
              setCode("");
              setError("");
            }}
            className="block mx-auto text-mini font-mono text-teal-800 hover:text-emerald-700 underline cursor-pointer"
          >
            Use another email / resend code
          </button>
        )}
      </form>
    </AccessCard>
  );
}

const labelClass =
  "block mb-1 text-mini font-mono uppercase tracking-wider text-teal-900 font-semibold";
const inputClass =
  "w-full h-11 px-3.5 bg-white border border-teal-200/90 rounded-xl text-base md:text-[13px] text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none shadow-xs transition-colors disabled:bg-slate-50 disabled:text-slate-500";

export function AccessCard({
  title,
  step,
  brandLine = "QADAM network",
  children,
}: {
  title: string;
  step?: 1 | 2;
  brandLine?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative z-10 min-h-[100dvh] flex items-center justify-center px-4 py-12 pb-28">
      <div className="w-full max-w-md bg-gradient-to-br from-[#EDF7F6] via-[#F3F6FF] to-[#E8F4F8] border border-teal-300/60 rounded-card shadow-[0_24px_60px_-15px_rgba(6,182,212,0.3)] overflow-hidden text-slate-900">
        <div className="px-6 py-4 border-b border-teal-200/80 bg-white/75 flex items-center gap-3">
          <img
            src="/brand/qadam-icon.png"
            alt="QADAM Logo"
            className="w-8 h-8 object-contain rounded-md"
          />
          <div className="min-w-0">
            <h1 className="text-[16px] font-bold text-indigo-950 leading-tight">
              {title}
            </h1>
            <div className="text-mini font-mono text-teal-800">
              {step
                ? `Step ${step} of 2: ${step === 1 ? "Email" : "Verification code"}`
                : brandLine}
            </div>
          </div>
        </div>
        <div className="p-6 space-y-5">{children}</div>
        <div className="px-6 py-3 border-t border-teal-200/80 bg-white/50 text-center">
          <a
            href="/students"
            className="text-mini font-mono text-teal-800 hover:text-emerald-700"
          >
            Back to QADAM
          </a>
        </div>
      </div>
    </div>
  );
}
