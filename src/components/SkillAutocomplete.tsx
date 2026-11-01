import React, { useMemo, useRef, useState } from 'react';
import { SKILLS_DATABASE } from '../db/userProfile';
import { CloseIcon, PlusIcon, SearchIcon } from './Icons';

interface SkillAutocompleteProps {
  value: string[];
  onChange: (skills: string[]) => void;
  placeholder?: string;
  maxSuggestions?: number;
}

// Prefix matches rank first, then word-start matches, then plain substring matches.
function rankSkills(query: string, exclude: string[]): string[] {
  const q = query.trim().toLowerCase();
  const taken = new Set(exclude.map((s) => s.toLowerCase()));
  const pool = SKILLS_DATABASE.filter((s) => !taken.has(s.toLowerCase()));
  if (!q) return pool;

  const prefix: string[] = [];
  const wordStart: string[] = [];
  const contains: string[] = [];
  for (const skill of pool) {
    const s = skill.toLowerCase();
    if (s.startsWith(q)) prefix.push(skill);
    else if (s.split(/[\s./-]+/).some((w) => w.startsWith(q))) wordStart.push(skill);
    else if (s.includes(q)) contains.push(skill);
  }
  return [...prefix, ...wordStart, ...contains];
}

export const SkillAutocomplete: React.FC<SkillAutocompleteProps> = ({
  value,
  onChange,
  placeholder = 'Start typing a skill, e.g. "py" for Python, PyTorch...',
  maxSuggestions = 8,
}) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const suggestions = useMemo(
    () => rankSkills(query, value).slice(0, maxSuggestions),
    [query, value, maxSuggestions]
  );

  const trimmed = query.trim();
  const exactExists =
    SKILLS_DATABASE.some((s) => s.toLowerCase() === trimmed.toLowerCase()) ||
    value.some((s) => s.toLowerCase() === trimmed.toLowerCase());
  const canAddCustom = trimmed.length >= 2 && !exactExists;

  const addSkill = (skill: string) => {
    const clean = skill.trim();
    if (!clean || value.some((s) => s.toLowerCase() === clean.toLowerCase())) return;
    onChange([...value, clean]);
    setQuery('');
    setActiveIndex(0);
    inputRef.current?.focus();
  };

  const removeSkill = (skill: string) => onChange(value.filter((s) => s !== skill));

  const optionCount = suggestions.length + (canAddCustom ? 1 : 0);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIsOpen(true);
      setActiveIndex((i) => (optionCount ? (i + 1) % optionCount : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => (optionCount ? (i - 1 + optionCount) % optionCount : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex < suggestions.length && suggestions[activeIndex]) addSkill(suggestions[activeIndex]);
      else if (canAddCustom) addSkill(trimmed);
    } else if (e.key === 'Backspace' && !query && value.length > 0) {
      removeSkill(value[value.length - 1]);
    } else if (e.key === 'Escape') {
      // Close only the suggestion list, not the surrounding modal
      e.stopPropagation();
      setIsOpen(false);
    }
  };

  return (
    <div className="space-y-2.5">
      <div className="relative">
        <SearchIcon size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            setActiveIndex(0);
          }}
          onFocus={() => setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 120)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoCapitalize="none"
          autoCorrect="off"
          autoComplete="off"
          role="combobox"
          aria-expanded={isOpen}
          aria-autocomplete="list"
          className="w-full h-11 pl-10 pr-3.5 bg-white border border-teal-200/90 rounded-xl text-base md:text-[13px] text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none shadow-xs transition-colors"
        />

        {isOpen && optionCount > 0 && (
          <div
            role="listbox"
            className="animate-pop-in origin-top absolute left-0 right-0 top-full mt-1.5 z-50 max-h-60 overflow-y-auto overscroll-contain rounded-xl bg-white border border-teal-200 shadow-xl py-1"
          >
            {!trimmed && (
              <div className="px-3.5 pt-1.5 pb-1 text-[12px] font-mono uppercase tracking-wider text-teal-800">
                Popular skills
              </div>
            )}
            {suggestions.map((skill, i) => (
              <button
                key={skill}
                type="button"
                role="option"
                aria-selected={i === activeIndex}
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setActiveIndex(i)}
                onClick={() => addSkill(skill)}
                className={`w-full px-3.5 py-2 text-left text-[13px] font-mono flex items-center justify-between cursor-pointer transition-colors ${
                  i === activeIndex ? 'bg-emerald-50 text-emerald-900' : 'text-slate-700'
                }`}
              >
                <span>
                  {trimmed && skill.toLowerCase().startsWith(trimmed.toLowerCase()) ? (
                    <>
                      <strong className="text-emerald-700">{skill.slice(0, trimmed.length)}</strong>
                      {skill.slice(trimmed.length)}
                    </>
                  ) : (
                    skill
                  )}
                </span>
                <PlusIcon size={13} className="text-teal-600" />
              </button>
            ))}
            {canAddCustom && (
              <button
                type="button"
                role="option"
                aria-selected={activeIndex === suggestions.length}
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setActiveIndex(suggestions.length)}
                onClick={() => addSkill(trimmed)}
                className={`w-full px-3.5 py-2 text-left text-[12px] font-mono border-t border-teal-100 cursor-pointer ${
                  activeIndex === suggestions.length ? 'bg-emerald-50 text-emerald-900' : 'text-teal-800'
                }`}
              >
                Add custom skill "{trimmed}"
              </button>
            )}
          </div>
        )}
      </div>

      {value.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {value.map((skill) => (
            <span
              key={skill}
              className="inline-flex items-center gap-1.5 h-8 pl-3 pr-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-700 text-white text-[12px] font-mono font-semibold shadow-xs"
            >
              {skill}
              <button
                type="button"
                onClick={() => removeSkill(skill)}
                aria-label={`Remove ${skill}`}
                className="w-5 h-5 rounded-md flex items-center justify-center hover:bg-white/20 cursor-pointer"
              >
                <CloseIcon size={11} />
              </button>
            </span>
          ))}
        </div>
      ) : (
        <p className="text-[12px] font-mono text-teal-800">
          No skills added yet. Pick from suggestions or press Enter to add your own.
        </p>
      )}
    </div>
  );
};

export default SkillAutocomplete;
