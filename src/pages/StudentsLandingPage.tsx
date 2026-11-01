import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AudienceSwitch } from '../components/landing/AudienceSwitch';
import { container, eyebrowDark, ghostButton, glassCard, primaryButton } from '../components/landing/landingStyles';
import { LegalLinks } from '../components/legal/LegalShell';
import { ChevronRightIcon } from '../components/Icons';
import { useApp } from '../context/AppContext';
import { isProfileValid } from '../db/userProfile';
import { usePageMeta } from '../lib/seo';

// Public landing for individual students (B2C). Same look as the schools landing.
// Every claim must be true today or carry a "Coming soon" chip.

type Status = 'live' | 'soon';

const STATUS_LABEL: Record<Status, string> = { live: 'Available now', soon: 'Coming soon' };
const STATUS_CLASS: Record<Status, string> = {
  live: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  soon: 'bg-amber-100 text-amber-800 border-amber-300',
};

const GOALS = ['MEXT Scholarship', 'University admissions abroad', 'Top GPA', 'Hackathons', 'Research internships'];

const FEATURES: { title: string; text: string; status: Status }[] = [
  {
    title: 'Opportunity Radar',
    text: 'Grants, internships and hackathons. Every listing has a deadline confirmed on the organizer page.',
    status: 'live',
  },
  {
    title: 'CV and Skill Lab',
    text: '235 skill quizzes and a CV gap check against each opportunity, so you know what to learn first.',
    status: 'live',
  },
  {
    title: 'Application prep',
    text: 'A checklist before you apply on the organizer site, with the gaps in your profile called out.',
    status: 'live',
  },
  {
    title: 'Alerts in Telegram and Discord',
    text: 'New listings that match your goals, in the messenger you already use.',
    status: 'live',
  },
  {
    title: 'Teammates and Network',
    text: 'Find people for a hackathon team and message them. Joining is your choice.',
    status: 'live',
  },
  {
    title: 'Private by default',
    text: 'Your profile stays on your device. You choose whether to join the shared network.',
    status: 'live',
  },
];

const STEPS = [
  ['Create a profile', 'Your name, university, skills and goals, for example a MEXT scholarship or a place at a university abroad.'],
  ['Get matched', 'The Radar shows how well each opportunity fits your skills and what is missing.'],
  ['Close the gaps', 'Take a quiz, fix your CV, then prepare the application.'],
];

export const StudentsLandingPage: React.FC = () => {
  usePageMeta('Grants, scholarships and hackathons for students | QADAM Hub', '/students');
  const navigate = useNavigate();
  const { userProfile } = useApp();
  const hasProfile = isProfileValid(userProfile);
  const start = () => navigate(hasProfile ? '/' : '/start');
  const startLabel = hasProfile ? 'Open my workspace' : 'Start free';

  return (
    <div className="min-h-[100dvh] bg-transparent text-slate-100 selection:bg-teal-500/20 selection:text-white font-sans antialiased relative">
      <header className="fixed top-0 left-0 right-0 z-40 bg-slate-900/60 backdrop-blur-md border-b border-teal-500/20 shadow-md">
        <div className="px-4 sm:px-6 md:px-12 h-16 flex items-center justify-between gap-3">
          <Link to="/students" className="flex items-center gap-3 min-w-0" aria-label="QADAM Hub for students">
            <img src="/brand/qadam-icon.png" alt="" className="w-8 h-8 object-contain rounded-md shrink-0" />
            <span className="text-[18px] font-mono font-bold tracking-tight text-white whitespace-nowrap">
              QADAM <span className="text-teal-300">Hub</span>
            </span>
          </Link>
          <AudienceSwitch active="students" className="hidden md:inline-grid" />
          <div className="flex items-center gap-2">
            <Link
              to="/student"
              className="hidden sm:inline-flex h-10 px-4 items-center rounded-btn text-[13px] font-semibold text-teal-100 hover:text-white hover:bg-teal-500/10 border border-teal-500/30 transition-colors"
            >
              I have an invite code
            </Link>
            <button
              type="button"
              onClick={start}
              className="h-10 px-4 sm:px-5 rounded-btn bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-[13px] font-semibold transition-all shadow-md shadow-emerald-900/30 cursor-pointer inline-flex items-center gap-2 whitespace-nowrap"
            >
              {startLabel}
              <ChevronRightIcon size={13} className="hidden sm:block" />
            </button>
          </div>
        </div>
      </header>

      <section className="min-h-[100dvh] flex flex-col items-center justify-center text-center px-4 sm:px-6 pt-28 pb-20 relative z-10 max-w-5xl mx-auto">
        <div className="space-y-6 sm:space-y-8 flex flex-col items-center">
          <AudienceSwitch active="students" className="md:hidden animate-rise-in" />
          <div className="animate-rise-in inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-teal-500/10 border border-teal-400/30 text-teal-200 text-[13px] font-mono tracking-wide backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>QADAM Hub · For students · Free during the beta</span>
          </div>
          <h1 className="animate-rise-in [animation-delay:60ms] text-[40px] sm:text-6xl lg:text-[72px] font-semibold tracking-[-0.025em] text-white leading-[1.05] max-w-4xl text-balance">
            Find grants, hackathons and scholarships that fit you
          </h1>
          <p className="animate-rise-in [animation-delay:120ms] text-lg sm:text-xl text-teal-100/85 leading-relaxed max-w-2xl mx-auto">
            Set a goal, check your skills with quizzes and see which real opportunities you can apply to now. No school or
            invite needed.
          </p>
          <div className="animate-rise-in [animation-delay:180ms] pt-2 flex flex-col sm:flex-row justify-center gap-3 w-full sm:w-auto">
            <button type="button" onClick={start} className={primaryButton}>
              {startLabel}
              <ChevronRightIcon size={18} />
            </button>
            <a href="#features" className={ghostButton}>
              See what you get
            </a>
          </div>
          <div className="animate-rise-in [animation-delay:240ms] flex flex-wrap justify-center gap-2 pt-2">
            {GOALS.map((goal) => (
              <span key={goal} className="px-3 py-1.5 rounded-full bg-slate-900/50 border border-teal-500/25 text-[12px] font-mono text-teal-200 backdrop-blur-md">
                {goal}
              </span>
            ))}
          </div>
        </div>
      </section>

      <div className="relative z-10 space-y-24 sm:space-y-32 pb-24">
        <section id="features" className={`${container} scroll-mt-24`}>
          <p className={eyebrowDark}>What you get</p>
          <h2 className="mt-3 text-[32px] sm:text-[44px] font-semibold tracking-[-0.02em] text-white leading-tight max-w-3xl">
            One place for the whole application path
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <article key={feature.title} className={`${glassCard} p-5 sm:p-6 flex flex-col gap-3 transition-transform duration-300 ease-out-expo hover:-translate-y-0.5`}>
                <span className={`self-start px-2 py-0.5 rounded-full border text-[12px] font-mono font-semibold ${STATUS_CLASS[feature.status]}`}>
                  {STATUS_LABEL[feature.status]}
                </span>
                <h3 className="text-[17px] font-bold text-indigo-950">{feature.title}</h3>
                <p className="text-[14px] leading-relaxed text-slate-700">{feature.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={container}>
          <p className={eyebrowDark}>How it works</p>
          <ol className="mt-6 grid gap-4 md:grid-cols-3">
            {STEPS.map(([title, text], index) => (
              <li key={title} className="rounded-2xl bg-slate-900/60 backdrop-blur-md border border-teal-500/25 p-5 sm:p-6">
                <span className="font-mono text-[12px] text-teal-300">0{index + 1}</span>
                <h3 className="mt-2 text-[18px] font-semibold text-white">{title}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-teal-100/85">{text}</p>
              </li>
            ))}
          </ol>
          <p className="mt-6 text-[13px] font-mono text-teal-200/80 max-w-2xl leading-relaxed">
            Your profile is stored on your device. Nothing is shared with other people unless you choose to join the network.
          </p>
        </section>

        <section className={container}>
          <div className="rounded-3xl bg-slate-900/60 backdrop-blur-md border border-teal-500/25 px-6 py-12 sm:px-12 sm:py-16 text-center">
            <h2 className="text-[32px] sm:text-[48px] font-semibold tracking-[-0.02em] text-white leading-tight">
              Start with one goal
            </h2>
            <p className="mt-4 text-lg text-teal-100/85 max-w-xl mx-auto leading-relaxed">
              Free while we are in beta. Tell us what is not working with the Feedback button inside the app.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row justify-center gap-3">
              <button type="button" onClick={start} className={primaryButton}>
                {startLabel}
                <ChevronRightIcon size={18} />
              </button>
              <Link to="/welcome" className={ghostButton}>
                For schools and training centers
              </Link>
            </div>
          </div>
        </section>
      </div>

      <footer className="border-t border-teal-500/20 pt-8 pb-10 px-6 md:px-12 bg-slate-950/60 backdrop-blur-md relative z-10">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-mini font-mono text-teal-200/80">
          <div className="flex items-center gap-2.5">
            <img src="/brand/qadam-icon.png" alt="" className="w-5 h-5 object-contain" />
            <span className="text-white font-bold">QADAM Hub</span>
            <span>© 2026</span>
          </div>
          <LegalLinks />
        </div>
      </footer>
    </div>
  );
};

export default StudentsLandingPage;
