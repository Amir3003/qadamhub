import React from 'react';
import type { SkillItem } from '../data';
import { QUIZ_LENGTH, SECONDS_PER_QUESTION } from '../db/quizBank';
import { getCatalogTopic, getSkillCategory, shortTopic } from '../db/quizCatalog';
import { CheckIcon, ExternalLinkIcon, FlaskIcon, TechIcon } from './Icons';

// Cover art and the topics each verification quiz covers.
export const SKILL_META: Record<string, { cover: string; topics: string[] }> = {
  docker: {
    cover: 'from-sky-400/30 via-blue-300/20 to-cyan-200/30',
    topics: ['Multi-stage builds', 'Volumes', 'Compose', 'GPU containers'],
  },
  pytorch: {
    cover: 'from-orange-400/30 via-rose-300/20 to-amber-200/30',
    topics: ['Autograd', 'Training loop', 'DataLoader', 'Mixed precision'],
  },
  'vector-dbs': {
    cover: 'from-violet-400/30 via-fuchsia-300/20 to-indigo-200/30',
    topics: ['Embeddings', 'HNSW / ANN', 'Hybrid search', 'Reranking'],
  },
  python: {
    cover: 'from-blue-400/30 via-yellow-200/25 to-sky-200/30',
    topics: ['asyncio', 'Generators', 'Data model', 'Typing'],
  },
  llms: {
    cover: 'from-emerald-400/30 via-teal-300/20 to-cyan-200/30',
    topics: ['Prompting', 'RAG', 'Tool calling', 'Structured output'],
  },
  go: {
    cover: 'from-cyan-400/30 via-sky-300/20 to-teal-200/30',
    topics: ['Goroutines', 'Channels', 'context', 'Error handling'],
  },
  linux: {
    cover: 'from-amber-300/30 via-slate-300/20 to-yellow-200/30',
    topics: ['Permissions', 'Processes', 'systemd', 'cgroups'],
  },
  ros2: {
    cover: 'from-indigo-400/30 via-blue-300/20 to-slate-200/30',
    topics: ['Nodes & topics', 'Services & actions', 'tf2', 'Nav2'],
  },
  'machine-learning': {
    cover: 'from-teal-400/30 via-emerald-300/20 to-lime-200/30',
    topics: ['Overfitting', 'Metrics', 'Cross-validation', 'Regularization'],
  },
  research: {
    cover: 'from-rose-300/30 via-pink-200/20 to-violet-200/30',
    topics: ['Hypotheses', 'Ablations', 'Statistics', 'Reproducibility'],
  },
  sql: {
    cover: 'from-blue-400/30 via-indigo-300/20 to-sky-200/30',
    topics: ['Joins', 'Aggregation', 'Indexes', 'Window functions'],
  },
};

// Catalog topics get a cover by category and their first four subtopics as chips.
const CATEGORY_COVER: Record<string, string> = {
  'Programming Languages': 'from-blue-400/30 via-sky-300/20 to-indigo-200/30',
  'Databases & Data Storage': 'from-violet-400/30 via-indigo-300/20 to-sky-200/30',
  'Machine Learning & AI': 'from-emerald-400/30 via-teal-300/20 to-cyan-200/30',
  'Robotics & Hardware': 'from-indigo-400/30 via-blue-300/20 to-slate-200/30',
  'Web & Mobile Development': 'from-cyan-400/30 via-sky-300/20 to-teal-200/30',
  'Infrastructure & DevOps': 'from-sky-400/30 via-blue-300/20 to-cyan-200/30',
  Architecture: 'from-slate-400/30 via-indigo-200/25 to-sky-200/30',
  'Security & Blockchain': 'from-rose-300/30 via-violet-200/20 to-indigo-200/30',
  'CS Fundamentals & Math': 'from-amber-300/30 via-yellow-200/20 to-teal-200/30',
  'Professional, Design & Analytics': 'from-rose-300/30 via-pink-200/20 to-violet-200/30',
  'Languages & Language Exams': 'from-teal-300/30 via-emerald-200/20 to-amber-200/30',
};

export function getSkillMeta(skillId: string): { cover: string; topics: string[] } {
  if (SKILL_META[skillId]) return SKILL_META[skillId];
  const topic = getCatalogTopic(skillId);
  return {
    cover: CATEGORY_COVER[getSkillCategory(skillId)] || 'from-teal-300/30 via-sky-200/20 to-indigo-200/30',
    topics: topic ? topic.topics.slice(0, 4).map(shortTopic) : [],
  };
}

interface SkillCardProps {
  skill: SkillItem;
  isGap: boolean;
  isMatch: boolean;
  gapReason?: string;
  onStartQuiz: () => void;
}

export const SkillCard: React.FC<SkillCardProps> = ({ skill, isGap, isMatch, gapReason, onStartQuiz }) => {
  const meta = getSkillMeta(skill.id);
  const category = getSkillCategory(skill.id);
  const isVerified = skill.status === 'VERIFIED';
  const minutes = Math.round((QUIZ_LENGTH * SECONDS_PER_QUESTION) / 60);

  const statusLabel = isVerified ? `Verified${skill.score ? ` ${skill.score}%` : ''}` : skill.status === 'UNVERIFIED' ? 'In profile' : 'Not learned';

  return (
    <div
      className={`group rounded-card overflow-hidden bg-gradient-to-br from-[#EDF7F6]/95 via-[#F3F6FF]/95 to-[#E8F4F8]/95 backdrop-blur-xl border transition-all flex flex-col shadow-card hover:shadow-elevated hover:-translate-y-0.5 ${
        isGap ? 'border-amber-300/90' : isVerified ? 'border-emerald-300/80' : 'border-teal-300/40 hover:border-teal-400'
      }`}
    >
      {/* Cover */}
      <div className={`relative h-24 bg-gradient-to-br ${meta.cover} overflow-hidden`}>
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(15,23,42,0.18) 1px, transparent 0)',
            backgroundSize: '14px 14px',
          }}
          aria-hidden="true"
        />
        {/* Large faded mark in the corner */}
        <div className="absolute -right-4 -bottom-6 opacity-20 group-hover:opacity-30 transition-opacity" aria-hidden="true">
          <TechIcon name={skill.name} size={112} />
        </div>
        <div className="absolute left-4 top-1/2 -translate-y-1/2 w-14 h-14 rounded-xl bg-white/95 border border-white shadow-md flex items-center justify-center">
          <TechIcon name={skill.name} size={30} />
        </div>
        <div className="absolute right-3 top-3 flex flex-col items-end gap-1">
          <span
            className={`text-[12px] font-mono px-2 py-0.5 rounded border uppercase font-bold backdrop-blur-sm ${
              isVerified
                ? 'bg-emerald-100/95 text-emerald-800 border-emerald-300'
                : isGap
                ? 'bg-amber-100/95 text-amber-800 border-amber-300'
                : 'bg-white/90 text-teal-900 border-teal-200'
            }`}
          >
            {statusLabel}
          </span>
          {isGap && (
            <span className="text-[12px] font-mono uppercase px-1.5 py-0.5 rounded bg-amber-200/90 text-amber-900 font-bold">
              Needed for target
            </span>
          )}
          {isMatch && !isGap && (
            <span className="text-[12px] font-mono uppercase px-1.5 py-0.5 rounded bg-emerald-200/90 text-emerald-900 font-bold">
              Target match
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="p-4 flex-1 flex flex-col gap-3">
        <div>
          <div className="text-[12px] font-mono uppercase tracking-wider text-teal-800">{category}</div>
          <h4 className="text-[16px] font-bold text-indigo-950 break-words mt-0.5">{skill.name}</h4>
          <p className="text-[12px] text-teal-950 leading-relaxed mt-1 line-clamp-3">{isGap && gapReason ? gapReason : skill.reason}</p>
        </div>

        {meta.topics.length > 0 && (
          <div>
            <div className="text-[12px] font-mono uppercase tracking-wider text-teal-800 mb-1.5">Quiz covers</div>
            <div className="flex flex-wrap gap-1.5">
              {meta.topics.map((t) => (
                <span key={t} className="px-2 py-0.5 rounded-md text-[12px] font-mono bg-white/80 border border-teal-200/80 text-slate-700">
                  {t}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-1.5 text-center">
          {[
            [String(QUIZ_LENGTH), 'questions'],
            [`${minutes} min`, 'time limit'],
            ['70%', 'to pass'],
          ].map(([value, label]) => (
            <div key={label} className="py-1.5 rounded-md bg-white/70 border border-teal-200/60">
              <div className="text-[13px] font-mono font-bold text-indigo-950 leading-none">{value}</div>
              <div className="text-[12px] font-mono uppercase text-teal-800 mt-1">{label}</div>
            </div>
          ))}
        </div>

        <div className="mt-auto pt-3 border-t border-teal-200/60 space-y-2.5">
          <a
            href={skill.resourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-mini font-mono text-teal-800 hover:text-indigo-950 flex items-center justify-between font-medium"
          >
            <span className="truncate hover:underline">Study: {skill.resourceTitle}</span>
            <ExternalLinkIcon size={12} className="flex-shrink-0 ml-1.5" />
          </a>

          {!isVerified ? (
            <button
              type="button"
              onClick={onStartQuiz}
              className="w-full h-10 px-3 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white rounded-btn text-mini font-mono font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              <FlaskIcon size={14} className="text-white" />
              <span>Take Skill Quiz</span>
            </button>
          ) : (
            <div className="w-full h-10 px-3 bg-emerald-100 border border-emerald-300 text-emerald-800 rounded-btn text-mini font-mono font-bold flex items-center justify-center gap-1.5">
              <CheckIcon size={14} />
              <span>Verified in Profile</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SkillCard;
