import React from 'react';
import { CheckCircle2, XCircle, HelpCircle } from 'lucide-react';
import { TrainingQuizQuestion, TrainingQuizQuestionResult } from '../types';

interface QuizCardProps {
  index: number;
  question: TrainingQuizQuestion;
  selectedOption: number | undefined;
  result?: TrainingQuizQuestionResult;
  disabled?: boolean;
  onSelect: (optionIndex: number) => void;
}

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

export const QuizCard: React.FC<QuizCardProps> = ({
  index,
  question,
  selectedOption,
  result,
  disabled = false,
  onSelect,
}) => {
  const isGraded = Boolean(result);

  return (
    <div className="bg-[#0E1D2D] border border-slate-800 rounded-2xl p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <span className="text-xs font-mono text-amber-400 font-semibold">
            Câu {index + 1}
          </span>
          <h3 className="text-sm sm:text-base font-semibold text-white leading-snug">
            {question.question}
          </h3>
        </div>
        {isGraded && result && (
          <div
            className={`inline-flex items-center gap-1.5 text-xs font-mono font-bold shrink-0 ${
              result.is_correct ? 'text-emerald-400' : 'text-red-400'
            }`}
          >
            {result.is_correct ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Đúng</span>
              </>
            ) : (
              <>
                <XCircle className="w-4 h-4" />
                <span>Chưa đúng</span>
              </>
            )}
          </div>
        )}
      </div>

      <div className="space-y-2">
        {question.options.map((opt, optIdx) => {
          const isSelected = selectedOption === optIdx;
          const isCorrectChoice = isGraded && result?.correct_index === optIdx;
          const isWrongSelected = isGraded && isSelected && !result?.is_correct;

          let containerStyle =
            'bg-slate-900/70 border-slate-800 hover:border-slate-600 text-slate-200';
          if (isCorrectChoice) {
            containerStyle =
              'bg-emerald-500/15 border-emerald-500/60 text-emerald-200';
          } else if (isWrongSelected) {
            containerStyle = 'bg-red-500/15 border-red-500/60 text-red-200';
          } else if (isSelected) {
            containerStyle = 'bg-cyan-500/15 border-cyan-400 text-white';
          }

          return (
            <button
              key={optIdx}
              type="button"
              disabled={disabled || isGraded}
              onClick={() => onSelect(optIdx)}
              className={`w-full text-left p-3.5 rounded-xl border transition-colors flex items-center gap-3 min-h-[44px] ${containerStyle} ${
                disabled || isGraded ? 'cursor-default' : 'cursor-pointer'
              }`}
            >
              <span
                className={`w-7 h-7 rounded-lg font-mono text-xs font-bold flex items-center justify-center shrink-0 border ${
                  isCorrectChoice
                    ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                    : isWrongSelected
                    ? 'bg-red-500/20 border-red-400 text-red-300'
                    : isSelected
                    ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                    : 'bg-slate-950 border-slate-700 text-slate-400'
                }`}
              >
                {OPTION_LETTERS[optIdx] || optIdx + 1}
              </span>
              <span className="text-xs sm:text-sm leading-snug flex-1">{opt}</span>
              {isCorrectChoice && (
                <span className="text-[11px] font-mono text-emerald-400 font-semibold shrink-0">
                  Đáp án đúng
                </span>
              )}
            </button>
          );
        })}
      </div>

      {isGraded && result?.explanation && (
        <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs sm:text-sm text-slate-300 flex items-start gap-2.5">
          <HelpCircle className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-mono text-xs text-cyan-400 font-semibold block mb-0.5">
              Giải thích
            </span>
            <p className="leading-relaxed">{result.explanation}</p>
          </div>
        </div>
      )}
    </div>
  );
};
