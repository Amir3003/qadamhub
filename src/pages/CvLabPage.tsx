import React, { useState, useRef, useEffect, useLayoutEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { PageHeader } from '../components/PageHeader';
import { SkillCard, SKILL_META } from '../components/SkillCard';
import { QUIZ_BANK } from '../db/quizBank';
import { QUIZ_CATEGORIES, getCatalogTopic, getSkillCategory } from '../db/quizCatalog';
import { TARGET_TRACKS, radarTargets } from '../db/targetTracks';
import {
  CheckIcon,
  FileTextIcon,
  UserIcon,
  CompanyBadgeIcon,
  ChevronDownIcon,
  ShieldIcon,
  SearchIcon,
  CloseIcon,
} from '../components/Icons';

const QUIZ_PAGE_SIZE = 24;

export const CvLabPage: React.FC = () => {
  const { skills, openSkillQuiz, userProfile, setIsOnboardingOpen, opportunities } = useApp();

  // Benchmark target selection state
  const [targetOppId, setTargetOppId] = useState<string>(TARGET_TRACKS[0].id);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [quizQuery, setQuizQuery] = useState('');
  const [quizScope, setQuizScope] = useState<'for-you' | 'all'>('for-you');
  const [quizCategory, setQuizCategory] = useState<string>('');
  const [quizLimit, setQuizLimit] = useState(QUIZ_PAGE_SIZE);

  // Any change to the filters starts the list from the first page again.
  useEffect(() => {
    setQuizLimit(QUIZ_PAGE_SIZE);
  }, [quizQuery, quizScope, quizCategory]);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Targets: skill tracks first, then radar opportunities that list required skills.
  const fromRadar = useMemo(() => radarTargets(opportunities), [opportunities]);
  const allTargets = useMemo(() => [...TARGET_TRACKS, ...fromRadar], [fromRadar]);
  const selectedOpp = allTargets.find((o) => o.id === targetOppId) || TARGET_TRACKS[0];

  // Anchor the popover to the trigger in viewport coordinates. On desktop it opens below
  // (or above, when space below is tight) aligned to the trigger's right edge; on mobile it
  // becomes a full-width sheet. The menu is portaled to <body>, so no ancestor
  // overflow, backdrop-filter or stacking context can clip or cover it.
  const updateMenuPosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const gap = 8;
    const margin = 16;

    if (vw < 640) {
      setMenuStyle({ left: margin, right: margin, top: 80, maxHeight: vh - 80 - 112 });
      return;
    }

    const spaceBelow = vh - rect.bottom - gap - margin;
    const spaceAbove = rect.top - gap - margin;
    const openUp = spaceBelow < 240 && spaceAbove > spaceBelow;
    const right = Math.max(margin, vw - rect.right);
    setMenuStyle(
      openUp
        ? { right, bottom: vh - rect.top + gap, maxHeight: Math.min(320, spaceAbove) }
        : { right, top: rect.bottom + gap, maxHeight: Math.min(320, Math.max(160, spaceBelow)) }
    );
  }, []);

  useLayoutEffect(() => {
    if (!isDropdownOpen) return;
    updateMenuPosition();
    window.addEventListener('resize', updateMenuPosition);
    window.addEventListener('scroll', updateMenuPosition, true);
    return () => {
      window.removeEventListener('resize', updateMenuPosition);
      window.removeEventListener('scroll', updateMenuPosition, true);
    };
  }, [isDropdownOpen, updateMenuPosition]);

  // Close on Escape and return focus to the trigger
  useEffect(() => {
    if (!isDropdownOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsDropdownOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isDropdownOpen]);

  // Check if user has initialized their profile
  const isProfileReady =
    userProfile.isOnboarded &&
    (Boolean(userProfile.name?.trim()) || (userProfile.skills && userProfile.skills.length > 0));

  const verifiedCount = skills.filter((s) => s.status === 'VERIFIED').length;
  const userSkills = userProfile.skills || [];

  // Required skills based on selected benchmark opportunity or default set
  const requiredTargetSkills = selectedOpp
    ? selectedOpp.skills
    : ['Python', 'Docker', 'PyTorch', 'Vector DBs'];

  // Categorize candidate skills against required target skills
  const matchedTargetSkills = requiredTargetSkills.filter((req) =>
    userSkills.some((us) => us.toLowerCase() === req.toLowerCase())
  );

  const missingTargetSkills = requiredTargetSkills.filter(
    (req) => !userSkills.some((us) => us.toLowerCase() === req.toLowerCase())
  );

  // Dynamic target match percentage
  const targetMatchRatio =
    requiredTargetSkills.length > 0
      ? matchedTargetSkills.length / requiredTargetSkills.length
      : 1;

  // Genuine dynamic sub-metrics calculation based on user data and reactive target alignment
  const hasName = Boolean(userProfile.name?.trim());
  const hasEdu = Boolean(userProfile.university?.trim());
  const hasContact = Boolean(userProfile.email?.trim() || userProfile.phone?.trim());
  const structureScore = isProfileReady
    ? Math.round((hasName ? 35 : 0) + (hasEdu ? 35 : 0) + (hasContact ? 30 : 0))
    : 0;

  const hasGoals = (userProfile.goals?.length || 0) > 0;
  const hasProjects = Boolean(userProfile.cvText?.trim());

  const verifiedTargetCount = matchedTargetSkills.filter((req) =>
    skills.some((s) => s.name.toLowerCase() === req.toLowerCase() && s.status === 'VERIFIED')
  ).length;

  const impactScore = isProfileReady
    ? Math.min(
        100,
        Math.round(
          (hasGoals ? 25 : 10) +
            (hasProjects ? 35 : 15) +
            verifiedCount * 8 +
            verifiedTargetCount * 15
        )
      )
    : 0;

  // Keywords ATS Match Score reactively calculated against selected target opportunity
  const targetKeywordsPercentage = Math.round(targetMatchRatio * 65);
  const baselineKeywordsBonus = Math.min(35, userSkills.length * 5 + verifiedCount * 8);
  const keywordsScore = isProfileReady
    ? Math.min(100, targetKeywordsPercentage + baselineKeywordsBonus)
    : 0;

  // Final Composite ATS Health Score: Weighted combination of Structure (25%), Impact (35%), and Target Alignment (40%)
  const currentHealthScore = isProfileReady
    ? Math.min(100, Math.round(structureScore * 0.25 + impactScore * 0.35 + keywordsScore * 0.4))
    : 0;

  const fullName = userProfile.name
    ? `${userProfile.name} ${userProfile.surname || ''}`.trim()
    : 'Anonymous Candidate';

  const sanitizedNameForFile = userProfile.name
    ? `${userProfile.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_resume.pdf`
    : 'candidate_resume.pdf';

  const pdfFilename = userProfile.resumeFileName || sanitizedNameForFile;

  // Prioritize skills matching the selected benchmark opportunity
  const prioritizedSkills = [...skills].sort((a, b) => {
    const aIsTarget = requiredTargetSkills.some((req) => req.toLowerCase() === a.name.toLowerCase());
    const bIsTarget = requiredTargetSkills.some((req) => req.toLowerCase() === b.name.toLowerCase());
    if (aIsTarget && !bIsTarget) return -1;
    if (!aIsTarget && bIsTarget) return 1;

    const aIsMissing = missingTargetSkills.some((m) => m.toLowerCase() === a.name.toLowerCase());
    const bIsMissing = missingTargetSkills.some((m) => m.toLowerCase() === b.name.toLowerCase());
    if (aIsMissing && !bIsMissing) return -1;
    if (!aIsMissing && bIsMissing) return 1;

    return 0;
  });

  // Quizzes the candidate needs: skills the target requires plus profile skills not yet verified.
  const isNeeded = (name: string) => {
    const n = name.toLowerCase();
    return (
      requiredTargetSkills.some((req) => req.toLowerCase() === n) ||
      userSkills.some((us) => us.toLowerCase() === n)
    );
  };
  const neededSkills = prioritizedSkills.filter((s) => isNeeded(s.name));

  // Search matches the skill name, category and quiz topics (and question text for built-in banks).
  const query = quizQuery.trim().toLowerCase();
  const matchesQuery = (skill: (typeof skills)[number]) => {
    if (!query) return true;
    const topics = [...(SKILL_META[skill.id]?.topics || []), ...(getCatalogTopic(skill.id)?.topics || [])];
    const questions = QUIZ_BANK[skill.id] || skill.quizQuestions;
    const haystack = [skill.name, getSkillCategory(skill.id), skill.reason, ...topics, ...questions.map((q) => q.question)]
      .join(' ')
      .toLowerCase();
    // Each word must start a word in the text, so "rag" finds RAG but not "storage".
    // The word is regex-escaped, so it cannot inject a pattern.
    return query
      .split(/\s+/)
      .every((word) => new RegExp(`(^|[^a-z0-9])${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).test(haystack)); // nosemgrep: javascript.lang.security.audit.detect-non-literal-regexp.detect-non-literal-regexp
  };

  // A search always looks across every quiz; without one, "For you" shows only needed quizzes.
  const scopedSkills = query || quizScope === 'all' ? prioritizedSkills : neededSkills;
  const matchingSkills = scopedSkills.filter(matchesQuery);
  const categoryCounts = new Map<string, number>();
  for (const s of matchingSkills) {
    const c = getSkillCategory(s.id);
    categoryCounts.set(c, (categoryCounts.get(c) || 0) + 1);
  }
  const activeCategory = quizCategory && categoryCounts.has(quizCategory) ? quizCategory : '';
  const filteredSkills = activeCategory
    ? matchingSkills.filter((s) => getSkillCategory(s.id) === activeCategory)
    : matchingSkills;
  const visibleSkills = filteredSkills.slice(0, quizLimit);

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-transparent relative z-10 text-slate-100">
      {/* Page Header with Custom Sleek Target Selector */}
      <PageHeader
        title="CV & Skill Lab"
        subtitle={
          isProfileReady
            ? `benchmark target: ${selectedOpp ? selectedOpp.title : 'General Profile Readiness'} · candidate: ${fullName}`
            : 'gap analysis uninitialized · complete candidate profile in Settings'
        }
        actions={
          <div className="relative">
            <button
              ref={triggerRef}
              type="button"
              aria-haspopup="listbox"
              aria-expanded={isDropdownOpen}
              onClick={() => setIsDropdownOpen((open) => !open)}
              className="h-10 px-3.5 bg-slate-900/80 hover:bg-slate-800/80 border border-teal-500/30 hover:border-teal-400 rounded-btn text-mini font-mono text-teal-100 flex items-center gap-2.5 transition-colors cursor-pointer shadow-sm"
            >
              <CompanyBadgeIcon orgKey={selectedOpp.orgKey} size={15} />
              <div className="flex flex-col text-left max-w-[200px] sm:max-w-xs truncate">
                <span className="text-[12px] text-teal-300 uppercase tracking-wider leading-none">
                  Target Benchmark
                </span>
                <span className="text-[12px] font-semibold text-white truncate mt-0.5">
                  {selectedOpp.title}
                </span>
              </div>
              <ChevronDownIcon size={14} className={`text-teal-300 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Target Benchmark popover, portaled to <body> with a click-to-close backdrop */}
            {isDropdownOpen &&
              createPortal(
                <>
                  <div
                    className="animate-overlay-in fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm sm:bg-transparent sm:backdrop-blur-none"
                    onClick={() => setIsDropdownOpen(false)}
                    aria-hidden="true"
                  />
                  <div
                    role="listbox"
                    aria-label="Select Benchmark Target Opportunity"
                    style={menuStyle}
                    className="animate-pop-in origin-top fixed z-50 w-auto sm:w-96 rounded-card bg-gradient-to-br from-[#EDF7F6] via-[#F3F6FF] to-[#E8F4F8] border border-teal-300 shadow-2xl pb-1 overflow-y-auto overscroll-contain text-slate-900"
                  >
                    <div className="px-3 py-2 border-b border-teal-200/60 text-[12px] font-mono uppercase text-teal-800 font-semibold sticky top-0 z-10 bg-[#EDF7F6] flex items-center justify-between">
                      <span>Select a target</span>
                      <button
                        type="button"
                        onClick={() => setIsDropdownOpen(false)}
                        className="sm:hidden text-teal-800 hover:text-slate-900 text-mini font-mono px-1.5 py-0.5 rounded border border-teal-200 bg-white"
                      >
                        Close
                      </button>
                    </div>
                    {[
                      { label: 'Skill tracks', items: TARGET_TRACKS },
                      { label: 'From the radar', items: fromRadar },
                    ].filter((g) => g.items.length > 0).map((group) => (
                      <div key={group.label}>
                        <div className="px-3 pt-3 pb-1 text-[12px] font-mono uppercase tracking-wider text-teal-700 font-semibold">
                          {group.label}
                        </div>
                        {group.items.map((opp) => {
                      const isSelected = opp.id === targetOppId;
                      return (
                        <button
                          key={opp.id}
                          type="button"
                          role="option"
                          aria-selected={isSelected}
                          onClick={() => {
                            setTargetOppId(opp.id);
                            setIsDropdownOpen(false);
                          }}
                          className={`w-full px-3 py-2.5 flex items-center justify-between text-left transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-emerald-100/70 text-indigo-950 font-bold'
                              : 'hover:bg-white/80 text-slate-700 hover:text-slate-900'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <CompanyBadgeIcon orgKey={opp.orgKey} size={16} className="flex-shrink-0" />
                            <div className="min-w-0">
                              <div className="text-[13px] font-semibold truncate">{opp.title}</div>
                              <div className="text-mini font-mono text-teal-800 truncate">{opp.subtitle}</div>
                            </div>
                          </div>
                          {isSelected && <CheckIcon size={14} className="text-emerald-600 flex-shrink-0 ml-2" />}
                        </button>
                      );
                    })}
                      </div>
                    ))}
                  </div>
                </>,
                document.body
              )}
          </div>
        }
      />

      <div className="p-4 sm:p-6 pb-28 lg:pb-8 space-y-6">
        {/* ROW 1 (100% Full Width): CV Health Score Card */}
        <div className="p-6 rounded-card bg-gradient-to-br from-[#EDF7F6]/95 via-[#F3F6FF]/95 to-[#E8F4F8]/95 backdrop-blur-xl border border-teal-300/40 shadow-[0_16px_40px_-12px_rgba(6,182,212,0.18)] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="text-mini font-mono uppercase tracking-wider text-teal-800 font-semibold">
                ATS CV Health Score & Target Benchmark Alignment
              </div>
              <div className="flex items-baseline gap-3 mt-1">
                <div className="text-[32px] font-mono font-bold text-indigo-950 leading-none">
                  {isProfileReady ? `${currentHealthScore}/100` : '0 / 100'}
                </div>
                <span className="text-[13px] text-teal-900 font-mono">
                  Target: <strong className="text-indigo-950 font-bold">{selectedOpp.title}</strong>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="text-mini font-mono px-3 py-1 rounded-btn bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold">
                {Math.round(targetMatchRatio * 100)}% BENCHMARK FIT
              </span>
              {isProfileReady ? (
                <span className="text-mini font-mono px-3 py-1 rounded-btn bg-white/90 text-teal-900 border border-teal-200 font-semibold">
                  ATS OPTIMIZED
                </span>
              ) : (
                <span className="text-mini font-mono px-3 py-1 rounded-btn bg-white/60 text-slate-400 border border-teal-200 font-medium">
                  PENDING PROFILE
                </span>
              )}
            </div>
          </div>

          {/* Full-Width Progress Bar */}
          <div className="w-full h-2.5 bg-white/80 rounded-full overflow-hidden border border-teal-200/80">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500 rounded-full"
              style={{ width: `${currentHealthScore}%` }}
            />
          </div>

          {/* Sub-Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2 border-t border-teal-200/60 text-mini font-mono">
            <div>
              <span className="text-teal-800">Structure Completeness</span>
              <div className="text-[16px] text-indigo-950 font-bold mt-0.5">
                {isProfileReady ? `${structureScore}%` : '0%'}
              </div>
              <div className="text-[12px] text-teal-800 mt-0.5">Identity, Edu & Contact</div>
            </div>

            <div>
              <span className="text-teal-800">Domain Impact</span>
              <div className="text-[16px] text-indigo-950 font-bold mt-0.5">
                {isProfileReady ? `${impactScore}%` : '0%'}
              </div>
              <div className="text-[12px] text-teal-800 mt-0.5">Highlights & Verified Tests</div>
            </div>

            <div>
              <span className="text-teal-800">Target Keywords Fit</span>
              <div className="text-[16px] text-indigo-950 font-bold mt-0.5">
                {isProfileReady ? `${keywordsScore}%` : '0%'}
              </div>
              <div className="text-[12px] text-teal-800 mt-0.5">{matchedTargetSkills.length}/{requiredTargetSkills.length} required keywords</div>
            </div>

            <div>
              <span className="text-teal-800">Verified Competencies</span>
              <div className="text-[16px] text-emerald-700 font-bold mt-0.5">
                {isProfileReady ? `${verifiedCount} Skills Verified` : '0'}
              </div>
              <div className="text-[12px] text-teal-800 mt-0.5">&gt;70% quiz scores</div>
            </div>
          </div>
        </div>

        {/* ROW 2 (Symmetrical 2-Column Split: grid-cols-1 lg:grid-cols-2 gap-6) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          {/* LEFT COLUMN: CV Document Preview */}
          <div className="rounded-card bg-gradient-to-br from-[#EDF7F6]/95 via-[#F3F6FF]/95 to-[#E8F4F8]/95 backdrop-blur-xl border border-teal-300/40 shadow-[0_16px_40px_-12px_rgba(6,182,212,0.18)] overflow-hidden flex flex-col justify-between">
            {/* Header pill */}
            <div className="px-5 py-3 border-b border-teal-200/80 bg-white/70 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileTextIcon size={14} className="text-emerald-600" />
                <span className="text-mini font-mono text-indigo-950 font-bold">
                  {pdfFilename}
                </span>
              </div>
              <span className="text-[12px] font-mono uppercase px-2 py-0.5 rounded bg-white border border-teal-200 text-teal-800 font-semibold">
                Candidate ATS Document
              </span>
            </div>

            {/* Rendered CV Body */}
            {!isProfileReady ? (
              <div className="p-10 text-center space-y-4 flex-1 flex flex-col justify-center items-center text-teal-900">
                <div className="w-12 h-12 rounded-full bg-emerald-100 border border-emerald-300 mx-auto flex items-center justify-center text-emerald-700">
                  <FileTextIcon size={20} />
                </div>
                <div className="text-subheading text-indigo-950 font-bold">No Resume Registered</div>
                <p className="text-[13px] text-teal-950 max-w-sm leading-relaxed">
                  Complete your profile and technical stack in Settings to generate ATS resume analysis and skill recommendations.
                </p>
                <div className="pt-2 flex items-center justify-center gap-2.5">
                  <Link
                    to="/account?tab=profile"
                    className="h-9 px-4 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white rounded-btn text-mini font-mono flex items-center gap-1.5 transition-colors shadow-xs font-semibold"
                  >
                    <UserIcon size={13} />
                    <span>Configure Profile</span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => setIsOnboardingOpen(true)}
                    className="h-9 px-4 bg-white hover:bg-slate-50 border border-teal-200 text-teal-950 rounded-btn text-mini font-mono transition-colors cursor-pointer font-semibold"
                  >
                    Setup Account
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-6 space-y-5 flex-1 flex flex-col justify-between bg-white/70">
                {/* Header */}
                <div className="border-b border-teal-200/60 pb-4">
                  <h3 className="text-[22px] font-bold text-indigo-950 tracking-tight font-sans">
                    {fullName}
                  </h3>
                  <div className="text-mini font-mono text-teal-900 mt-1 leading-relaxed">
                    {userProfile.location || 'Local'} · {userProfile.email || 'student@university.edu'}{' '}
                    {userProfile.phone ? `· ${userProfile.phone}` : ''}
                  </div>
                  {(userProfile.github || userProfile.linkedin) && (
                    <div className="text-mini font-mono text-teal-700 mt-0.5">
                      {userProfile.github ? `${userProfile.github} ` : ''}
                      {userProfile.linkedin ? `· ${userProfile.linkedin}` : ''}
                    </div>
                  )}
                </div>

                {/* Section: Skills */}
                <div className="space-y-2">
                  <div className="text-mini font-mono uppercase text-teal-800 font-semibold tracking-wider border-b border-teal-200/60 pb-1">
                    Skills & Tooling
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {userSkills.length > 0 ? (
                      userSkills.map((skill) => {
                        const isVerified = skills.some(
                          (s) => s.name.toLowerCase() === skill.toLowerCase() && s.status === 'VERIFIED'
                        );
                        return (
                          <span
                            key={skill}
                            className={`px-2 py-0.5 rounded text-mini font-mono border ${
                              isVerified
                                ? 'bg-emerald-100 text-emerald-800 font-bold border-emerald-300'
                                : 'bg-white text-teal-950 border-teal-200'
                            }`}
                          >
                            {skill} {isVerified ? '✓' : ''}
                          </span>
                        );
                      })
                    ) : (
                      <span className="text-teal-700 italic text-[12px]">No skills added yet</span>
                    )}
                  </div>
                </div>

                {/* Section: Highlights */}
                <div className="space-y-2">
                  <div className="text-mini font-mono uppercase text-teal-800 font-semibold tracking-wider border-b border-teal-200/60 pb-1">
                    Resume Highlights & Projects
                  </div>
                  <div className="text-[12px] text-teal-950 font-mono leading-relaxed max-h-36 overflow-y-auto">
                    {userProfile.cvText ? (
                      <p className="whitespace-pre-line text-indigo-950 font-medium">{userProfile.cvText}</p>
                    ) : userProfile.goals && userProfile.goals.length > 0 ? (
                      <ul className="space-y-1">
                        {userProfile.goals.map((g) => (
                          <li key={g} className="flex items-center gap-1.5">
                            <span className="text-emerald-600 font-bold">•</span>
                            <span className="text-teal-950">Target Focus: {g}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="italic text-teal-700">No project bullets registered. Configure in Profile Settings.</p>
                    )}
                  </div>
                </div>

                {/* Section: Education */}
                <div className="space-y-1.5 pt-2 border-t border-teal-200/60">
                  <div className="text-mini font-mono uppercase text-teal-800 font-semibold tracking-wider">
                    Education & Track
                  </div>
                  <div className="flex items-center justify-between text-[13px]">
                    <div>
                      <div className="font-bold text-indigo-950">
                        {userProfile.university || 'University not specified'}
                      </div>
                      <div className="text-teal-800 text-[12px]">
                        {userProfile.degree || userProfile.major || userProfile.role}
                      </div>
                    </div>
                    <div className="text-mini font-mono text-teal-700 font-medium">
                      {userProfile.years || '2023 - 2027'}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: Stacked Symmetrical Cards (Strengths, Benchmark Gaps, ATS Readiness) */}
          <div className="space-y-4 flex flex-col justify-between">
            {/* 1. Strengths Card (Mint-Emerald Tint) */}
            <div className="p-5 rounded-card bg-gradient-to-br from-emerald-50 to-teal-100/80 border border-emerald-300/60 text-emerald-950 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 shadow-2xs" />
                  <span className="text-subheading text-emerald-950 text-[15px] font-bold">Target Strengths</span>
                </div>
                <span className="text-mini font-mono text-emerald-800 font-bold">
                  {matchedTargetSkills.length} matches
                </span>
              </div>
              <ul className="space-y-1.5 text-[13px] text-emerald-950">
                {isProfileReady ? (
                  <>
                    {matchedTargetSkills.length > 0 && (
                      <li className="flex items-center gap-2">
                        <span className="text-emerald-700 font-mono text-[12px]">•</span>
                        <span>Matches target prerequisites: <strong className="text-indigo-950">{matchedTargetSkills.join(', ')}</strong></span>
                      </li>
                    )}
                    {userProfile.university && (
                      <li className="flex items-center gap-2">
                        <span className="text-emerald-700 font-mono text-[12px]">•</span>
                        <span>Academic standing: <strong className="text-indigo-950">{userProfile.university}</strong></span>
                      </li>
                    )}
                    {verifiedCount > 0 && (
                      <li className="flex items-center gap-2 text-emerald-800 font-bold">
                        <span className="font-mono text-[12px]">✓</span>
                        <span>{verifiedCount} skill(s) verified via interactive quiz</span>
                      </li>
                    )}
                  </>
                ) : (
                  <li className="text-mini font-mono text-emerald-800 italic">
                    Configure profile to generate verified strengths.
                  </li>
                )}
              </ul>
            </div>

            {/* 2. Benchmark Gaps Card (Warm Amber-Peach Tint) */}
            <div className="p-5 rounded-card bg-gradient-to-br from-amber-50 to-orange-100/80 border border-amber-300/60 text-amber-950 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-600 shadow-2xs" />
                  <span className="text-subheading text-amber-950 text-[15px] font-bold">Benchmark Gaps</span>
                </div>
                <span className="text-mini font-mono text-amber-800 font-bold">
                  {missingTargetSkills.length} missing
                </span>
              </div>
              <ul className="space-y-1.5 text-[13px] text-amber-950">
                {isProfileReady ? (
                  <>
                    {missingTargetSkills.length > 0 ? (
                      missingTargetSkills.map((gap) => (
                        <li key={gap} className="flex items-center gap-2">
                          <span className="text-amber-700 font-mono text-[12px]">•</span>
                          <span>Missing competency: <strong className="text-amber-950">{gap}</strong> (Prerequisite for {selectedOpp.title})</span>
                        </li>
                      ))
                    ) : (
                      <li className="text-mini font-mono text-emerald-800 font-bold italic">
                        All target benchmark skills satisfied! Full stack ready.
                      </li>
                    )}
                  </>
                ) : (
                  <li className="text-mini font-mono text-amber-800 italic">
                    Awaiting candidate profile setup.
                  </li>
                )}
              </ul>
            </div>

            {/* 3. Eligibility & ATS Readiness Summary Card (Sky-Cyan Tint) */}
            <div className="p-5 rounded-card bg-gradient-to-br from-sky-50 to-cyan-100/80 border border-sky-300/60 text-sky-950 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldIcon size={16} className="text-sky-700" />
                  <span className="text-subheading text-sky-950 text-[15px] font-bold">Eligibility & ATS Readiness</span>
                </div>
                <span className="text-mini font-mono px-2 py-0.5 rounded bg-sky-200/80 border border-sky-300 text-sky-950 font-bold">
                  Ready to Submit
                </span>
              </div>
              <div className="space-y-2 text-[12px] text-sky-950">
                <div className="flex items-center justify-between font-mono">
                  <span>ATS Format:</span>
                  <span className="text-indigo-950 font-bold">Linear High-Density Standard</span>
                </div>
                <div className="flex items-center justify-between font-mono">
                  <span>Confinement Sandbox:</span>
                  <span className="text-emerald-700 font-bold">/workspace/qadam (LOCKED)</span>
                </div>
                <div className="flex items-center justify-between font-mono">
                  <span>Recommendation:</span>
                  <span className="text-sky-950 font-medium">
                    {missingTargetSkills.length > 0
                      ? `Take quiz for ${missingTargetSkills[0]} below to boost score.`
                      : 'Stack fully matches. Proceed to Application Studio.'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ROW 3: Skill cards grid, recommended skills to learn */}
        <div className="space-y-4 pt-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-teal-200/60 gap-2">
            <div>
              <h3 className="text-mini font-mono uppercase tracking-wider text-teal-300 font-semibold">
                Recommended Skills & Benchmark Curriculum
              </h3>
              <div className="text-[14px] text-slate-100 font-bold mt-0.5">
                {selectedOpp.kind === 'TRACK' ? 'Skills for the track' : 'Skills listed by'} {selectedOpp.title}
              </div>
            </div>
            <span className="text-mini font-mono px-2.5 py-1 rounded bg-white/80 border border-teal-200 text-teal-900 font-semibold">
              {filteredSkills.length} of {prioritizedSkills.length} Skill Quizzes
            </span>
          </div>

          {/* Quiz finder: needed-only by default, search spans every quiz */}
          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1 min-w-0">
              <SearchIcon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-teal-700 pointer-events-none" />
              <input
                type="text"
                enterKeyHint="search"
                value={quizQuery}
                onChange={(e) => setQuizQuery(e.target.value)}
                placeholder="Search quizzes: skill or topic, e.g. Docker, RAG, joins"
                aria-label="Search skill quizzes"
                className="w-full h-11 pl-9 pr-10 rounded-btn bg-white/90 border border-teal-200/80 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 text-[13px] text-slate-900 placeholder:text-slate-500"
              />
              {quizQuery && (
                <button
                  type="button"
                  onClick={() => setQuizQuery('')}
                  aria-label="Clear search"
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-md text-teal-800 hover:bg-teal-100/70 cursor-pointer"
                >
                  <CloseIcon size={14} />
                </button>
              )}
            </div>
            <div role="tablist" aria-label="Quiz scope" className="flex p-1 rounded-btn bg-white/80 border border-teal-200/80 flex-shrink-0">
              {([
                ['for-you', `For you (${neededSkills.length})`],
                ['all', `All (${prioritizedSkills.length})`],
              ] as const).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  aria-selected={quizScope === value}
                  onClick={() => setQuizScope(value)}
                  className={`flex-1 sm:flex-none h-9 px-4 rounded-md text-mini font-mono font-bold transition-colors cursor-pointer ${
                    quizScope === value ? 'bg-teal-600 text-white shadow-2xs' : 'text-teal-900 hover:bg-teal-50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          {query && quizScope === 'for-you' && (
            <p className="text-[12px] text-teal-200 -mt-1">Searching all quizzes, not only the ones for you.</p>
          )}
          {categoryCounts.size > 1 && (
            <div className="flex gap-1.5 overflow-x-auto sm:flex-wrap -mx-4 px-4 sm:mx-0 sm:px-0 pb-1 sm:pb-0 [scrollbar-width:none]" role="group" aria-label="Filter quizzes by category">
              {[['', matchingSkills.length] as const, ...QUIZ_CATEGORIES.filter((c) => categoryCounts.has(c)).map((c) => [c, categoryCounts.get(c) || 0] as const)].map(
                ([value, count]) => (
                  <button
                    key={value || 'all'}
                    type="button"
                    aria-pressed={activeCategory === value}
                    onClick={() => setQuizCategory(value)}
                    className={`h-8 px-3 rounded-full text-[12px] font-medium border transition-colors cursor-pointer whitespace-nowrap flex-shrink-0 ${
                      activeCategory === value
                        ? 'bg-teal-500/90 border-teal-400 text-white'
                        : 'bg-white/10 border-white/15 text-slate-200 hover:bg-white/15'
                    }`}
                  >
                    {value || 'All categories'} <span className="opacity-70">{count}</span>
                  </button>
                )
              )}
            </div>
          )}

          {/* Grid of Vertical Portrait Cards */}
          {visibleSkills.length === 0 && (
            <div className="p-6 rounded-card bg-white/80 border border-teal-200/80 text-center space-y-2">
              <div className="text-[14px] font-bold text-indigo-950">
                {query ? `No quizzes match "${quizQuery.trim()}"` : 'No quizzes for you yet'}
              </div>
              <p className="text-[13px] text-slate-600">
                {query
                  ? 'Try a broader word, for example a tool name or a topic.'
                  : 'Pick a target benchmark above or add skills to your profile, or browse all quizzes.'}
              </p>
              {!query && (
                <button
                  type="button"
                  onClick={() => setQuizScope('all')}
                  className="h-10 px-4 rounded-btn bg-teal-600 hover:bg-teal-500 text-white text-mini font-mono font-bold cursor-pointer"
                >
                  Show all quizzes
                </button>
              )}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {visibleSkills.map((skill) => {
              const isMissingTarget = missingTargetSkills.some(
                (m) => m.toLowerCase() === skill.name.toLowerCase()
              );
              const isMatchedTarget = matchedTargetSkills.some(
                (m) => m.toLowerCase() === skill.name.toLowerCase()
              );
              return (
                <SkillCard
                  key={skill.id}
                  skill={skill}
                  isGap={isMissingTarget}
                  isMatch={isMatchedTarget}
                  gapReason={`Part of ${selectedOpp.title}. Verify it to close this gap.`}
                  onStartQuiz={() => openSkillQuiz(skill)}
                />
              );
            })}
          </div>
          {filteredSkills.length > visibleSkills.length && (
            <div className="flex justify-center pt-1">
              <button
                type="button"
                onClick={() => setQuizLimit((n) => n + QUIZ_PAGE_SIZE)}
                className="h-11 px-6 rounded-btn bg-white/90 hover:bg-white border border-teal-200 text-teal-900 text-[13px] font-bold cursor-pointer shadow-xs"
              >
                Show more ({filteredSkills.length - visibleSkills.length} left)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CvLabPage;
