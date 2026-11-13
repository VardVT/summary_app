import React from 'react';
import { CheckCircle2, HelpCircle, XCircle } from 'lucide-react';
import { TrainingQuizQuestion, TrainingQuizQuestionResult } from '../types';

interface QuizCardProps {
  index: number;
  totalQuestions?: number;
  question: TrainingQuizQuestion;
  selectedOption: number | undefined;
  result?: TrainingQuizQuestionResult;
  disabled?: boolean;
  onSelect: (optionIndex: number) => void;
}

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

export const QuizCard: React.FC<QuizCardProps> = ({
  index,
  totalQuestions,
  question,
  selectedOption,
  result,
  disabled = false,
  onSelect,
}) => {
  const isGraded = Boolean(result);

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 space-y-4 shadow-[0_2px_10px_rgba(15,23,42,0.03)]">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1.5">
          <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#0284C7]">
            Câu hỏi {String(index + 1).padStart(2, '0')}
            {totalQuestions ? ` / ${String(totalQuestions).padStart(2, '0')}` : ''}
          </div>
          <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
            {question.question}
          </h3>
        </div>
        {isGraded && result && (
          <div
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-bold shrink-0 ${
              result.is_correct
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-red-50 text-red-600 border border-red-200'
            }`}
          >
            {result.is_correct ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Đúng</span>
              </>
            ) : (
              <>
                <XCircle className="w-3.5 h-3.5" />
                <span>Chưa đúng</span>
              </>
            )}
          </div>
        )}
      </div>

      <div className="space-y-2.5 pt-1">
        {question.options.map((opt, optIdx) => {
          const isSelected = selectedOption === optIdx;
          const isCorrectChoice = isGraded && result?.correct_index === optIdx;
          const isWrongSelected = isGraded && isSelected && !result?.is_correct;

          let containerStyle =
            'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/70 text-slate-700';
          if (isCorrectChoice) {
            containerStyle =
              'bg-emerald-50/80 border-2 border-emerald-500 text-emerald-950';
          } else if (isWrongSelected) {
            containerStyle = 'bg-red-50/80 border-2 border-red-400 text-red-900';
          } else if (isSelected) {
            containerStyle = 'bg-sky-50/80 border-2 border-[#0284C7] text-slate-900';
          }

          return (
            <button
              key={optIdx}
              type="button"
              disabled={disabled || isGraded}
              onClick={() => onSelect(optIdx)}
              className={`w-full text-left px-4 py-3.5 rounded-xl border transition-all flex items-center gap-3.5 min-h-[48px] ${containerStyle} ${
                disabled || isGraded ? 'cursor-default' : 'cursor-pointer'
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 border-2 transition-colors ${
                  isCorrectChoice
                    ? 'border-emerald-600 bg-emerald-600'
                    : isWrongSelected
                    ? 'border-red-500 bg-red-500'
                    : isSelected
                    ? 'border-[#0284C7] bg-[#0284C7]'
                    : 'border-slate-300 bg-white'
                }`}
              >
                {(isSelected || isCorrectChoice) && (
                  <span className="w-2 h-2 rounded-full bg-white" />
                )}
              </span>

              <span className="font-mono text-xs font-bold text-slate-500 shrink-0">
                {OPTION_LETTERS[optIdx] || optIdx + 1}.
              </span>

              <span className="text-xs sm:text-sm font-medium leading-snug flex-1">
                {opt}
              </span>

              {isCorrectChoice && (
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-semibold shrink-0">
                  Đáp án đúng
                </span>
              )}
            </button>
          );
        })}
      </div>

      {isGraded && result?.explanation && (
        <div className="p-4 rounded-xl bg-sky-50/70 border border-sky-200/80 text-xs sm:text-sm text-slate-700 flex items-start gap-2.5">
          <HelpCircle className="w-4 h-4 text-[#0284C7] shrink-0 mt-0.5" />
          <div>
            <span className="font-mono text-[11px] uppercase tracking-wider text-[#0284C7] font-bold block mb-0.5">
              Giải thích kỹ thuật
            </span>
            <p className="leading-relaxed">{result.explanation}</p>
          </div>
        </div>
      )}
    </div>
  );
};
