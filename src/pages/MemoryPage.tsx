import { createPortal } from 'react-dom';
import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { PageHeader } from '../components/PageHeader';
import {
  EditIcon,
  TrashIcon,
  PlusIcon,
  CloseIcon,
  EyeIcon,
} from '../components/Icons';
import { MATRIX_TARGETS, MemoryEntry } from '../data';
import { MemoryGuide } from '../components/MemoryGuide';

export const MemoryPage: React.FC = () => {
  const {
    memoryEntries,
    activeHoveredMemoryId,
    setActiveHoveredMemoryId,
    deleteMemoryEntry,
    updateMemoryEntry,
    addMemoryEntry,
    getRawMemoryMarkdown,
  } = useApp();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isRawMdModalOpen, setIsRawMdModalOpen] = useState(false);

  // New entry form state
  const [newCategory, setNewCategory] = useState<MemoryEntry['category']>('PREFERENCES');
  const [newText, setNewText] = useState('');
  const [newSelectedTargets, setNewSelectedTargets] = useState<string[]>(['target-nebius']);

  const handleStartEdit = (entry: MemoryEntry) => {
    setEditingId(entry.id);
    setEditText(entry.text);
  };

  const handleSaveEdit = (id: string) => {
    if (editText.trim() !== '') {
      updateMemoryEntry(id, editText.trim());
    }
    setEditingId(null);
  };

  const handleCreateEntry = () => {
    if (newText.trim() === '') return;
    addMemoryEntry(newCategory, newText.trim(), newSelectedTargets);
    setNewText('');
    setIsAddModalOpen(false);
  };

  const handleUseExample = (category: MemoryEntry['category'], text: string) => {
    setNewCategory(category);
    setNewText(text);
    setIsAddModalOpen(true);
  };

  // Currently active memory entry
  const activeEntry = memoryEntries.find((m) => m.id === activeHoveredMemoryId) || memoryEntries[0];
  const activeTargetIds = new Set(activeEntry ? activeEntry.targets : []);

  // Coordinate calculations for SVG bezier curves
  const cardHeight = 128;
  const cardGap = 12;
  const totalMemoryCount = memoryEntries.length;
  const totalHeight = Math.max(totalMemoryCount * (cardHeight + cardGap) - cardGap, 500);

  const targetsCount = MATRIX_TARGETS.length; // 7 targets
  const targetItemHeight = 48;
  const targetSpacing = targetsCount > 1 ? (totalHeight - targetItemHeight) / (targetsCount - 1) : 0;

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-transparent relative z-10 text-slate-100">
      <PageHeader
        title="Agent Memory"
        subtitle={`local MEMORY.md · ${memoryEntries.length} directives · context flow matrix`}
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsRawMdModalOpen(true)}
              className="h-10 px-3.5 rounded-btn border border-teal-500/30 bg-slate-900/80 hover:bg-slate-800/80 text-teal-100 hover:text-white text-mini font-mono flex items-center gap-2 transition-colors shadow-xs cursor-pointer"
            >
              <EyeIcon size={14} className="text-emerald-400" />
              <span>Inspect MEMORY.md</span>
            </button>
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="h-10 px-4 rounded-btn bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white text-[13px] font-semibold flex items-center gap-2 transition-all shadow-xs cursor-pointer"
            >
              <PlusIcon size={14} />
              <span>Add Directive</span>
            </button>
          </div>
        }
      />

      <div className="p-4 sm:p-6 pb-28 lg:pb-8 space-y-4">
        {/* Instructions banner */}
        <div className="p-4 rounded-card bg-gradient-to-br from-[#EDF7F6]/95 via-[#F3F6FF]/95 to-[#E8F4F8]/95 backdrop-blur-xl border border-teal-300/40 shadow-xs flex items-center justify-between text-[13px] text-slate-900">
          <span className="font-mono text-teal-950">
            <strong className="text-indigo-950 font-bold">Context Flow Matrix</strong>:{' '}
            {memoryEntries.length > 0
              ? 'Hover a memory card to trace which opportunities and constraints it shapes in real-time.'
              : 'Zero active directives. Agent runs purely on local baseline constraints.'}
          </span>
          <span className="text-mini font-mono text-emerald-800 font-bold bg-emerald-100 px-2.5 py-0.5 rounded border border-emerald-300 hidden sm:inline-block">
            ● LOCAL PRIVACY SHIELD
          </span>
        </div>

        <MemoryGuide defaultOpen={memoryEntries.length === 0} onUseExample={handleUseExample} />

        {memoryEntries.length === 0 ? (
          <div className="p-10 rounded-card bg-gradient-to-br from-[#EDF7F6]/95 via-[#F3F6FF]/95 to-[#E8F4F8]/95 backdrop-blur-xl border border-teal-300/40 shadow-[0_16px_40px_-12px_rgba(6,182,212,0.18)] text-center space-y-4 my-8 max-w-xl mx-auto text-slate-900">
            <div className="w-12 h-12 rounded-full bg-emerald-100 border border-emerald-300 mx-auto flex items-center justify-center text-emerald-700">
              <EyeIcon size={20} />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-subheading text-indigo-950 font-bold">0 Directives in MEMORY.md</h3>
              <p className="text-[13px] text-teal-950 max-w-md mx-auto leading-relaxed">
                No directives yet. Start with one of the examples above, or write your own rule about what you want and what to avoid.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="h-10 px-5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-semibold rounded-btn text-[13px] inline-flex items-center gap-2 transition-all shadow-xs cursor-pointer"
            >
              <PlusIcon size={14} />
              <span>Add First Directive</span>
            </button>
          </div>
        ) : (
          /* Matrix Container */
          <div className="overflow-x-auto pb-6">
            <div
              className="min-w-[820px] flex items-start gap-0 relative"
              style={{ height: `${totalHeight}px` }}
            >
              {/* COLUMN 1: Memory Cards */}
              <div
                className="flex-1 space-y-3"
                style={{ minWidth: '380px' }}
              >
                {memoryEntries.map((entry) => {
                  const isHovered = entry.id === (activeHoveredMemoryId || memoryEntries[0]?.id);
                  const isEditing = editingId === entry.id;

                  let tagColor = 'text-teal-700';
                  if (entry.category === 'PREFERENCES') tagColor = 'text-emerald-700 font-bold';
                  if (entry.category === 'CONSTRAINTS') tagColor = 'text-amber-700 font-bold';
                  if (entry.category === 'SKILLS') tagColor = 'text-sky-700 font-bold';
                  if (entry.category === 'GOALS') tagColor = 'text-indigo-700 font-bold';

                  return (
                    <div
                      key={entry.id}
                      tabIndex={0}
                      onMouseEnter={() => setActiveHoveredMemoryId(entry.id)}
                      onFocus={() => setActiveHoveredMemoryId(entry.id)}
                      className={`
                        h-[128px] max-h-[128px] p-3.5 rounded-card border transition-all flex flex-col justify-between text-slate-900 cursor-pointer
                        ${
                          isHovered
                            ? 'bg-gradient-to-br from-[#EDF7F6] via-[#F3F6FF] to-[#E8F4F8] border-teal-400 shadow-md ring-1 ring-teal-400/50'
                            : 'bg-gradient-to-br from-[#EDF7F6]/90 via-[#F3F6FF]/90 to-[#E8F4F8]/90 border-teal-200/80 hover:border-teal-300'
                        }
                      `}
                    >
                      {/* Top Row: Category + Timestamp */}
                      <div className="flex items-center justify-between text-mini font-mono">
                        <span className={`tracking-wider ${tagColor}`}>
                          {entry.category}
                        </span>
                        <span className="text-teal-800 text-[12px] font-medium">{entry.timestamp}</span>
                      </div>

                      {/* Content text / In-place edit */}
                      <div className="my-1 flex-1">
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={editText}
                              onChange={(e) => setEditText(e.target.value)}
                              className="w-full h-8 px-2 bg-white border border-teal-300 rounded text-[13px] text-slate-900 focus:outline-none focus:border-emerald-600"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveEdit(entry.id);
                                if (e.key === 'Escape') setEditingId(null);
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveEdit(entry.id)}
                              className="h-8 px-3 bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded text-mini font-mono font-bold"
                            >
                              Save
                            </button>
                          </div>
                        ) : (
                          <p className="text-[14px] text-indigo-950 font-medium line-clamp-2 leading-relaxed">
                            {entry.text}
                          </p>
                        )}
                      </div>

                      {/* Bottom Action buttons */}
                      <div className="pt-2 border-t border-teal-200/60 flex items-center justify-between">
                        <div className="text-mini font-mono text-teal-800 font-medium">
                          {entry.targets.length} connected targets
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartEdit(entry);
                            }}
                            aria-label="Edit memory"
                            className="h-7 px-2.5 rounded-btn text-teal-800 hover:text-indigo-950 hover:bg-white flex items-center gap-1.5 text-mini font-mono transition-colors font-medium"
                          >
                            <EditIcon size={13} />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteMemoryEntry(entry.id);
                            }}
                            aria-label="Delete memory"
                            className="h-7 px-2.5 rounded-btn text-rose-600 hover:text-rose-700 hover:bg-rose-50 flex items-center gap-1.5 text-mini font-mono transition-colors font-medium"
                          >
                            <TrashIcon size={13} />
                            <span>Delete</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* COLUMN 2: Bezier SVG Curves */}
              <div className="w-[140px] flex-shrink-0 h-full relative pointer-events-none">
                <svg
                  width="140"
                  height={totalHeight}
                  viewBox={`0 0 140 ${totalHeight}`}
                  className="overflow-visible"
                >
                  {memoryEntries.map((mem, mIdx) => {
                    const yl = mIdx * (cardHeight + cardGap) + cardHeight / 2;
                    const isCurrent = mem.id === (activeHoveredMemoryId || memoryEntries[0]?.id);

                    return mem.targets.map((tId) => {
                      const targetIndex = MATRIX_TARGETS.findIndex((t) => t.id === tId);
                      if (targetIndex === -1) return null;
                      const yr = targetIndex * targetSpacing + targetItemHeight / 2;

                      const d = `M 0,${yl} C 70,${yl} 70,${yr} 140,${yr}`;

                      return (
                        <path
                          key={`${mem.id}-${tId}`}
                          d={d}
                          fill="none"
                          stroke={isCurrent ? '#10b981' : 'rgba(45, 212, 191, 0.25)'}
                          strokeWidth={isCurrent ? 2 : 1}
                          strokeOpacity={isCurrent ? 1 : 0.4}
                          className="transition-all duration-200"
                        />
                      );
                    });
                  })}
                </svg>
              </div>

              {/* COLUMN 3: Target Constraints & Opportunities */}
              <div
                className="w-[280px] flex-shrink-0 relative"
                style={{ height: `${totalHeight}px` }}
              >
                {MATRIX_TARGETS.map((target, idx) => {
                  const isConnected = activeTargetIds.has(target.id);
                  const topPos = idx * targetSpacing;

                  return (
                    <div
                      key={target.id}
                      style={{
                        position: 'absolute',
                        top: `${topPos}px`,
                        height: `${targetItemHeight}px`,
                        width: '100%',
                      }}
                      className={`
                        px-3.5 py-1.5 rounded-card border transition-all flex flex-col justify-center
                        ${
                          isConnected
                            ? 'border-emerald-400 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-white shadow-sm ring-1 ring-emerald-400/50'
                            : 'border-teal-500/20 bg-slate-900/60 text-teal-200/70'
                        }
                      `}
                    >
                      <div className="text-[12px] font-mono uppercase tracking-wider text-teal-400 font-semibold">
                        {target.type}
                      </div>
                      <div className="text-[12px] font-semibold truncate mt-0.5">
                        {target.label}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal: Add New Memory */}
      {isAddModalOpen && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-memory-title"
          className="animate-overlay-in fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md overflow-y-auto"
        >
          <div className="animate-modal-in w-full max-w-md max-h-[85vh] my-auto overflow-y-auto bg-gradient-to-br from-[#EDF7F6] via-[#F3F6FF] to-[#E8F4F8] border border-teal-300/60 rounded-card shadow-2xl p-5 space-y-4 text-slate-900">
            <div className="flex items-center justify-between pb-3 border-b border-teal-200/60 flex-shrink-0">
              <h3 id="add-memory-title" className="text-subheading text-indigo-950 font-bold">
                Add Entry to MEMORY.md
              </h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                aria-label="Close dialog"
                className="w-8 h-8 flex items-center justify-center text-teal-800 hover:text-slate-900 rounded-btn cursor-pointer"
              >
                <CloseIcon size={16} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-mini font-mono uppercase text-teal-900 mb-1.5 font-semibold">
                  Category
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as MemoryEntry['category'])}
                  className="w-full h-11 px-3 bg-white border border-teal-200 rounded-btn text-[13px] text-slate-900 focus:outline-none focus:border-emerald-600 font-mono transition-colors shadow-xs"
                >
                  <option value="PREFERENCES">PREFERENCES</option>
                  <option value="CONSTRAINTS">CONSTRAINTS</option>
                  <option value="SKILLS">SKILLS</option>
                  <option value="GOALS">GOALS</option>
                </select>
              </div>

              <div>
                <label className="block text-mini font-mono uppercase text-teal-900 mb-1.5 font-semibold">
                  Memory Directive
                </label>
                <textarea
                  value={newText}
                  onChange={(e) => setNewText(e.target.value)}
                  placeholder="Enter explicit agent directive, rule, or constraint..."
                  rows={3}
                  className="w-full p-3 bg-white border border-teal-200 rounded-btn text-[13px] text-slate-900 focus:outline-none focus:border-emerald-600 transition-colors shadow-xs"
                />
              </div>

              <div>
                <label className="block text-mini font-mono uppercase text-teal-900 mb-1.5 font-semibold">
                  Linked Opportunities & Constraints ({newSelectedTargets.length} selected)
                </label>
                <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-2.5 bg-white/70 rounded-btn border border-teal-200">
                  {MATRIX_TARGETS.map((t) => {
                    const isSelected = newSelectedTargets.includes(t.id);
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setNewSelectedTargets(newSelectedTargets.filter((id) => id !== t.id));
                          } else {
                            setNewSelectedTargets([...newSelectedTargets, t.id]);
                          }
                        }}
                        className={`px-3 py-1.5 rounded-btn text-mini font-mono transition-all flex items-center gap-1.5 border text-left cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-100 border-emerald-300 text-emerald-800 font-bold shadow-xs'
                            : 'bg-white border-teal-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-xs'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isSelected ? 'bg-emerald-600' : 'bg-slate-400'
                          }`}
                        />
                        <span>{t.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="h-10 px-4 rounded-btn border border-teal-200 bg-white hover:bg-slate-50 text-slate-700 text-[13px] font-medium transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateEntry}
                disabled={newText.trim() === ''}
                className="h-10 px-5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white rounded-btn text-[13px] font-bold disabled:opacity-50 transition-all shadow-xs cursor-pointer"
              >
                Save Entry
              </button>
            </div>
          </div>
        </div>
      , document.body)}

      {/* Modal: Raw MEMORY.md Inspector */}
      {isRawMdModalOpen && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="raw-md-title"
          className="animate-overlay-in fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md overflow-y-auto"
        >
          <div className="animate-modal-in w-full max-w-xl max-h-[85vh] my-auto overflow-y-auto bg-gradient-to-br from-[#EDF7F6] via-[#F3F6FF] to-[#E8F4F8] border border-teal-300/60 rounded-card shadow-2xl p-5 space-y-4 text-slate-900">
            <div className="flex items-center justify-between pb-3 border-b border-teal-200/60 flex-shrink-0">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-600 rotate-45 inline-block" />
                <h3 id="raw-md-title" className="text-subheading text-indigo-950 font-bold">
                  Local Filesystem: MEMORY.md
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsRawMdModalOpen(false)}
                aria-label="Close dialog"
                className="w-8 h-8 flex items-center justify-center text-teal-800 hover:text-slate-900 rounded-btn cursor-pointer"
              >
                <CloseIcon size={16} />
              </button>
            </div>

            <pre className="p-4 bg-slate-900 text-teal-100 rounded-btn border border-teal-500/30 text-[12px] font-mono leading-relaxed overflow-x-auto max-h-[60vh]">
              {getRawMemoryMarkdown()}
            </pre>

            <div className="flex items-center justify-between pt-2">
              <span className="text-mini font-mono text-teal-800">
                Format: GitHub Flavored Markdown with agent target comments
              </span>
              <button
                type="button"
                onClick={() => setIsRawMdModalOpen(false)}
                className="h-10 px-5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-semibold rounded-btn text-[13px] cursor-pointer transition-all shadow-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      , document.body)}
    </div>
  );
};

export default MemoryPage;
