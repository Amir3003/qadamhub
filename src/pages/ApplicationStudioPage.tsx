import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { OPPORTUNITIES_DATABASE, Opportunity } from '../db/opportunities';
import { PageHeader } from '../components/PageHeader';
import {
  CheckIcon,
  CopyIcon,
  ChevronRightIcon,
  ExternalLinkIcon,
  AlertTriangleIcon,
} from '../components/Icons';

interface PrepStep {
  id: string;
  title: string;
  detail: string;
  action?: { label: string; to?: string; href?: string };
}

// Materials organizers typically ask for, by opportunity type.
const MATERIALS: Record<Opportunity['type'], { title: string; detail: string }[]> = {
  HACKATHON: [
    { title: 'Team (or solo decision)', detail: 'Most hackathons allow teams of 2 to 5. Decide early and register together.' },
    { title: 'GitHub profile and a public repo', detail: 'Judges look at commit history. Create the repo on day one.' },
    { title: 'Project idea in 2 to 3 sentences', detail: 'Problem, who it helps, and which sponsor technology you use.' },
    { title: 'Demo video and pitch deck', detail: 'Usually a 2 to 3 minute video plus 5 to 8 slides at submission time.' },
  ],
  GRANT: [
    { title: 'Motivation letter / statement of purpose', detail: 'Typically 1 to 2 pages. Tie your past work to the program goals.' },
    { title: 'Research proposal', detail: 'Topic, methods, expected results and timeline. Check the page limit.' },
    { title: 'Recommendation letters', detail: 'Ask professors at least 3 to 4 weeks before the deadline.' },
    { title: 'Transcript, diploma and language certificate', detail: 'Official copies, often translated. IELTS / TOEFL scores may be required.' },
  ],
  INTERNSHIP: [
    { title: 'One-page resume', detail: 'Lead with projects that use the required skills listed for this role.' },
    { title: 'Cover letter (if requested)', detail: 'Short: why this team, what you built, what you want to learn.' },
    { title: 'Portfolio or GitHub links', detail: 'Pin 2 to 3 repositories with clear READMEs.' },
    { title: 'Interview preparation', detail: 'Expect coding rounds on algorithms and questions about your projects.' },
  ],
};

function daysUntil(dateStr: string): number | null {
  const target = new Date(`${dateStr}T23:59:59`);
  if (Number.isNaN(target.getTime())) return null;
  return Math.ceil((target.getTime() - Date.now()) / 86_400_000);
}

function loadChecked(oppId: string): string[] {
  try {
    const raw = localStorage.getItem(`qadam_prep_${oppId}`);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

// Resolves the opportunity from the URL. Radar items load asynchronously and are
// not in the static demo list, so an unknown id must never fall back to a demo entry.
export const ApplicationStudioPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { opportunities, radarReady, selectedOpportunityForDraft } = useApp();

  const oppId = searchParams.get('id');
  const found = oppId
    ? opportunities.find((o) => o.id === oppId) || OPPORTUNITIES_DATABASE.find((o) => o.id === oppId)
    : selectedOpportunityForDraft || opportunities[0];

  if (found) return <ApplicationPrep key={found.id} currentOpp={found} />;

  const waiting = !radarReady;
  return (
    <div className="flex-1 flex flex-col min-w-0 bg-transparent relative z-10 text-slate-100">
      <PageHeader title="Application Prep" subtitle="Get ready, then apply on the organizer site" />
      <div className="p-4 sm:p-6 pb-28 lg:pb-8">
        <div className="max-w-lg mx-auto mt-6 p-6 rounded-card bg-gradient-to-br from-[#EDF7F6]/95 via-[#F3F6FF]/95 to-[#E8F4F8]/95 border border-teal-300/40 text-center text-slate-900">
          <h3 className="text-[17px] font-bold text-indigo-950">
            {waiting ? 'Loading the radar...' : oppId ? 'This opportunity is no longer on the radar' : 'Pick an opportunity first'}
          </h3>
          {!waiting && (
            <>
              <p className="mt-2 text-[13px] text-slate-600 leading-relaxed">
                {oppId
                  ? 'Its deadline may have passed or the listing was removed. Choose another one from the radar.'
                  : 'Open the radar and press Prepare & Apply on the opportunity you want.'}
              </p>
              <button
                type="button"
                onClick={() => navigate('/')}
                className="mt-5 h-10 px-4 rounded-btn bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-[13px] font-semibold cursor-pointer"
              >
                Open Opportunity Radar
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const ApplicationPrep: React.FC<{ currentOpp: Opportunity }> = ({ currentOpp }) => {
  const navigate = useNavigate();
  const { userProfile, skills, addLog } = useApp();

  const [checked, setChecked] = useState<string[]>(() => loadChecked(currentOpp.id));
  const [copiedField, setCopiedField] = useState<string | null>(null);
  // Only one step shows its details: the one the person opened, else the first unfinished one.
  // Empty string means everything is closed.
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    setChecked(loadChecked(currentOpp.id));
    setOpenId(null);
  }, [currentOpp.id]);

  const toggleStep = (id: string) => {
    // After ticking a step the next unfinished one opens by itself.
    setOpenId(null);
    setChecked((prev) => {
      const next = prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id];
      try {
        localStorage.setItem(`qadam_prep_${currentOpp.id}`, JSON.stringify(next));
      } catch {
        // Progress simply will not persist in this browser
      }
      return next;
    });
  };

  const hasSkill = (s: string) => userProfile.skills.some((us) => us.toLowerCase() === s.toLowerCase());
  const isVerified = (s: string) =>
    skills.some((sk) => sk.status === 'VERIFIED' && sk.name.toLowerCase() === s.toLowerCase());

  const matchedSkills = currentOpp.skills.filter(hasSkill);
  const missingSkills = currentOpp.skills.filter((s) => !hasSkill(s));
  const verifiedCount = currentOpp.skills.filter(isVerified).length;

  const profileFields = [
    { label: 'Full name', value: [userProfile.name, userProfile.surname].filter(Boolean).join(' ') },
    { label: 'Email', value: userProfile.email },
    { label: 'University', value: userProfile.university },
    { label: 'Major', value: userProfile.major },
    { label: 'Location', value: userProfile.location },
    { label: 'Skills', value: userProfile.skills.join(', ') },
    { label: 'Short bio', value: (userProfile.cvText || '').trim().slice(0, 600) },
  ];
  const filledProfile = profileFields.filter((f) => f.value).length;

  const steps: PrepStep[] = useMemo(
    () => [
      {
        id: 'rules',
        title: 'Read the rules and eligibility on the official page',
        detail: 'Check age, student status, country, team size and the exact deadline time zone.',
        action: currentOpp.url ? { label: 'Open official page', href: currentOpp.url } : undefined,
      },
      {
        id: 'skills',
        title: missingSkills.length
          ? `Close skill gaps: ${missingSkills.join(', ')}`
          : 'Verify your matching skills',
        detail: missingSkills.length
          ? 'Add these skills to your profile or take the learning track and quiz in CV & Skill Lab.'
          : 'Pass the skill quizzes so your profile shows verified, not just self-reported, skills.',
        action: { label: 'Open CV & Skill Lab', to: '/cv' },
      },
      {
        id: 'profile',
        title: 'Complete your profile and CV text',
        detail: 'Organizer forms ask for the same data. Fill it once here and copy it from the Quick Copy panel.',
        action: { label: 'Edit profile', to: '/account?tab=profile' },
      },
      ...MATERIALS[currentOpp.type].map((m, i) => ({ id: `material-${i}`, title: m.title, detail: m.detail })),
      ...(currentOpp.type === 'HACKATHON'
        ? [
            {
              id: 'team',
              title: 'Find teammates if you need them',
              detail: 'Browse people with complementary skills and invite them.',
              action: { label: 'Open Teammates', to: '/network' },
            },
          ]
        : []),
      {
        id: 'reminder',
        title: 'Turn on a deadline reminder',
        detail: 'Get a Telegram or Discord ping a few days before the deadline.',
        action: { label: 'Notification settings', to: '/notifications' },
      },
      {
        id: 'register',
        title: 'Register and submit on the organizer site',
        detail: 'QADAM does not submit for you. Applications always go through the organizer.',
        action: currentOpp.url ? { label: 'Go to official site', href: currentOpp.url } : undefined,
      },
    ],
    [currentOpp.id, currentOpp.type, currentOpp.url, missingSkills.join('|')]
  );

  const doneCount = steps.filter((s) => checked.includes(s.id)).length;
  const currentStepId = steps.find((s) => !checked.includes(s.id))?.id;
  const progress = Math.round((doneCount / steps.length) * 100);
  const expandedId = openId ?? currentStepId ?? '';
  const days = daysUntil(currentOpp.deadlineDate);

  const handleCopy = async (label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(label);
      setTimeout(() => setCopiedField((f) => (f === label ? null : f)), 1500);
    } catch {
      setCopiedField(null);
    }
  };

  const handleGoToOfficial = () => {
    addLog('SYSTEM', `Opened official page for ${currentOpp.title}`);
  };

  const actionClass = (primary: boolean) =>
    primary
      ? 'inline-flex items-center gap-1 mt-2 h-8 px-3 rounded-btn bg-emerald-600 hover:bg-emerald-500 text-white text-mini font-mono font-semibold transition-colors'
      : 'inline-flex items-center gap-1 mt-1.5 text-mini font-mono font-medium text-teal-800 hover:text-emerald-700 hover:underline';

  const copyAllValue = profileFields
    .filter((f) => f.value && f.label !== 'Short bio')
    .map((f) => `${f.label}: ${f.value}`)
    .join('\n');

  const card =
    'rounded-card bg-gradient-to-br from-[#EDF7F6]/95 via-[#F3F6FF]/95 to-[#E8F4F8]/95 backdrop-blur-xl border border-teal-300/40 shadow-[0_16px_40px_-12px_rgba(6,182,212,0.18)] text-slate-900';

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-transparent relative z-10 text-slate-100">
      <PageHeader
        title="Application Prep"
        subtitle={`Get ready, then apply on the organizer site · ${currentOpp.title}`}
        actions={
          <button
            type="button"
            onClick={() => navigate('/')}
            className="h-10 px-4 rounded-btn border border-teal-500/30 bg-slate-900/80 hover:bg-slate-800/80 text-teal-100 hover:text-white text-mini font-mono transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <span>← Back to Opportunity Radar</span>
          </button>
        }
      />

      <div className="p-4 sm:p-6 pb-28 lg:pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT: Opportunity summary + readiness */}
          <div className="lg:col-span-5 xl:col-span-4 space-y-5">
            <div className={`p-5 space-y-4 ${card}`}>
              <div className="flex items-center justify-between">
                <span className="text-mini font-mono px-2 py-0.5 rounded bg-white border border-teal-200 text-teal-900 font-bold">
                  {currentOpp.type}
                </span>
                <span className="text-mini font-mono text-emerald-700 font-bold">{currentOpp.deadline}</span>
              </div>

              <div>
                <h3 className="text-[17px] font-bold text-indigo-950 leading-snug">{currentOpp.title}</h3>
                <div className="text-mini font-mono text-teal-800 mt-1">
                  {[currentOpp.organization, currentOpp.location].filter(Boolean).join(' · ')}
                </div>
              </div>

              <p className="text-[13px] text-teal-950 leading-relaxed">{currentOpp.description}</p>

              <div className={`grid ${currentOpp.award ? 'grid-cols-2' : 'grid-cols-1'} gap-2 text-mini font-mono`}>
                {currentOpp.award && (
                  <div className="p-2.5 bg-white/80 rounded-btn border border-teal-200">
                    <div className="text-teal-800">Award</div>
                    <div className="text-emerald-800 font-bold mt-0.5 leading-snug">{currentOpp.award}</div>
                  </div>
                )}
                <div className="p-2.5 bg-white/80 rounded-btn border border-teal-200">
                  <div className="text-teal-800">Time left</div>
                  <div className={`font-bold mt-0.5 ${days !== null && days <= 7 ? 'text-rose-700' : 'text-indigo-950'}`}>
                    {days === null ? 'See official page' : days < 0 ? 'Closed' : days === 0 ? 'Today' : `${days} days`}
                  </div>
                </div>
              </div>

              {currentOpp.url ? (
                <a
                  href={currentOpp.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={handleGoToOfficial}
                  className="w-full h-11 rounded-btn bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-[13px] font-mono font-bold flex items-center justify-center gap-2 transition-all shadow-xs"
                >
                  <span>Go to Official Site</span>
                  <ExternalLinkIcon size={13} />
                </a>
              ) : (
                <div className="p-3 rounded-btn bg-amber-50 border border-amber-200 text-[12px] text-amber-900 flex items-start gap-2">
                  <AlertTriangleIcon size={14} className="flex-shrink-0 mt-0.5" />
                  <span>The official link for this listing is not confirmed yet. Search the title on the organizer website.</span>
                </div>
              )}
              {currentOpp.url && (
                <div className="text-[11px] font-mono text-teal-800 text-center break-all">
                  {new URL(currentOpp.url).hostname}
                </div>
              )}
            </div>

            {/* Readiness */}
            <div className={`p-5 space-y-4 ${card}`}>
              <div className="text-mini font-mono uppercase text-teal-800 tracking-wider font-bold">Your Readiness</div>

              <div className="space-y-3 text-[13px]">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-teal-900">Skill match</span>
                    <span className="font-mono text-mini font-bold text-indigo-950">
                      {matchedSkills.length}/{currentOpp.skills.length}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {currentOpp.skills.map((s) => (
                      <span
                        key={s}
                        className={`px-2 py-0.5 rounded text-mini font-mono border ${
                          isVerified(s)
                            ? 'bg-emerald-100 border-emerald-300 text-emerald-800 font-bold'
                            : hasSkill(s)
                            ? 'bg-sky-50 border-sky-200 text-sky-900'
                            : 'bg-white border-rose-200 text-rose-700'
                        }`}
                        title={isVerified(s) ? 'Verified' : hasSkill(s) ? 'In profile, not verified' : 'Missing'}
                      >
                        {isVerified(s) ? '✓ ' : ''}
                        {s}
                      </span>
                    ))}
                  </div>
                  <div className="text-[11px] font-mono text-teal-800 mt-1.5">
                    {verifiedCount} verified · {matchedSkills.length - verifiedCount} self-reported · {missingSkills.length} missing
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-teal-200/60">
                  <span className="text-teal-900">Profile completeness</span>
                  <span className="font-mono text-mini font-bold text-indigo-950">
                    {filledProfile}/{profileFields.length} fields
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-teal-900">Checklist</span>
                  <span className="font-mono text-mini font-bold text-indigo-950">
                    {doneCount}/{steps.length} done
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* CENTER: Checklist */}
          <div className="lg:col-span-7 xl:col-span-5 space-y-4">
            <div className={`p-5 ${card}`}>
              <div className="flex items-center justify-between gap-3 mb-1">
                <h3 className="text-[16px] font-bold text-indigo-950">Preparation Checklist</h3>
                <span className="text-mini font-mono text-emerald-700 font-bold">{progress}%</span>
              </div>
              <p className="text-[12px] text-teal-900 leading-relaxed">
                Work through these steps before you register. Tap a number to tick a step off: the percentage and the bar update, and progress is saved on this device.
              </p>
              <div className="w-full h-2 bg-white/80 rounded-full overflow-hidden border border-teal-200/80 mt-3">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>

              <ol className="mt-4 space-y-2">
                {steps.map((step, i) => {
                  const isDone = checked.includes(step.id);
                  const isCurrent = step.id === currentStepId;
                  const isOpen = step.id === expandedId;
                  return (
                    <li
                      key={step.id}
                      aria-current={isCurrent ? 'step' : undefined}
                      className={`relative p-3 rounded-btn border transition-colors ${
                        isDone
                          ? 'bg-emerald-50/80 border-emerald-200'
                          : isCurrent
                          ? 'bg-white border-emerald-400 ring-2 ring-emerald-200/70'
                          : 'bg-white/80 border-teal-200/80'
                      }`}
                    >
                      {i < steps.length - 1 && (
                        <span
                          aria-hidden="true"
                          className={`absolute left-[23px] top-9 -bottom-5 w-0.5 rounded-full ${
                            isDone ? 'bg-emerald-400' : 'bg-teal-200'
                          }`}
                        />
                      )}
                      <div className="flex items-start gap-3">
                        <button
                          type="button"
                          role="checkbox"
                          aria-checked={isDone}
                          aria-label={`Mark "${step.title}" as done`}
                          onClick={() => toggleStep(step.id)}
                          className={`relative z-10 w-6 h-6 rounded-md border flex items-center justify-center flex-shrink-0 cursor-pointer transition-colors ${
                            isDone
                              ? 'bg-emerald-500 border-emerald-600 text-white'
                              : 'bg-white border-teal-300 text-teal-700 text-[11px] font-mono font-bold'
                          }`}
                        >
                          {isDone ? <CheckIcon size={13} /> : i + 1}
                        </button>
                        <div className="min-w-0 flex-1">
                          <button
                            type="button"
                            aria-expanded={isOpen}
                            onClick={() => setOpenId(isOpen ? '' : step.id)}
                            className={`w-full min-h-6 text-left text-[13px] font-semibold cursor-pointer ${isDone ? 'text-emerald-900 line-through decoration-emerald-400' : 'text-indigo-950'}`}
                          >
                            {step.title}
                          </button>
                          {isOpen && (
                            <>
                              <div className="text-[12px] text-slate-600 leading-relaxed mt-0.5">{step.detail}</div>
                              {step.action &&
                                (step.action.href ? (
                                  <a
                                    href={step.action.href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={actionClass(isCurrent)}
                                  >
                                    {step.action.label}
                                    <ExternalLinkIcon size={11} />
                                  </a>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => step.action?.to && navigate(step.action.to)}
                                    className={`${actionClass(isCurrent)} cursor-pointer`}
                                  >
                                    {step.action.label}
                                    <ChevronRightIcon size={11} />
                                  </button>
                                ))}
                            </>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          </div>

          {/* RIGHT: Copy-ready profile data for organizer forms */}
          <div className="lg:col-span-12 xl:col-span-3 space-y-4">
            <div className={`p-5 space-y-3 ${card}`}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="text-[15px] font-bold text-indigo-950">Quick Copy for Forms</h3>
                  <p className="text-[12px] text-teal-900 leading-relaxed mt-0.5">
                    Prefilled from your profile. One click per field.
                  </p>
                </div>
                {copyAllValue && (
                  <button
                    type="button"
                    onClick={() => handleCopy('__all', copyAllValue)}
                    className="h-8 px-3 rounded-btn border border-emerald-300 bg-white hover:bg-emerald-50 text-emerald-800 text-mini font-mono font-semibold flex items-center gap-1.5 flex-shrink-0 cursor-pointer"
                  >
                    {copiedField === '__all' ? <CheckIcon size={11} /> : <CopyIcon size={11} />}
                    {copiedField === '__all' ? 'Copied' : 'Copy all'}
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-1 gap-2">
                {profileFields.map((f) => (
                  <div key={f.label} className="p-2.5 rounded-btn bg-white/80 border border-teal-200/80">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-teal-800">{f.label}</span>
                      {f.value ? (
                        <button
                          type="button"
                          onClick={() => handleCopy(f.label, f.value)}
                          aria-label={`Copy ${f.label}`}
                          className="h-6 px-2 rounded text-[10px] font-mono text-teal-800 hover:text-emerald-800 hover:bg-emerald-50 flex items-center gap-1 cursor-pointer"
                        >
                          {copiedField === f.label ? <CheckIcon size={11} /> : <CopyIcon size={11} />}
                          {copiedField === f.label ? 'Copied' : 'Copy'}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => navigate('/account?tab=profile')}
                          className="h-6 px-2 rounded text-[10px] font-mono text-amber-700 hover:underline cursor-pointer"
                        >
                          Add
                        </button>
                      )}
                    </div>
                    <div className={`text-[12px] mt-0.5 break-words line-clamp-3 ${f.value ? 'text-slate-800' : 'text-slate-400 italic'}`}>
                      {f.value || 'Not filled'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApplicationStudioPage;
