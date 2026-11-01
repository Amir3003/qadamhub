import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { PilotRequestModal } from '../components/PilotRequestModal';
import { CONTACT_EMAIL } from '../lib/pilotRequests';
import { CookieSettingsButton } from '../components/legal/Consent';
import { usePageMeta } from '../lib/seo';
import { AudienceSwitch } from '../components/landing/AudienceSwitch';
import { container, eyebrowDark, ghostButton, glassCard, primaryButton } from '../components/landing/landingStyles';

const WELCOME_TITLE = 'Career support for schools, universities and training centers | QADAM Hub';
import {
  BarChartIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CloseIcon,
  DiscordIcon,
  FileTextIcon,
  MailIcon,
  MenuIcon,
  TelegramIcon,
  UsersIcon,
} from '../components/Icons';

// Public B2B landing for schools, universities and training centers.
// Original QADAM look: dark ambient ground, light glass cards, emerald to teal actions,
// the scroll-locked 3D card showcase, then alternating left and right "stops".
// Every claim must be true today or carry a status chip.

type Status = 'live' | 'early' | 'pilot';
type Stage = 0 | 1 | 2 | 3;

const STATUS_LABEL: Record<Status, string> = {
  live: 'Available now',
  early: 'Early version',
  pilot: 'Coming in pilot',
};

const STATUS_CLASS: Record<Status, string> = {
  live: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  early: 'bg-indigo-100 text-indigo-800 border-indigo-300',
  pilot: 'bg-amber-100 text-amber-800 border-amber-300',
};

const NAV_LINKS = [
  { id: 'how-it-works', label: 'How it works' },
  { id: 'pilot', label: 'Pilot' },
  { id: 'team', label: 'Team' },
  { id: 'faq', label: 'FAQ' },
];

const StatusChip: React.FC<{ status: Status }> = ({ status }) => (
  <span className={`inline-flex items-center h-6 px-2.5 rounded-full border text-[12px] font-mono font-semibold ${STATUS_CLASS[status]}`}>
    {STATUS_LABEL[status]}
  </span>
);

const SampleBadge: React.FC = () => (
  <span className="text-[12px] font-mono font-bold uppercase tracking-wider text-teal-800 bg-white/80 border border-teal-200/80 rounded-full px-2.5 py-1 whitespace-nowrap">
    Sample data
  </span>
);

// Reveal on scroll, once. Skipped when the user prefers reduced motion.
const Reveal: React.FC<{ children: React.ReactNode; className?: string; delay?: number; from?: 'left' | 'right' | 'up' }> = ({
  children,
  className = '',
  delay = 0,
  from = 'up',
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.18 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const hidden = from === 'left' ? '-translate-x-6' : from === 'right' ? 'translate-x-6' : 'translate-y-6';
  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none ${
        visible ? 'opacity-100 translate-x-0 translate-y-0' : `opacity-0 ${hidden}`
      } ${className}`}
    >
      {children}
    </div>
  );
};

/* Showcase stages: left card shows the product, right card explains it. */

const STAGES: {
  kicker: string;
  title: string;
  heading: string;
  text: string;
  points: string[];
  status: Status;
  accent: string;
}[] = [
  {
    kicker: 'Matched to each learner profile',
    title: '01 / DISCOVER',
    heading: 'Relevant opportunities, with sources',
    text: "Internships, hackathons and grants that fit each learner's skills and goals. Every listing links to the official page.",
    points: ['Deadlines confirmed on the source page', 'Expired listings removed daily'],
    status: 'live',
    accent: 'text-emerald-700',
  },
  {
    kicker: 'CV checks and application checklists',
    title: '02 / PREPARE',
    heading: 'Ready before the deadline',
    text: 'Learners see which skills a listing asks for, what their CV is missing and what to do before they apply.',
    points: ['CV gap check against a target role', 'Skill quizzes on 235 topics'],
    status: 'early',
    accent: 'text-indigo-700',
  },
  {
    kicker: 'Staff workspace',
    title: '03 / TRACK',
    heading: 'One view of your cohort',
    text: 'Staff see who has a complete profile, who is preparing and who already applied, and follow up only where it is needed.',
    points: ['Invite a cohort with one link', 'Export the roster as CSV'],
    status: 'early',
    accent: 'text-sky-700',
  },
  {
    kicker: 'Telegram and Discord bots',
    title: '04 / ALERTS',
    heading: 'Reminders where learners already are',
    text: 'New matches and deadline reminders arrive in Telegram and Discord, so nobody has to check the site every day.',
    points: ['Personal deadline reminders', 'Works on any phone'],
    status: 'live',
    accent: 'text-teal-700',
  },
];

const ROW_TONES = {
  emerald: { box: 'from-emerald-50 to-teal-100/80 border-emerald-300/60 text-emerald-950', pill: 'bg-emerald-600' },
  sky: { box: 'from-sky-50 to-cyan-100/80 border-sky-300/60 text-sky-950', pill: 'bg-sky-600' },
  amber: { box: 'from-amber-50 to-orange-100/80 border-amber-300/60 text-amber-950', pill: 'bg-amber-600' },
};

const OpportunityRow: React.FC<{ title: string; meta: string; tone: keyof typeof ROW_TONES; deadline: string }> = ({
  title,
  meta,
  tone,
  deadline,
}) => (
  <div className={`p-3.5 sm:p-4 rounded-2xl bg-gradient-to-br border shadow-sm flex items-center justify-between gap-3 ${ROW_TONES[tone].box}`}>
    <div className="min-w-0">
      <div className="text-[13px] sm:text-[14px] font-bold truncate">{title}</div>
      <div className="text-mini font-mono opacity-80 mt-0.5 truncate">{meta}</div>
    </div>
    <span className={`text-mini font-mono font-bold text-white px-2.5 py-1 rounded-full flex-shrink-0 ${ROW_TONES[tone].pill}`}>{deadline}</span>
  </div>
);

type LearnerState = 'Applied' | 'Preparing' | 'Saved' | 'Not started';
const LEARNER_STATE_CLASS: Record<LearnerState, string> = {
  Applied: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  Preparing: 'bg-indigo-100 text-indigo-800 border-indigo-300',
  Saved: 'bg-amber-100 text-amber-800 border-amber-300',
  'Not started': 'bg-slate-100 text-slate-600 border-slate-300',
};
const SAMPLE_LEARNERS: { name: string; profile: number; state: LearnerState }[] = [
  { name: 'Aruzhan S.', profile: 100, state: 'Applied' },
  { name: 'Daniyar K.', profile: 90, state: 'Applied' },
  { name: 'Madina T.', profile: 80, state: 'Preparing' },
  { name: 'Timur A.', profile: 60, state: 'Saved' },
  { name: 'Alina B.', profile: 30, state: 'Not started' },
];

const LearnerList: React.FC<{ rows?: number }> = ({ rows = 4 }) => (
  <ul className="rounded-2xl bg-white/80 border border-teal-200/80 divide-y divide-teal-100 overflow-hidden">
    {SAMPLE_LEARNERS.slice(0, rows).map((learner) => (
      <li key={learner.name} className="flex items-center justify-between gap-3 px-4 py-2.5">
        <div className="flex items-center gap-3 min-w-0">
          <span className="w-8 h-8 shrink-0 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-[12px] font-mono font-bold flex items-center justify-center">
            {learner.name.split(' ').map((part) => part[0]).join('')}
          </span>
          <div className="min-w-0">
            <p className="text-[13px] font-bold text-indigo-950 truncate">{learner.name}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="w-14 h-1.5 rounded-full bg-teal-100 overflow-hidden">
                <span className="block h-full bg-gradient-to-r from-emerald-500 to-teal-600" style={{ width: `${learner.profile}%` }} />
              </span>
              <span className="text-[12px] font-mono text-teal-800">{learner.profile}% profile</span>
            </div>
          </div>
        </div>
        <span className={`shrink-0 inline-flex items-center h-6 px-2.5 rounded-full border text-[12px] font-mono font-semibold ${LEARNER_STATE_CLASS[learner.state]}`}>
          {learner.state}
        </span>
      </li>
    ))}
  </ul>
);

const StageVisual: React.FC<{ stage: Stage }> = ({ stage }) => {
  if (stage === 0) {
    return (
      <div className="space-y-2.5">
        <OpportunityRow title="Nebius x NVIDIA Global AI Hackathon" meta="Hackathon · Online · Teams of 2 to 5" tone="emerald" deadline="Oct 30" />
        <OpportunityRow title="NVIDIA Graduate Fellowship" meta="Grant · Up to 60,000 USD · PhD research" tone="sky" deadline="Oct 30" />
        <OpportunityRow title="ML Engineering Summer Internship" meta="Internship · 12 weeks · Python, PyTorch" tone="amber" deadline="Nov 15" />
      </div>
    );
  }
  if (stage === 1) {
    return (
      <div className="space-y-3">
        <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50 to-violet-100/80 border border-indigo-300/60 text-indigo-950 flex items-center justify-between gap-4">
          <div>
            <div className="text-mini font-mono text-indigo-700 uppercase font-semibold">Fit for: ML Engineering Internship</div>
            <div className="text-2xl font-mono font-bold mt-1">
              3 of 5 <span className="text-indigo-400 text-sm">skills covered</span>
            </div>
          </div>
          <FileTextIcon size={28} className="text-indigo-600 shrink-0" />
        </div>
        <ul className="space-y-2">
          {[
            { text: 'Python and pandas', done: true },
            { text: 'Git and a public project', done: true },
            { text: 'SQL', done: true },
            { text: 'PyTorch: pass the skill quiz', done: false },
            { text: 'Add a deployed project to the CV', done: false },
          ].map((item) => (
            <li key={item.text} className="flex items-center gap-2.5 text-[13px] text-indigo-950">
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                  item.done ? 'bg-emerald-600 text-white' : 'border-2 border-indigo-300 bg-white'
                }`}
              >
                {item.done && <CheckIcon size={12} />}
              </span>
              {item.text}
            </li>
          ))}
        </ul>
      </div>
    );
  }
  if (stage === 2) {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: 'Learners', value: '42' },
            { label: 'Profiles', value: '31' },
            { label: 'Started', value: '18' },
            { label: 'Applied', value: '6' },
          ].map((stat) => (
            <div key={stat.label} className="p-2.5 rounded-xl bg-white/80 border border-teal-200/80 text-center">
              <div className="text-lg sm:text-xl font-mono font-bold text-indigo-950">{stat.value}</div>
              <div className="text-[12px] font-mono text-teal-800 uppercase">{stat.label}</div>
            </div>
          ))}
        </div>
        <LearnerList rows={3} />
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <div className="p-3.5 rounded-2xl bg-gradient-to-br from-sky-50 to-cyan-100/80 border border-sky-300/60 text-sky-950 flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-sky-500 text-white flex items-center justify-center flex-shrink-0">
          <TelegramIcon size={22} />
        </div>
        <div className="min-w-0">
          <div className="flex items-center justify-between gap-2 text-mini font-mono">
            <span className="font-bold">QADAM bot · Telegram</span>
            <span className="text-sky-700">Just now</span>
          </div>
          <p className="text-[13px] text-sky-900 mt-1 leading-relaxed">
            New match: ML Engineering Summer Internship. Deadline Nov 15. Open the listing to see the checklist.
          </p>
        </div>
      </div>
      <div className="p-3.5 rounded-2xl bg-gradient-to-br from-indigo-50 to-violet-100/80 border border-indigo-300/60 text-indigo-950 flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center flex-shrink-0">
          <DiscordIcon size={22} />
        </div>
        <div className="min-w-0">
          <div className="flex items-center justify-between gap-2 text-mini font-mono">
            <span className="font-bold">QADAM bot · Discord</span>
            <span className="text-indigo-700">2m ago</span>
          </div>
          <p className="text-[13px] text-indigo-900 mt-1 leading-relaxed">Reminder: Nebius x NVIDIA Global AI Hackathon closes in 3 days.</p>
        </div>
      </div>
    </div>
  );
};

const StageCopy: React.FC<{ stage: Stage }> = ({ stage }) => {
  const item = STAGES[stage];
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-mini font-mono text-teal-800">
        <span className={`font-bold ${item.accent}`}>STEP 0{stage + 1}</span>
        <span>/ 04</span>
      </div>
      <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-indigo-950 leading-tight">{item.heading}</h2>
      <p className="text-[15px] md:text-[16px] text-teal-950 leading-relaxed">{item.text}</p>
      <ul className="space-y-2.5 pt-1 text-[13px] text-teal-900 font-mono">
        {item.points.map((point) => (
          <li key={point} className="flex items-center gap-2">
            <CheckIcon size={14} className={`${item.accent} shrink-0`} />
            <span>{point}</span>
          </li>
        ))}
      </ul>
      <div className="pt-1">
        <StatusChip status={item.status} />
      </div>
    </div>
  );
};

const FAQ: { q: string; a: string }[] = [
  {
    q: 'Who pays for QADAM Hub?',
    a: 'The institution. Learners in a cohort use it at no cost. The pilot is free; after it, the proposed price is 170 USD per month for up to 100 active learners.',
  },
  {
    q: 'What do learners need to start?',
    a: 'A browser and an email address. They join with an invite link from your staff and fill in a short profile. There is nothing to install.',
  },
  {
    q: 'Where do the opportunities come from?',
    a: 'A daily search across public sources. A listing is published only if its deadline is in the future and is confirmed by a quote on the official page. Expired, undated and directory pages are removed.',
  },
  {
    q: 'What can staff see about a learner?',
    a: 'Name, track, how complete the profile is, and which opportunities the learner saved, is preparing or applied to. Staff do not see CV text or private messages.',
  },
  {
    q: 'How long does setup take?',
    a: 'About one working day. We create the cohort with your staff lead, send one invite link to learners and agree on a weekly check-in.',
  },
  {
    q: 'What happens after the pilot?',
    a: 'You get a summary of what learners did during the pilot. If it was useful, we agree on a paid subscription. If not, the cohort simply stops, with no obligation.',
  },
  {
    q: 'Which languages and regions do you support?',
    a: 'The interface is in English. QADAM Hub is international: every listing says where it is open from, and a student can filter the feed to what they can apply to from their own country.',
  },
];

const TEAM = [
  { initials: 'AN', name: 'Amir Nagiyev', role: 'Frontend development' },
  { initials: 'AA', name: 'Aiym Agatayeva', role: 'Backend development and AI' },
  { initials: 'NJ', name: 'Nityam Jain', role: 'AI and analytics' },
  { initials: 'NS', name: 'Nishchay Shergill', role: 'Video production, presentations and editing' },
];

// Display title for a "stop", aligned left or right like an itinerary.
const StopTitle: React.FC<{ index: string; label: string; title: string; align: 'left' | 'right' }> = ({ index, label, title, align }) => (
  <Reveal from={align}>
    <div className={`flex items-center gap-3 ${align === 'right' ? 'lg:justify-end' : ''}`}>
      <span className={`w-2 h-2 rounded-full bg-emerald-400 ${align === 'right' ? 'lg:hidden' : ''}`} />
      <span className={eyebrowDark}>
        {index} · {label}
      </span>
      {align === 'right' && <span className="hidden lg:block w-2 h-2 rounded-full bg-emerald-400" />}
    </div>
    <div className={`mt-2 h-px bg-gradient-to-r ${align === 'left' ? 'from-teal-400/40 to-transparent' : 'from-transparent to-teal-400/40'}`} />
    <h2
      className={`mt-5 text-[34px] sm:text-[48px] lg:text-[60px] leading-[1.05] font-semibold tracking-[-0.02em] text-white max-w-4xl break-words ${
        align === 'right' ? 'lg:ml-auto' : ''
      } ${
        align === 'right' ? 'lg:text-right' : ''
      }`}
    >
      {title}
    </h2>
  </Reveal>
);

export const WelcomePage: React.FC = () => {
  usePageMeta(WELCOME_TITLE, '/welcome');
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const sectionRef = useRef<HTMLDivElement>(null);
  const [activeStage, setActiveStage] = useState<Stage>(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const pilotOpen = searchParams.get('pilot') === '1';

  // Scroll-locked stage controller from the original landing: progress through
  // the tall sticky section picks one of four stages.
  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(() => {
        if (sectionRef.current) {
          const rect = sectionRef.current.getBoundingClientRect();
          const scrollableDistance = rect.height - window.innerHeight;
          if (scrollableDistance > 0) {
            const ratio = Math.max(0, Math.min(1, -rect.top / scrollableDistance));
            const next = Math.min(3, Math.floor(ratio * 4)) as Stage;
            setActiveStage((prev) => (prev !== next ? next : prev));
          }
        }
        ticking = false;
      });
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  const scrollToStage = (stage: Stage) => {
    if (!sectionRef.current) return;
    const rect = sectionRef.current.getBoundingClientRect();
    const sectionTop = window.scrollY + rect.top;
    const scrollableDistance = rect.height - window.innerHeight;
    window.scrollTo({ top: sectionTop + (stage * 0.25 + 0.06) * scrollableDistance, behavior: 'smooth' });
  };

  const get3DTransform = (stageIndex: number) => {
    if (stageIndex === activeStage) {
      return 'opacity-100 pointer-events-auto z-20 [transform:translate3d(0,0,0)_rotateX(0deg)_scale(1)]';
    }
    if (stageIndex < activeStage) {
      return 'opacity-0 pointer-events-none z-10 [transform:translate3d(0,-48px,0)_rotateX(18deg)_scale(0.92)]';
    }
    return 'opacity-0 pointer-events-none z-10 [transform:translate3d(0,48px,0)_rotateX(-18deg)_scale(0.92)]';
  };

  const openPilot = () => {
    setMenuOpen(false);
    setSearchParams({ pilot: '1' }, { replace: true });
  };
  const closePilot = useCallback(() => setSearchParams({}, { replace: true }), [setSearchParams]);
  const openStudentLogin = () => {
    setMenuOpen(false);
    navigate('/student');
  };
  const openStaffLogin = () => {
    setMenuOpen(false);
    navigate('/staff');
  };
  const scrollTo = (id: string) => {
    setMenuOpen(false);
    const target =
      id === 'how-it-works' && window.matchMedia('(min-width: 1024px)').matches ? sectionRef.current : document.getElementById(id);
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const stagePills = (onPick: (stage: Stage) => void) => (
    <div className="flex items-center gap-1.5">
      {([0, 1, 2, 3] as Stage[]).map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onPick(s)}
          aria-label={`Step ${s + 1}`}
          className={`h-8 px-3 rounded-full text-[12px] font-mono font-bold transition-all cursor-pointer ${
            activeStage === s
              ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-xs'
              : 'bg-white/80 text-teal-800 hover:bg-white border border-teal-200/60'
          }`}
        >
          0{s + 1}
        </button>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-transparent text-slate-100 selection:bg-teal-500/20 selection:text-white font-sans antialiased relative">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-slate-900/60 backdrop-blur-md border-b border-teal-500/20 shadow-md">
        <div className="px-4 sm:px-6 md:px-12 h-16 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex items-center gap-3 cursor-pointer min-w-0"
            aria-label="QADAM Hub, back to top"
          >
            <img src="/brand/qadam-icon.png" alt="" className="w-8 h-8 object-contain rounded-md shrink-0" />
            <span className="text-[18px] font-mono font-bold tracking-tight text-white whitespace-nowrap">
              QADAM <span className="text-teal-300">Hub</span>
            </span>
          </button>

          <AudienceSwitch active="schools" className="hidden md:inline-grid" />

          <nav className="hidden xl:flex items-center gap-1" aria-label="Sections">
            {NAV_LINKS.map((link) => (
              <button
                key={link.id}
                type="button"
                onClick={() => scrollTo(link.id)}
                className="h-10 px-3 rounded-btn text-mini font-mono text-teal-100/80 hover:text-white hover:bg-teal-500/10 transition-colors cursor-pointer"
              >
                {link.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={openStaffLogin}
              className="hidden lg:inline-flex h-10 px-3 items-center rounded-btn text-[13px] font-semibold text-teal-100/80 hover:text-white hover:bg-teal-500/10 transition-colors cursor-pointer"
            >
              Staff login
            </button>
            <button
              type="button"
              onClick={openStudentLogin}
              className="hidden sm:inline-flex h-10 px-4 items-center rounded-btn text-[13px] font-semibold text-teal-100 hover:text-white hover:bg-teal-500/10 border border-teal-500/30 transition-colors cursor-pointer"
            >
              Student login
            </button>
            <button
              type="button"
              onClick={openPilot}
              className="h-10 px-3.5 sm:px-5 rounded-btn bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-[13px] font-semibold transition-all shadow-md shadow-emerald-900/30 cursor-pointer inline-flex items-center gap-2 whitespace-nowrap"
            >
              Request a pilot
              <ChevronRightIcon size={13} className="hidden sm:block" />
            </button>
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
              className="xl:hidden w-11 h-11 -mr-2 flex items-center justify-center rounded-btn text-teal-100 hover:bg-teal-500/10 transition-colors cursor-pointer"
            >
              {menuOpen ? <CloseIcon size={22} /> : <MenuIcon size={22} />}
            </button>
          </div>
        </div>
        {menuOpen && (
          <>
            <div className="xl:hidden fixed inset-0 top-16 z-40 bg-slate-950/40" onClick={() => setMenuOpen(false)} />
            <div className="animate-pop-in origin-top xl:hidden absolute left-0 right-0 top-16 z-50 bg-slate-900/95 backdrop-blur-md border-b border-teal-500/20 max-h-[calc(100dvh-4rem)] overflow-y-auto">
              <nav className="px-4 py-2 flex flex-col" aria-label="Sections">
                {NAV_LINKS.map((link) => (
                  <button
                    key={link.id}
                    type="button"
                    onClick={() => scrollTo(link.id)}
                    className="h-12 text-left text-[15px] font-mono text-teal-100 border-b border-teal-500/15 cursor-pointer"
                  >
                    {link.label}
                  </button>
                ))}
                <button type="button" onClick={openStudentLogin} className="h-12 text-left text-[15px] font-mono font-semibold text-white border-b border-teal-500/15 cursor-pointer">
                  Student login
                </button>
                <button type="button" onClick={openStaffLogin} className="h-12 text-left text-[15px] font-mono font-semibold text-white cursor-pointer">
                  Staff login
                </button>
              </nav>
            </div>
          </>
        )}
      </header>

      {/* Hero */}
      <section className="min-h-[100dvh] flex flex-col items-center justify-center text-center px-4 sm:px-6 pt-28 pb-20 relative z-10 max-w-5xl mx-auto">
        <div className="space-y-6 sm:space-y-8 flex flex-col items-center">
          <AudienceSwitch active="schools" className="md:hidden" />
          <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-teal-500/10 border border-teal-400/30 text-teal-200 text-[13px] font-mono tracking-wide backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>QADAM Hub · For schools, universities and training centers</span>
          </div>

          <h1 className="text-[40px] sm:text-6xl lg:text-[72px] font-semibold tracking-[-0.025em] text-white leading-[1.05] max-w-4xl">
            Opportunity and career support for your cohort
          </h1>

          <p className="text-lg sm:text-xl text-teal-100/85 leading-relaxed max-w-2xl mx-auto">
            Learners find internships, hackathons and grants that fit their skills. Your staff see who is applying, without
            chasing links in chats.
          </p>

          <div className="pt-2 flex flex-col sm:flex-row justify-center gap-3 w-full sm:w-auto">
            <button type="button" onClick={openPilot} className={primaryButton}>
              Request a free pilot
              <ChevronRightIcon size={18} />
            </button>
            <button type="button" onClick={() => scrollTo('how-it-works')} className={ghostButton}>
              See how it works
            </button>
          </div>

          <div className="flex flex-wrap justify-center gap-2 pt-2">
            {['High schools', 'Universities', 'Training centers'].map((tag) => (
              <span key={tag} className="px-3 py-1.5 rounded-full bg-slate-900/50 border border-teal-500/25 text-[12px] font-mono text-teal-200 backdrop-blur-md">
                {tag}
              </span>
            ))}
          </div>
        </div>

        <div className="hidden md:flex absolute bottom-6 left-1/2 -translate-x-1/2 flex-col items-center gap-2 opacity-75">
          <span className="text-[12px] font-mono tracking-[0.16em] text-teal-300/80 uppercase">How it works</span>
          <div className="w-px h-8 bg-gradient-to-b from-teal-300/70 to-transparent" />
        </div>
      </section>

      {/* Showcase, mobile: stage pills in natural document flow */}
      <section id="how-it-works" className="lg:hidden relative z-10 px-4 py-8 max-w-2xl mx-auto scroll-mt-20">
        <div className={`${glassCard} p-5 sm:p-6 flex flex-col gap-5`}>
          <div className="flex items-center justify-between gap-3 border-b border-teal-200/80 pb-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
              <span className="text-mini font-mono font-bold text-teal-950 uppercase tracking-wider truncate">How it works</span>
            </div>
            {stagePills(setActiveStage)}
          </div>
          <div className="space-y-1">
            <div className={`text-mini font-mono uppercase tracking-wider font-semibold ${STAGES[activeStage].accent}`}>
              {STAGES[activeStage].kicker}
            </div>
            <h3 className="text-2xl font-mono font-bold text-indigo-950 tracking-tight">{STAGES[activeStage].title}</h3>
          </div>
          <StageVisual stage={activeStage} />
          {activeStage !== 3 && (
            <div>
              <SampleBadge />
            </div>
          )}
          <div className="pt-3 border-t border-teal-200/80">
            <StageCopy stage={activeStage} />
          </div>
        </div>
      </section>

      {/* Showcase, desktop: scroll-locked 3D flip, one stage per 100vh */}
      <section ref={sectionRef} className="hidden lg:block relative h-[400vh] w-full" aria-label="How it works">
        <div className="sticky top-0 h-screen w-full flex items-center justify-center z-20 px-6 md:px-12 pt-16">
          <div className="w-full max-w-[1440px] mx-auto flex items-center justify-between gap-8">
            <div className="w-[60vw] max-w-[920px] [perspective:1400px] [transform-style:preserve-3d] relative h-[68vh] min-h-[480px]">
              {STAGES.map((item, index) => (
                <div
                  key={item.title}
                  className={`absolute inset-0 ${glassCard} p-8 md:p-10 flex flex-col justify-between overflow-hidden will-change-[transform,opacity] [transform-style:preserve-3d] [backface-visibility:hidden] transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none ${get3DTransform(index)}`}
                >
                  <div className="flex items-center justify-between border-b border-teal-200/80 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      <span className="text-mini font-mono font-bold text-teal-950 uppercase tracking-wider">How it works</span>
                    </div>
                    <div className="flex items-center gap-3">
                      {index !== 3 && <SampleBadge />}
                      {stagePills(scrollToStage)}
                    </div>
                  </div>
                  <div className="flex-1 flex flex-col justify-center py-4 space-y-5">
                    <div className="space-y-1">
                      <div className={`text-mini font-mono uppercase tracking-wider font-semibold ${item.accent}`}>{item.kicker}</div>
                      <h3 className="text-3xl xl:text-4xl font-mono font-semibold text-indigo-950 tracking-tight">{item.title}</h3>
                    </div>
                    <div className="max-w-xl">
                      <StageVisual stage={index as Stage} />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-3 border-t border-teal-200/80">
                    {([0, 1, 2, 3] as Stage[]).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => scrollToStage(s)}
                        aria-label={`Go to step ${s + 1}`}
                        className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                          activeStage === s ? 'w-10 bg-emerald-600' : 'w-2 bg-teal-200 hover:bg-teal-300'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex-1 [perspective:1400px] [transform-style:preserve-3d] relative h-[68vh] min-h-[380px]">
              {STAGES.map((item, index) => (
                <div
                  key={item.title}
                  className={`absolute inset-0 ${glassCard} p-8 md:p-12 flex flex-col justify-center will-change-[transform,opacity] [transform-style:preserve-3d] [backface-visibility:hidden] transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none ${get3DTransform(index)}`}
                >
                  <StageCopy stage={index as Stage} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Stops: titles and content alternate left and right */}
      <div className="relative z-10 space-y-28 sm:space-y-40 py-24 sm:py-32">
        {/* Stop 1: the gap (title left, card right) */}
        <section className={container}>
          <StopTitle index="01" label="The problem" title="The gap after the classroom" align="left" />
          <div className="mt-10 grid lg:grid-cols-2 gap-8 items-center">
            <Reveal from="left" delay={100}>
              <p className="text-lg sm:text-xl text-teal-100/90 leading-relaxed max-w-md">
                Learners build skills. Finding the right next opportunity still takes work, for them and for your staff.
              </p>
              <p className="mt-5 text-[15px] text-teal-200/80 leading-relaxed max-w-md">
                The pilot answers one question: how much staff time does this cost per cohort, and how much of it can we save?
              </p>
            </Reveal>
            <Reveal from="right" delay={200}>
              <div className={`${glassCard} p-5 sm:p-8 space-y-4`}>
                {[
                  {
                    icon: <UsersIcon size={20} />,
                    title: 'For learners',
                    text: 'Opportunities sit across websites and chats. Learners check requirements and deadlines on their own, and often find out too late.',
                  },
                  {
                    icon: <BarChartIcon size={20} />,
                    title: 'For staff',
                    text: 'Staff share links by hand and have no clear view of which learners apply, prepare or need a push.',
                  },
                ].map((card) => (
                  <div key={card.title} className="p-4 sm:p-5 rounded-2xl bg-white/80 border border-teal-200/80 flex gap-4">
                    <span className="w-10 h-10 shrink-0 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center">
                      {card.icon}
                    </span>
                    <div>
                      <h3 className="text-[16px] font-bold text-indigo-950">{card.title}</h3>
                      <p className="mt-1 text-[14px] text-teal-950 leading-relaxed">{card.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </section>

        {/* Stop 2: workspace (title right, card left) */}
        <section className={container}>
          <StopTitle index="02" label="Staff workspace" title="One view of your cohort" align="right" />
          <div className="mt-10 grid lg:grid-cols-2 gap-8 items-center">
            <Reveal from="left" delay={200} className="order-2 lg:order-1">
              <div className={`${glassCard} p-5 sm:p-7 space-y-4`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-mini font-mono text-teal-800 uppercase">Cohort</p>
                    <p className="text-[16px] font-bold text-indigo-950 truncate">Data Analytics, Fall 2026</p>
                  </div>
                  <SampleBadge />
                </div>
                <LearnerList rows={5} />
              </div>
            </Reveal>
            <Reveal from="right" delay={100} className="order-1 lg:order-2 lg:text-right">
              <p className="text-lg sm:text-xl text-teal-100/90 leading-relaxed lg:ml-auto max-w-md">
                See who has a complete profile, who is preparing and who already applied. Follow up with the learners who need
                it, not with everyone.
              </p>
              <div className="mt-6 lg:flex lg:justify-end">
                <StatusChip status="early" />
              </div>
            </Reveal>
          </div>
        </section>

        {/* Stop 3: pilot and pricing (title left, cards right) */}
        <section id="pilot" className={`${container} scroll-mt-24`}>
          <StopTitle index="03" label="Pilot and pricing" title="Pilot first, then a subscription" align="left" />
          <div className="mt-10 grid lg:grid-cols-[0.8fr_1.2fr] gap-8 items-center">
            <Reveal from="left" delay={100}>
              <p className="text-lg sm:text-xl text-teal-100/90 leading-relaxed max-w-md">
                The institution pays, the cohort gets access. We start with a free pilot and agree on a subscription only after
                you have seen the results.
              </p>
              <button type="button" onClick={openPilot} className={`${primaryButton} mt-8 w-full sm:w-auto`}>
                Request a free pilot
                <ChevronRightIcon size={18} />
              </button>
            </Reveal>
            <Reveal from="right" delay={200}>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className={`${glassCard} p-6 sm:p-7 flex flex-col`}>
                  <p className="text-mini font-mono font-bold text-emerald-700 uppercase tracking-wider">Step 1 · Pilot</p>
                  <p className="mt-3 text-4xl font-semibold tracking-tight text-indigo-950">Free</p>
                  <p className="text-[13px] font-mono text-teal-800">for 4 to 6 weeks</p>
                  <ul className="mt-5 space-y-2.5">
                    {['One cohort of 30 to 50 learners', 'One staff lead from your side', 'Weekly check-in with our team', 'Summary of learner activity at the end'].map((item) => (
                      <li key={item} className="flex items-start gap-2 text-[13px] text-teal-950">
                        <CheckIcon size={15} className="mt-0.5 shrink-0 text-emerald-600" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className={`${glassCard} p-6 sm:p-7 flex flex-col`}>
                  <p className="text-mini font-mono font-bold text-indigo-700 uppercase tracking-wider">Step 2 · Subscription</p>
                  <p className="mt-3 text-4xl font-semibold tracking-tight text-indigo-950 whitespace-nowrap">170 USD</p>
                  <p className="text-[13px] font-mono text-teal-800">per month, per institution</p>
                  <ul className="mt-5 space-y-2.5 flex-1">
                    {['Up to 100 active learners', 'Staff accounts and cohort tools', 'Recommendations for every learner', 'Basic reporting on learner activity'].map((item) => (
                      <li key={item} className="flex items-start gap-2 text-[13px] text-teal-950">
                        <CheckIcon size={15} className="mt-0.5 shrink-0 text-indigo-600" />
                        {item}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-5 text-[12px] font-mono text-teal-800/80 leading-relaxed">
                    Proposed price, confirmed with each pilot partner. Monthly invoice.
                  </p>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* Stop 4: where we are (title right, card left) */}
        <section className={container}>
          <StopTitle index="04" label="Where we are" title="A working prototype, ready for a pilot" align="right" />
          <div className="mt-10 grid lg:grid-cols-2 gap-8 items-center">
            <Reveal from="left" delay={200} className="order-2 lg:order-1">
              <div className={`${glassCard} p-6 sm:p-8 grid sm:grid-cols-2 gap-6`}>
                <div>
                  <StatusChip status="live" />
                  <ul className="mt-4 space-y-2.5">
                    {['Opportunity discovery matched to a profile', 'Listings with sources and checked deadlines', 'Staff workspace: cohorts, invite codes, learner progress (early version)', 'Telegram and Discord bots'].map((item) => (
                      <li key={item} className="flex items-start gap-2 text-[13px] text-teal-950">
                        <CheckIcon size={15} className="mt-0.5 shrink-0 text-emerald-600" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <StatusChip status="pilot" />
                  <ul className="mt-4 space-y-2.5">
                    {['Staff roles and permissions', 'Monthly reports for the institution', 'CV matching and application support'].map((item) => (
                      <li key={item} className="flex items-start gap-2 text-[13px] text-teal-950">
                        <span className="mt-1.5 w-2 h-2 shrink-0 rounded-full bg-amber-500" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Reveal>
            <Reveal from="right" delay={100} className="order-1 lg:order-2 lg:text-right">
              <p className="text-lg sm:text-xl text-teal-100/90 leading-relaxed lg:ml-auto max-w-md">
                We would rather show exactly what works now than promise everything at once. We do not have signed
                institutional partners yet; the pilot is how we plan to earn them.
              </p>
            </Reveal>
          </div>
        </section>

        {/* Stop 5: team (title left, cards right) */}
        <section id="team" className={`${container} scroll-mt-24`}>
          <StopTitle index="05" label="Team" title="The team behind QADAM Hub" align="left" />
          <div className="mt-10 grid lg:grid-cols-[0.8fr_1.2fr] gap-8 items-center">
            <Reveal from="left" delay={100}>
              <p className="text-lg sm:text-xl text-teal-100/90 leading-relaxed max-w-md">
                A student team at Qazaq AI Research University, with hands-on experience building opportunity discovery and
                messaging bot prototypes.
              </p>
            </Reveal>
            <Reveal from="right" delay={200}>
              <ul className="grid sm:grid-cols-2 gap-4">
                {TEAM.map((person) => (
                  <li key={person.name} className={`${glassCard} p-5 flex items-center gap-4`}>
                    <span className="w-12 h-12 shrink-0 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-[14px] font-mono font-bold flex items-center justify-center">
                      {person.initials}
                    </span>
                    <div className="min-w-0">
                      <p className="text-[15px] font-bold text-indigo-950">{person.name}</p>
                      <p className="text-[12px] text-teal-900 leading-snug">{person.role}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className={`${container} scroll-mt-24`}>
          <div className="grid lg:grid-cols-[0.8fr_1.2fr] gap-10">
            <Reveal from="left">
              <p className={eyebrowDark}>FAQ</p>
              <h2 className="mt-3 text-[34px] sm:text-[44px] font-semibold tracking-[-0.02em] text-white leading-tight">Questions from program leads</h2>
              <p className="mt-5 text-[16px] text-teal-100/80 leading-relaxed">
                Something else? Write to{' '}
                <a href={`mailto:${CONTACT_EMAIL}`} className="text-teal-300 hover:text-white underline underline-offset-4 inline-block">
                  {CONTACT_EMAIL}
                </a>
                .
              </p>
            </Reveal>
            <Reveal from="right" delay={100}>
              <div className={`${glassCard} p-2 sm:p-3`}>
                {FAQ.map((item, index) => {
                  const open = openFaq === index;
                  return (
                    <div key={item.q} className="border-b last:border-b-0 border-teal-200/70">
                      <button
                        type="button"
                        onClick={() => setOpenFaq(open ? null : index)}
                        aria-expanded={open}
                        className="w-full min-h-[56px] px-4 py-3 flex items-center justify-between gap-4 text-left cursor-pointer"
                      >
                        <span className="text-[15px] sm:text-[16px] font-bold text-indigo-950">{item.q}</span>
                        <ChevronDownIcon size={18} className={`shrink-0 text-teal-700 transition-transform motion-reduce:transition-none ${open ? 'rotate-180' : ''}`} />
                      </button>
                      {open && <p className="px-4 pb-4 text-[14px] sm:text-[15px] leading-relaxed text-teal-950">{item.a}</p>}
                    </div>
                  );
                })}
              </div>
            </Reveal>
          </div>
        </section>

        {/* Final call to action */}
        <section className={container}>
          <Reveal>
            <div className="rounded-3xl bg-slate-900/60 backdrop-blur-md border border-teal-500/25 px-6 py-12 sm:px-12 sm:py-16 text-center">
              <p className={eyebrowDark}>One pilot partner</p>
              <h2 className="mt-4 text-[34px] sm:text-[52px] font-semibold tracking-[-0.02em] text-white leading-tight">
                Run a pilot with one cohort
              </h2>
              <p className="mt-5 text-lg text-teal-100/85 max-w-2xl mx-auto leading-relaxed">
                4 to 6 weeks, 30 to 50 learners, one staff lead. Free, with no obligation after it ends.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row justify-center gap-3">
                <button type="button" onClick={openPilot} className={primaryButton}>
                  Request a free pilot
                  <ChevronRightIcon size={18} />
                </button>
                <a href={`mailto:${CONTACT_EMAIL}`} className={ghostButton}>
                  <MailIcon size={18} />
                  Email us
                </a>
              </div>
            </div>
          </Reveal>
        </section>
      </div>

      {/* Footer */}
      <footer className="border-t border-teal-500/20 pt-8 pb-10 px-6 md:px-12 bg-slate-950/60 backdrop-blur-md relative z-10">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-mini font-mono text-teal-200/80">
          <div className="flex items-center gap-2.5">
            <img src="/brand/qadam-icon.png" alt="" className="w-5 h-5 object-contain" />
            <span className="text-white font-bold">QADAM Hub</span>
            <span>© 2026</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-1">
            <button type="button" onClick={openStudentLogin} className="h-10 hover:text-white transition-colors cursor-pointer">
              Student login
            </button>
            <button type="button" onClick={openStaffLogin} className="h-10 hover:text-white transition-colors cursor-pointer">
              Staff login
            </button>
            <Link to="/privacy" className="h-10 inline-flex items-center hover:text-white transition-colors">
              Privacy
            </Link>
            <Link to="/terms" className="h-10 inline-flex items-center hover:text-white transition-colors">
              Terms
            </Link>
            <Link to="/refund" className="h-10 inline-flex items-center hover:text-white transition-colors">
              Refunds
            </Link>
            <Link to="/privacy#data-request" className="h-10 inline-flex items-center hover:text-white transition-colors">
              Data request
            </Link>
            <CookieSettingsButton className="h-10 hover:text-white transition-colors" />
            <a href={`mailto:${CONTACT_EMAIL}`} className="h-10 inline-flex items-center hover:text-white transition-colors">
              {CONTACT_EMAIL}
            </a>
          </div>
        </div>
      </footer>

      <PilotRequestModal open={pilotOpen} onClose={closePilot} />
    </div>
  );
};

export default WelcomePage;
