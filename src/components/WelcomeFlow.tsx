import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { DESTINATION_CHOICES } from '../db/userProfile';
import { BarChartIcon, BellIcon, ChevronRightIcon, CloseIcon, FlaskIcon } from './Icons';

// First-run welcome for individual students: what the app does, then a first name and goals.
// Two steps and one short field, so a new student reaches the Radar in seconds. Everything else
// (university, skills, CV) is added later from the Radar banner or the account page.
// Like every dialog it closes only with its Close button.

const GOAL_CHOICES = [
  'MEXT Scholarship (Japan)',
  'Top GPA (4.0 Track)',
  'University Admissions Abroad',
  'Graduate Research Scholarships Abroad',
  'Undergraduate Exchange Programs',
  'Global Hackathons & Bounties',
  'ML Engineering & Systems Internships',
  'Summer Schools & Research Camps',
];

const VALUE_POINTS = [
  { icon: FlaskIcon, title: 'AI skill quizzes', text: '235 topics, 10 questions each. Pass at 7 to earn a Verified badge.', soon: false },
  { icon: BarChartIcon, title: 'Gap analysis', text: 'See what each grant or hackathon asks for and which skills you are still missing.', soon: false },
  { icon: BellIcon, title: 'Deadline alerts', text: 'Reminders in Telegram or Discord, so a deadline never surprises you.', soon: false },
];

// Letters from any alphabet, so Latin, Cyrillic, Korean, Japanese and other names all pass.
const NAME_PATTERN = /^[\p{L}][\p{L}\s'-]*$/u;

export const WelcomeFlow: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { userProfile, updateUserProfile } = useApp();
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState(userProfile.name?.trim().toLowerCase() === 'candidate' ? '' : userProfile.name || '');
  const [goals, setGoals] = useState<string[]>(userProfile.goals || []);
  const [destinations, setDestinations] = useState<string[]>(userProfile.destinations || []);

  const cleanName = name.trim();
  const nameValid = cleanName.length >= 2 && cleanName.length <= 40 && NAME_PATTERN.test(cleanName) && cleanName.toLowerCase() !== 'candidate';
  const canStart = nameValid && goals.length > 0;

  const toggleGoal = (goal: string) =>
    setGoals((prev) => (prev.includes(goal) ? prev.filter((item) => item !== goal) : [...prev, goal]));

  const toggleDestination = (place: string) =>
    setDestinations((prev) => (prev.includes(place) ? prev.filter((item) => item !== place) : [...prev, place]));

  const finish = (event: React.FormEvent) => {
    event.preventDefault();
    if (!canStart) return;
    updateUserProfile({ name: cleanName, goals, destinations, role: userProfile.role || 'Student / Learner' });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-title"
      className="animate-overlay-in fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-md overflow-y-auto"
    >
      <div className="animate-modal-in w-full max-w-xl max-h-[92dvh] my-auto overflow-y-auto bg-gradient-to-br from-[#EDF7F6] via-[#F3F6FF] to-[#E8F4F8] border border-teal-300/60 rounded-card shadow-[0_24px_60px_-15px_rgba(6,182,212,0.3)] text-slate-900">
        <div className="px-5 sm:px-6 pt-5 pb-4 border-b border-teal-200/80 bg-white/75 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <img src="/brand/qadam-icon.png" alt="" className="w-8 h-8 object-contain rounded-md shrink-0" />
            <div className="min-w-0">
              <h2 id="welcome-title" className="text-subheading text-indigo-950 font-bold">
                Welcome to QADAM Hub
              </h2>
              <div className="text-mini font-mono text-teal-800">Step {step} of 2 · free during the beta</div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close welcome"
            className="w-8 h-8 shrink-0 rounded-btn bg-white/80 hover:bg-white text-slate-500 hover:text-slate-900 border border-teal-200 flex items-center justify-center transition-colors cursor-pointer shadow-xs"
          >
            <CloseIcon size={14} />
          </button>
        </div>
        <div className="h-1 bg-teal-100" aria-hidden="true">
          <div className={`h-full bg-gradient-to-r from-emerald-600 to-teal-700 transition-[width] duration-500 ease-out-expo ${step === 1 ? 'w-1/2' : 'w-full'}`} />
        </div>

        {step === 1 ? (
          <div key="step-1" className="p-5 sm:p-6 space-y-5 animate-fadeIn">
            <div>
              <h3 className="text-[20px] font-bold text-indigo-950 leading-snug">Know what to learn, and what to apply for</h3>
              <p className="mt-1.5 text-[14px] leading-relaxed text-slate-700">
                QADAM Hub finds grants, hackathons and scholarships with confirmed deadlines, then shows you what stands between you and each one.
              </p>
            </div>
            <ul className="space-y-2.5">
              {VALUE_POINTS.map(({ icon: Icon, title, text, soon }) => (
                <li key={title} className="flex items-start gap-3 p-3.5 rounded-xl bg-white/80 border border-teal-200/80">
                  <span className="w-9 h-9 shrink-0 rounded-lg bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-700">
                    <Icon size={17} />
                  </span>
                  <span className="min-w-0">
                    <span className="flex items-center gap-2 text-[14px] font-bold text-indigo-950">
                      {title}
                      {soon && <span className="px-2 py-0.5 rounded-full border border-amber-300 bg-amber-100 text-amber-800 text-[12px] font-mono font-semibold">Coming soon</span>}
                    </span>
                    <span className="mt-0.5 block text-[13px] leading-relaxed text-slate-600">{text}</span>
                  </span>
                </li>
              ))}
            </ul>
            <button
              type="button"
              autoFocus
              onClick={() => setStep(2)}
              className="w-full min-h-[48px] rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white text-[15px] font-semibold shadow-md shadow-emerald-900/20 transition-colors cursor-pointer inline-flex items-center justify-center gap-2"
            >
              Continue
              <ChevronRightIcon size={16} />
            </button>
          </div>
        ) : (
          <form key="step-2" onSubmit={finish} className="p-5 sm:p-6 space-y-5 animate-fadeIn" noValidate>
            <div>
              <h3 className="text-[20px] font-bold text-indigo-950 leading-snug">What are you aiming for?</h3>
              <p className="mt-1.5 text-[14px] text-slate-700">Pick one or more. You can change this any time.</p>
            </div>
            <label className="block">
              <span className="block text-mini font-mono uppercase text-teal-900 font-semibold mb-1">First name</span>
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoComplete="given-name"
                maxLength={40}
                placeholder="What should we call you?"
                className="w-full h-11 px-3.5 bg-white border border-teal-200/90 rounded-xl text-base md:text-[14px] text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none shadow-xs"
              />
            </label>
            <div role="group" aria-label="Goals" className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {GOAL_CHOICES.map((goal) => {
                const selected = goals.includes(goal);
                return (
                  <button
                    key={goal}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => toggleGoal(goal)}
                    className={`min-h-[48px] px-3 py-2 rounded-xl text-left text-[13px] font-mono border transition-colors cursor-pointer ${
                      selected
                        ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold border-indigo-600 shadow-xs'
                        : 'bg-white border-teal-200/90 text-slate-700 hover:border-indigo-400'
                    }`}
                  >
                    {goal}
                  </button>
                );
              })}
            </div>
            <div>
              <span className="block text-mini font-mono uppercase text-teal-900 font-semibold mb-1">Where do you want to go?</span>
              <p className="text-[13px] text-slate-600 mb-2">Optional. We show these first. Skip it to see everything.</p>
              <div role="group" aria-label="Destinations" className="flex flex-wrap gap-2">
                {DESTINATION_CHOICES.map((place) => {
                  const selected = destinations.includes(place);
                  return (
                    <button
                      key={place}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => toggleDestination(place)}
                      className={`min-h-[40px] px-3.5 rounded-full text-[13px] font-mono border transition-colors cursor-pointer ${
                        selected
                          ? 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white font-semibold border-emerald-600 shadow-xs'
                          : 'bg-white border-teal-200/90 text-slate-700 hover:border-emerald-500'
                      }`}
                    >
                      {place}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="min-h-[48px] px-4 rounded-xl bg-white/80 hover:bg-white border border-teal-200 text-teal-900 text-[14px] font-semibold transition-colors cursor-pointer"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={!canStart}
                className="flex-1 min-h-[48px] rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 disabled:from-slate-200 disabled:to-slate-200 disabled:text-slate-400 text-white text-[15px] font-semibold shadow-md shadow-emerald-900/20 transition-colors cursor-pointer disabled:cursor-not-allowed disabled:shadow-none inline-flex items-center justify-center gap-2"
              >
                Start exploring
                <ChevronRightIcon size={16} />
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
