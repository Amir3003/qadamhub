import React, { useState } from 'react';
import type { MemoryEntry } from '../data';
import { ChevronDownIcon, PlusIcon, AlertTriangleIcon, CheckIcon } from './Icons';

const GUIDE_STORAGE_KEY = 'qadam_memory_guide_open';

const CATEGORIES: {
  id: MemoryEntry['category'];
  title: string;
  what: string;
  color: string;
  examples: string[];
}[] = [
  {
    id: 'PREFERENCES',
    title: 'Preferences',
    what: 'What you like. Used to rank and prioritize.',
    color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    examples: ['Prefer remote or virtual hackathons', 'Prioritize fully funded scholarships over partial ones'],
  },
  {
    id: 'CONSTRAINTS',
    title: 'Constraints',
    what: 'Hard limits. Opportunities that break them are not a fit.',
    color: 'text-amber-700 bg-amber-50 border-amber-200',
    examples: ['I can travel only in July and August', 'No programs with an application fee'],
  },
  {
    id: 'SKILLS',
    title: 'Skills',
    what: 'Context about your level that the profile cannot express.',
    color: 'text-sky-700 bg-sky-50 border-sky-200',
    examples: ['Strong in Python, beginner in C++', 'Built two RAG projects with LangChain and pgvector'],
  },
  {
    id: 'GOALS',
    title: 'Goals',
    what: 'Where you are heading. Used to suggest next steps.',
    color: 'text-indigo-700 bg-indigo-50 border-indigo-200',
    examples: ['Get a summer ML internship in Europe in 2027', 'Win at least one global AI hackathon this year'],
  },
];

interface MemoryGuideProps {
  defaultOpen: boolean;
  onUseExample: (category: MemoryEntry['category'], text: string) => void;
}

export const MemoryGuide: React.FC<MemoryGuideProps> = ({ defaultOpen, onUseExample }) => {
  const [isOpen, setIsOpen] = useState(() => {
    try {
      const saved = localStorage.getItem(GUIDE_STORAGE_KEY);
      return saved === null ? defaultOpen : saved === '1';
    } catch {
      return defaultOpen;
    }
  });

  const toggle = () => {
    setIsOpen((open) => {
      try {
        localStorage.setItem(GUIDE_STORAGE_KEY, open ? '0' : '1');
      } catch {
        // Guide state simply resets next visit
      }
      return !open;
    });
  };

  return (
    <div className="rounded-card bg-gradient-to-br from-[#EDF7F6]/95 via-[#F3F6FF]/95 to-[#E8F4F8]/95 backdrop-blur-xl border border-teal-300/40 shadow-xs text-slate-900 overflow-hidden">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={isOpen}
        className="w-full px-4 sm:px-5 py-3.5 flex items-center justify-between gap-3 text-left cursor-pointer hover:bg-white/40 transition-colors"
      >
        <div>
          <div className="text-[15px] font-bold text-indigo-950">How Agent Memory works</div>
          <div className="text-[12px] text-teal-900 mt-0.5">
            What to write here, why it matters, and examples you can add in one click.
          </div>
        </div>
        <ChevronDownIcon size={16} className={`text-teal-700 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="px-4 sm:px-5 pb-5 space-y-5 border-t border-teal-200/60 pt-4">
          {/* 3 steps */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              ['1', 'What it is', 'A short list of standing instructions for the QADAM agent. Each entry is one rule, saved as MEMORY.md on this device only.'],
              ['2', 'Why use it', 'You stop repeating yourself. Your limits, preferences and goals stay attached to every recommendation and application you prepare.'],
              ['3', 'How to use it', 'Add a directive, pick its category and the opportunities or rules it affects, then hover a card to see what it shapes.'],
            ].map(([n, title, text]) => (
              <div key={n} className="p-3.5 rounded-btn bg-white/75 border border-teal-200/80">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-600 to-teal-700 text-white text-[12px] font-mono font-bold flex items-center justify-center">
                    {n}
                  </span>
                  <span className="text-[13px] font-bold text-indigo-950">{title}</span>
                </div>
                <p className="text-[12px] text-slate-600 leading-relaxed mt-2">{text}</p>
              </div>
            ))}
          </div>

          {/* Categories with examples */}
          <div>
            <div className="text-mini font-mono uppercase tracking-wider text-teal-800 font-semibold mb-2">
              Four kinds of directives
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {CATEGORIES.map((cat) => (
                <div key={cat.id} className="p-3.5 rounded-btn bg-white/75 border border-teal-200/80 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-[12px] font-mono uppercase font-bold px-2 py-0.5 rounded border ${cat.color}`}>
                      {cat.title}
                    </span>
                    <span className="text-[12px] text-slate-600">{cat.what}</span>
                  </div>
                  <div className="space-y-1.5">
                    {cat.examples.map((ex) => (
                      <button
                        key={ex}
                        type="button"
                        onClick={() => onUseExample(cat.id, ex)}
                        className="w-full px-2.5 py-2 rounded-md bg-slate-50 hover:bg-emerald-50 border border-slate-200/80 hover:border-emerald-300 text-left text-[12px] text-slate-800 flex items-center justify-between gap-2 cursor-pointer transition-colors"
                      >
                        <span>"{ex}"</span>
                        <span className="flex items-center gap-1 text-[12px] font-mono text-emerald-700 flex-shrink-0">
                          <PlusIcon size={11} />
                          Use
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Do and do not */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-btn bg-emerald-50/80 border border-emerald-200">
              <div className="flex items-center gap-1.5 text-[13px] font-bold text-emerald-900">
                <CheckIcon size={14} />
                Good directives
              </div>
              <ul className="mt-2 space-y-1 text-[12px] text-emerald-950 leading-relaxed list-disc pl-4">
                <li>One rule per directive, so you can edit or delete it separately.</li>
                <li>Specific and checkable: dates, countries, amounts, levels.</li>
                <li>Use clear words like only, never, prefer, at least.</li>
                <li>Update them when your plans change.</li>
              </ul>
            </div>
            <div className="p-3.5 rounded-btn bg-rose-50/80 border border-rose-200">
              <div className="flex items-center gap-1.5 text-[13px] font-bold text-rose-900">
                <AlertTriangleIcon size={14} />
                Do not write here
              </div>
              <ul className="mt-2 space-y-1 text-[12px] text-rose-950 leading-relaxed list-disc pl-4">
                <li>Passwords, national ID or passport numbers, bank details.</li>
                <li>Your full CV: paste it in Profile instead.</li>
                <li>Vague wishes like "find good stuff", which give the agent nothing to act on.</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MemoryGuide;
