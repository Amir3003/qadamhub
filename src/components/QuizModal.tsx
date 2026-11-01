import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import type { QuizQuestion } from '../data';
import { QUIZ_BANK, QUIZ_LENGTH, SECONDS_PER_QUESTION } from '../db/quizBank';
import { loadCatalogQuestions } from '../db/quizCatalog';
import { CloseIcon, CheckIcon, AlertTriangleIcon } from './Icons';

function shuffle<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Fresh attempt: a random draw from the pool, shuffled options with the correct index remapped.
async function loadPool(skillId: string, fallback: QuizQuestion[]): Promise<QuizQuestion[]> {
  if (QUIZ_BANK[skillId]?.length) return QUIZ_BANK[skillId];
  const catalog = await loadCatalogQuestions(skillId);
  return catalog.length ? catalog : fallback;
}

function buildAttempt(pool: QuizQuestion[]): QuizQuestion[] {
  return shuffle(pool)
    .slice(0, QUIZ_LENGTH)
    .map((q) => {
      const order = shuffle(q.options.map((_, i) => i));
      return {
        ...q,
        options: order.map((i) => q.options[i]),
        correctIndex: order.indexOf(q.correctIndex),
      };
    });
}

export const QuizModal: React.FC = () => {
  const { activeQuizSkill, closeSkillQuiz, verifySkill, userProfile } = useApp();

  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);
  const [answers, setAnswers] = useState<(boolean | null)[]>([]);
  const [isCompleted, setIsCompleted] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(0);
  const [hasSubmittedAnswer, setHasSubmittedAnswer] = useState(false);
  const [pool, setPool] = useState<QuizQuestion[] | null>(null);

  // Load the question pool once per opened skill; banks for catalog topics are fetched lazily.
  useEffect(() => {
    if (!activeQuizSkill) return;
    let cancelled = false;
    setPool(null);
    setQuestions([]);
    loadPool(activeQuizSkill.id, activeQuizSkill.quizQuestions)
      .then((p) => !cancelled && setPool(p))
      .catch(() => !cancelled && setPool([]));
    return () => {
      cancelled = true;
    };
  }, [activeQuizSkill]);

  const startAttempt = useCallback(() => {
    if (!pool) return;
    const qs = buildAttempt(pool);
    setQuestions(qs);
    setAnswers(qs.map(() => null));
    setCurrentQuestionIndex(0);
    setSelectedOptionIndex(null);
    setIsCompleted(false);
    setSecondsRemaining(qs.length * SECONDS_PER_QUESTION);
    setHasSubmittedAnswer(false);
  }, [pool]);

  useEffect(() => {
    startAttempt();
  }, [startAttempt]);

  // Timer countdown
  useEffect(() => {
    if (!activeQuizSkill || isCompleted || questions.length === 0) return;
    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setIsCompleted(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [activeQuizSkill, isCompleted, questions.length]);

  const totalQuestions = questions.length;
  const currentQ = questions[currentQuestionIndex];
  const correctAnswersCount = answers.filter((a) => a === true).length;
  const answeredCount = answers.filter((a) => a !== null).length;

  const handleConfirmAnswer = useCallback(() => {
    if (selectedOptionIndex === null || !currentQ || hasSubmittedAnswer) return;
    setHasSubmittedAnswer(true);
    setAnswers((prev) => {
      const next = [...prev];
      next[currentQuestionIndex] = selectedOptionIndex === currentQ.correctIndex;
      return next;
    });
  }, [selectedOptionIndex, currentQ, hasSubmittedAnswer, currentQuestionIndex]);

  const handleNextQuestion = useCallback(() => {
    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
      setSelectedOptionIndex(null);
      setHasSubmittedAnswer(false);
    } else {
      setIsCompleted(true);
    }
  }, [currentQuestionIndex, totalQuestions]);

  // Keyboard: 1 to 4 (or A to D) select, Enter submits / advances.
  // Escape and backdrop clicks never close the quiz; only the close button does.
  useEffect(() => {
    if (!activeQuizSkill) return;
    const onKey = (e: KeyboardEvent) => {
      if (isCompleted || !currentQ) return;
      const key = e.key.toLowerCase();
      const idx = ['1', '2', '3', '4'].indexOf(key) >= 0 ? Number(key) - 1 : ['a', 'b', 'c', 'd'].indexOf(key);
      if (idx >= 0 && idx < currentQ.options.length && !hasSubmittedAnswer) {
        setSelectedOptionIndex(idx);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (hasSubmittedAnswer) handleNextQuestion();
        else handleConfirmAnswer();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeQuizSkill, isCompleted, currentQ, hasSubmittedAnswer, handleConfirmAnswer, handleNextQuestion, closeSkillQuiz]);

  if (!activeQuizSkill) return null;

  if (totalQuestions === 0) {
    const failed = pool !== null;
    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${activeQuizSkill.name} quiz`}
        className="animate-overlay-in fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/50 backdrop-blur-md overflow-y-auto"
      >
        <div className="animate-modal-in w-full max-w-md bg-gradient-to-br from-[#EDF7F6] via-[#F3F6FF] to-[#E8F4F8] border border-teal-300/60 rounded-card shadow-2xl p-6 text-center space-y-3 text-slate-900">
          <div className="text-[15px] font-bold text-indigo-950">{activeQuizSkill.name} Verification</div>
          <p className="text-[13px] text-slate-600">
            {failed ? 'Questions for this quiz are not available yet. Please try again later.' : 'Loading questions...'}
          </p>
          <button
            type="button"
            onClick={closeSkillQuiz}
            className="h-10 px-5 rounded-btn border border-teal-300/80 bg-white/90 hover:bg-white text-teal-900 text-[13px] font-bold cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const progressPercent = (answeredCount / totalQuestions) * 100;
  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const finalScore = Math.round((correctAnswersCount / totalQuestions) * 100);
  const passed = finalScore >= 70;
  const neededToPass = Math.ceil(totalQuestions * 0.7);

  const handleApplyVerification = () => {
    verifySkill(activeQuizSkill.id, finalScore);
    closeSkillQuiz();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="quiz-modal-title"
      className="animate-overlay-in fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/50 backdrop-blur-md overflow-y-auto"
    >
      <div className="animate-modal-in w-full max-w-3xl max-h-[92vh] sm:min-h-[560px] my-auto bg-gradient-to-br from-[#EDF7F6] via-[#F3F6FF] to-[#E8F4F8] border border-teal-300/60 rounded-card shadow-2xl flex flex-col overflow-hidden text-slate-900">
        {/* Header Bar */}
        <div className="px-5 sm:px-7 py-4 border-b border-teal-200/60 flex items-center justify-between gap-3 bg-teal-50/70 flex-shrink-0">
          <div className="min-w-0">
            <div id="quiz-modal-title" className="text-[15px] font-bold text-indigo-950 truncate">{activeQuizSkill.name} Verification</div>
            <div className="text-mini font-mono uppercase tracking-wider text-teal-800 mt-0.5">
              {isCompleted ? 'Results' : `Question ${currentQuestionIndex + 1} of ${totalQuestions}`} · pass at {neededToPass}/{totalQuestions}
            </div>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="text-right font-mono">
              <div className={`text-[18px] font-bold leading-none ${secondsRemaining < 60 ? 'text-amber-700' : 'text-indigo-950'}`}>
                {formattedTime}
              </div>
              <div className="text-[12px] text-teal-800 mt-1">
                {correctAnswersCount}/{answeredCount} correct
              </div>
            </div>
            <button
              type="button"
              onClick={closeSkillQuiz}
              aria-label="Close quiz"
              className="w-9 h-9 flex items-center justify-center text-teal-800 hover:text-indigo-950 hover:bg-teal-100/60 rounded-btn cursor-pointer transition-colors"
            >
              <CloseIcon size={16} />
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-1 bg-teal-100/60 flex-shrink-0">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Question navigator */}
        {!isCompleted && (
          <div className="px-5 sm:px-7 pt-4 flex flex-wrap gap-1.5 flex-shrink-0" aria-hidden="true">
            {answers.map((a, i) => (
              <span
                key={i}
                className={`w-6 h-6 rounded-md text-[12px] font-mono font-bold flex items-center justify-center border ${
                  i === currentQuestionIndex
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-900'
                    : a === true
                    ? 'border-emerald-300 bg-emerald-100 text-emerald-800'
                    : a === false
                    ? 'border-rose-300 bg-rose-50 text-rose-700'
                    : 'border-teal-200 bg-white/80 text-teal-700'
                }`}
              >
                {i + 1}
              </span>
            ))}
          </div>
        )}

        {/* Content Body */}
        <div className="px-5 sm:px-7 py-5 flex-1 overflow-y-auto space-y-5">
          {!isCompleted && currentQ ? (
            <>
              <h3 id="quiz-modal-title" className="text-[19px] sm:text-[20px] font-bold text-indigo-950 leading-snug">
                {currentQ.question}
              </h3>

              <div className="space-y-2.5">
                {currentQ.options.map((option, idx) => {
                  const isSelected = selectedOptionIndex === idx;
                  const isCorrect = idx === currentQ.correctIndex;

                  let borderClass = 'border-teal-200/80 hover:border-teal-400 bg-white/90';
                  let textClass = 'text-slate-800';

                  if (hasSubmittedAnswer) {
                    if (isCorrect) {
                      borderClass = 'border-emerald-500 bg-emerald-50 shadow-2xs';
                      textClass = 'text-emerald-950 font-semibold';
                    } else if (isSelected) {
                      borderClass = 'border-rose-300 bg-rose-50';
                      textClass = 'text-rose-900';
                    }
                  } else if (isSelected) {
                    borderClass = 'border-teal-500 bg-emerald-50 shadow-2xs';
                    textClass = 'text-indigo-950 font-semibold';
                  }

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => !hasSubmittedAnswer && setSelectedOptionIndex(idx)}
                      disabled={hasSubmittedAnswer}
                      className={`w-full min-h-[56px] px-4 py-3 rounded-btn border text-left text-[14px] leading-snug flex items-center justify-between gap-3 transition-colors cursor-pointer ${borderClass} ${textClass}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-7 h-7 rounded-full border border-teal-200 flex items-center justify-center text-mini font-mono text-teal-800 font-bold flex-shrink-0 bg-teal-50">
                          {String.fromCharCode(65 + idx)}
                        </span>
                        <span>{option}</span>
                      </div>
                      {hasSubmittedAnswer && isCorrect && <CheckIcon size={16} className="text-emerald-600 flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>

              {hasSubmittedAnswer && (
                <div className="p-3.5 rounded-btn bg-white/90 border border-teal-200/80 text-[13px] text-slate-700 leading-relaxed shadow-2xs">
                  <div className={`font-bold mb-1 font-mono text-mini uppercase ${selectedOptionIndex === currentQ.correctIndex ? 'text-emerald-700' : 'text-rose-600'}`}>
                    {selectedOptionIndex === currentQ.correctIndex ? 'Correct' : 'Incorrect'}
                  </div>
                  {currentQ.explanation}
                </div>
              )}
            </>
          ) : (
            <div className="py-6 text-center space-y-4">
              <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full border mx-auto shadow-sm ${passed ? 'bg-gradient-to-br from-emerald-50 to-teal-100 border-emerald-300' : 'bg-gradient-to-br from-amber-50 to-orange-100 border-amber-300'}`}>
                {passed ? <CheckIcon size={28} className="text-emerald-700" /> : <AlertTriangleIcon size={28} className="text-amber-700" />}
              </div>

              <div>
                <h4 className="text-pageTitle text-indigo-950 font-bold">
                  {passed ? 'Skill Verification Successful' : 'Verification Incomplete'}
                </h4>
                <div className="text-[40px] font-mono font-black text-indigo-950 mt-1">{finalScore}%</div>
                <div className="text-mini font-mono text-teal-800">
                  {correctAnswersCount} of {totalQuestions} correct
                  {answeredCount < totalQuestions ? ` · ${totalQuestions - answeredCount} unanswered (time ran out)` : ''}
                </div>
                <p className="text-[14px] text-slate-600 max-w-md mx-auto mt-3 leading-relaxed">
                  {passed
                    ? `${userProfile.name || 'You'} passed the ${activeQuizSkill.name} check. The Verified badge will be added to your profile and CV.`
                    : `You need at least ${neededToPass} correct answers. Review "${activeQuizSkill.resourceTitle}" and try again; every attempt draws a new random set of questions.`}
                </p>
              </div>

              {passed && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-400/40 rounded-btn inline-block text-mini font-mono text-emerald-900 font-bold shadow-2xs">
                  VERIFIED SKILL BADGE ISSUED
                </div>
              )}

              <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={closeSkillQuiz}
                  className="h-11 px-5 rounded-btn border border-teal-300/80 bg-white/90 hover:bg-white text-teal-900 text-[13px] font-bold transition-colors shadow-2xs cursor-pointer"
                >
                  Close
                </button>
                {passed ? (
                  <button
                    type="button"
                    onClick={handleApplyVerification}
                    className="h-11 px-5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white rounded-btn text-[13px] font-bold font-mono transition-all shadow-xs cursor-pointer"
                  >
                    Apply & Update CV
                  </button>
                ) : (
                  <>
                    <a
                      href={activeQuizSkill.resourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="h-11 px-5 rounded-btn border border-teal-300/80 bg-white/90 hover:bg-white text-teal-900 text-[13px] font-bold transition-colors shadow-2xs flex items-center"
                    >
                      Study Material
                    </a>
                    <button
                      type="button"
                      onClick={startAttempt}
                      className="h-11 px-5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-btn text-[13px] font-bold transition-all shadow-xs cursor-pointer"
                    >
                      Retry Quiz
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer controls */}
        {!isCompleted && (
          <div className="px-5 sm:px-7 py-4 border-t border-teal-200/60 bg-white/60 flex items-center justify-between gap-3 flex-shrink-0">
            <span className="hidden sm:inline text-mini font-mono text-slate-600">
              Keys 1 to 4 select an answer, Enter confirms.
            </span>
            <span className="sm:hidden text-mini font-mono text-slate-600">Pass with 70% or more.</span>
            {!hasSubmittedAnswer ? (
              <button
                type="button"
                onClick={handleConfirmAnswer}
                disabled={selectedOptionIndex === null}
                className={`h-11 px-6 rounded-btn text-[13px] font-bold transition-all flex-shrink-0 border shadow-xs ${
                  selectedOptionIndex !== null
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 border-transparent text-white cursor-pointer'
                    : 'bg-white/60 border-teal-200/60 text-slate-400 opacity-60 cursor-not-allowed'
                }`}
              >
                Submit Answer
              </button>
            ) : (
              <button
                type="button"
                onClick={handleNextQuestion}
                className="h-11 px-6 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white rounded-btn text-[13px] font-bold transition-all flex-shrink-0 shadow-xs cursor-pointer"
              >
                {currentQuestionIndex < totalQuestions - 1 ? 'Next Question' : 'View Results'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
