import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { CloseIcon, CheckIcon, FlaskIcon } from './Icons';
import { findQuizSkill } from '../db/quizCatalog';

export const CvGapsModal: React.FC = () => {
  const navigate = useNavigate();
  const {
    selectedOpportunityForGaps,
    setSelectedOpportunityForGaps,
    userProfile,
    skills,
    openSkillQuiz,
  } = useApp();

  if (!selectedOpportunityForGaps) return null;

  const opp = selectedOpportunityForGaps;

  // Classify skills for this opportunity
  const matchedSkills: string[] = [];
  const unverifiedSkills: { name: string; skillItem?: (typeof skills)[0] }[] = [];
  const missingSkills: { name: string; skillItem?: (typeof skills)[0] }[] = [];

  opp.skills.forEach((reqSkill) => {
    const knownSkillItem = findQuizSkill(skills, reqSkill);

    if (knownSkillItem?.status === 'VERIFIED') {
      matchedSkills.push(reqSkill);
    } else if (
      knownSkillItem?.status === 'UNVERIFIED' ||
      userProfile.skills.some((us) => us.toLowerCase() === reqSkill.toLowerCase())
    ) {
      unverifiedSkills.push({ name: reqSkill, skillItem: knownSkillItem });
    } else {
      missingSkills.push({ name: reqSkill, skillItem: knownSkillItem });
    }
  });

  const handleLaunchQuiz = (skillItem: (typeof skills)[0]) => {
    setSelectedOpportunityForGaps(null);
    openSkillQuiz(skillItem);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="gaps-modal-title"
      className="animate-overlay-in fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-md overflow-y-auto"
    >
      <div className="animate-modal-in w-full max-w-xl max-h-[85vh] my-auto bg-gradient-to-br from-[#EDF7F6] via-[#F3F6FF] to-[#E8F4F8] border border-teal-300/60 rounded-card shadow-2xl flex flex-col overflow-hidden text-slate-900">
        {/* Header */}
        <div className="px-5 py-4 border-b border-teal-200/60 flex items-center justify-between bg-teal-50/70 flex-shrink-0">
          <div>
            <div className="text-mini font-mono uppercase text-teal-900 font-bold tracking-wider">
              ATS Gap Analysis & Verification
            </div>
            <h3 id="gaps-modal-title" className="text-subheading text-indigo-950 font-bold mt-0.5">
              {opp.title}
            </h3>
          </div>
          <button
            type="button"
            onClick={() => setSelectedOpportunityForGaps(null)}
            aria-label="Close dialog"
            className="w-8 h-8 flex items-center justify-center text-teal-800 hover:text-indigo-950 hover:bg-teal-100/60 rounded-btn cursor-pointer transition-colors"
          >
            <CloseIcon size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 space-y-4 sm:space-y-5 overflow-y-auto flex-1">
          {/* Compatibility Banner */}
          <div className="p-4 bg-white/90 rounded-card border border-teal-200/80 flex items-center justify-between shadow-2xs">
            <div>
              <div className="text-mini font-mono text-teal-900 uppercase font-bold">Match Alignment</div>
              <div className="text-[22px] font-mono font-black text-emerald-700 mt-0.5">
                {opp.match}% match
              </div>
            </div>
            <div className="text-right text-mini font-mono text-slate-700">
              <div>Candidate: <strong className="text-indigo-950 font-bold">{userProfile.name}</strong></div>
              <div>ATS Benchmark: {opp.type}</div>
            </div>
          </div>

          {/* 1. Verified Matched Skills */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <h4 className="text-mini font-mono uppercase text-teal-900 font-bold tracking-wider">
                Verified Tech Stack ({matchedSkills.length})
              </h4>
            </div>
            {matchedSkills.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {matchedSkills.map((s) => (
                  <span
                    key={s}
                    className="px-2.5 py-1 rounded-btn text-mini font-mono border border-emerald-300 bg-emerald-500/10 text-emerald-950 flex items-center gap-1.5 font-bold shadow-2xs"
                  >
                    <CheckIcon size={12} className="text-emerald-700" />
                    <span>{s} (Verified)</span>
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-[12px] font-mono text-slate-600">No verified skills matching this role yet.</p>
            )}
          </div>

          {/* 2. Unverified Skills in Profile */}
          {unverifiedSkills.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <h4 className="text-mini font-mono uppercase text-amber-900 font-bold tracking-wider">
                  Unverified Skills in Profile ({unverifiedSkills.length})
                </h4>
              </div>
              <div className="space-y-2">
                {unverifiedSkills.map(({ name: sName, skillItem }) => (
                  <div
                    key={sName}
                    className="p-3 rounded-btn bg-gradient-to-br from-amber-50 to-orange-100/80 border border-amber-300/60 flex items-center justify-between gap-3 shadow-2xs"
                  >
                    <div>
                      <div className="text-[13px] font-bold text-amber-950">{sName}</div>
                      <div className="text-mini font-mono text-amber-800 font-medium">
                        Present on resume, needs benchmark score &gt;70%
                      </div>
                    </div>
                    {skillItem ? (
                      <button
                        type="button"
                        onClick={() => handleLaunchQuiz(skillItem)}
                        className="h-9 px-3.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white rounded-btn text-mini font-mono font-bold flex items-center gap-1.5 flex-shrink-0 transition-all shadow-xs cursor-pointer"
                      >
                        <FlaskIcon size={13} className="text-white" />
                        <span>Take Quiz</span>
                      </button>
                    ) : (
                      <span className="text-mini font-mono text-slate-600 px-2 py-1 bg-teal-50 rounded border border-teal-200 flex-shrink-0">
                        No quiz yet
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. Missing Skills */}
          {missingSkills.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-slate-400" />
                <h4 className="text-mini font-mono uppercase text-teal-900 font-bold tracking-wider">
                  Missing Requirements ({missingSkills.length})
                </h4>
              </div>
              <div className="space-y-2">
                {missingSkills.map(({ name: sName, skillItem }) => (
                  <div
                    key={sName}
                    className="p-3 rounded-btn bg-white/90 border border-teal-200/80 flex items-center justify-between gap-3 shadow-2xs"
                  >
                    <div>
                      <div className="text-[13px] font-bold text-indigo-950">{sName}</div>
                      <div className="text-mini font-mono text-slate-600">
                        Required for top quartile ATS ranking
                      </div>
                    </div>
                    {skillItem ? (
                      <button
                        type="button"
                        onClick={() => handleLaunchQuiz(skillItem)}
                        className="h-9 px-3.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white text-mini font-mono font-bold rounded-btn flex items-center gap-1.5 flex-shrink-0 transition-all shadow-xs cursor-pointer"
                      >
                        <FlaskIcon size={13} className="text-white" />
                        <span>Verify & Add</span>
                      </button>
                    ) : (
                      <span className="text-mini font-mono text-slate-600 px-2 py-1 bg-teal-50 rounded border border-teal-200">
                        Required Skill
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-teal-200/60 bg-teal-50/70 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <span className="text-mini font-mono text-slate-600 font-medium">
            Verification directly upgrades radar match %
          </span>
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setSelectedOpportunityForGaps(null)}
              className="flex-1 sm:flex-none whitespace-nowrap h-10 px-4 bg-white/90 hover:bg-white border border-teal-300/80 text-teal-900 rounded-btn text-[13px] font-semibold transition-colors shadow-2xs cursor-pointer"
            >
              <span className="sm:hidden">Close</span>
              <span className="hidden sm:inline">Close Gap Analysis</span>
            </button>
            <button
              type="button"
              onClick={() => {
                const oppId = opp.id;
                setSelectedOpportunityForGaps(null);
                navigate(`/application-studio?id=${oppId}`);
              }}
              className="flex-1 sm:flex-none whitespace-nowrap h-10 px-5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white rounded-btn text-[13px] font-bold transition-all shadow-xs cursor-pointer"
            >
              Prepare &amp; Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

