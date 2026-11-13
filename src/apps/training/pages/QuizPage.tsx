import React, { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Award,
  CheckCircle2,
  ListChecks,
  RotateCcw,
  Send,
  XCircle,
} from 'lucide-react';
import { TrainingPermissions } from '../types';
import { useQuiz } from '../hooks/useQuiz';
import { QuizCard } from '../components/QuizCard';

interface QuizPageProps {
  permissions: TrainingPermissions;
  quizId: string;
  onBackToLesson: (lessonId: string) => void;
  onAttemptSaved: () => void;
}

export const QuizPage: React.FC<QuizPageProps> = ({
  permissions,
  quizId,
  onBackToLesson,
  onAttemptSaved,
}) => {
  const {
    quiz,
    questions,
    selectedAnswers,
    gradeResult,
    loading,
    submitting,
    error,
    selectOption,
    submitQuiz,
    resetQuiz,
  } = useQuiz(quizId, onAttemptSaved);

  const [displayMode, setDisplayMode] = useState<'all' | 'single'>('all');
  const [activeIndex, setActiveIndex] = useState<number>(0);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-24 rounded-2xl bg-slate-900/70 border border-slate-800 animate-pulse" />
        <div className="h-56 rounded-2xl bg-slate-900/70 border border-slate-800 animate-pulse" />
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="bg-[#0E1D2D] border border-red-500/30 rounded-2xl p-6 text-center space-y-3">
        <h2 className="text-lg font-bold text-white">Không tìm thấy Quiz</h2>
        <p className="text-xs sm:text-sm text-red-400">
          {error || 'Quiz không tồn tại hoặc yêu cầu đăng nhập để làm bài.'}
        </p>
      </div>
    );
  }

  const answeredCount = questions.filter(q => selectedAnswers[q.id] !== undefined).length;
  const resultMap = new Map(
    (gradeResult?.results ?? []).map(r => [r.question_id, r]),
  );

  const safeActiveIndex =
    questions.length > 0 ? Math.min(activeIndex, questions.length - 1) : 0;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => onBackToLesson(quiz.lesson_id)}
          className="inline-flex items-center gap-1.5 text-xs font-mono text-slate-400 hover:text-amber-400 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Quay lại bài học</span>
        </button>

        {/* Mode Switch: All questions vs 1 by 1 */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono">
          <button
            type="button"
            onClick={() => setDisplayMode('all')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              displayMode === 'all'
                ? 'bg-cyan-500/20 text-cyan-300 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Cả bài ({questions.length})
          </button>
          <button
            type="button"
            onClick={() => setDisplayMode('single')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              displayMode === 'single'
                ? 'bg-cyan-500/20 text-cyan-300 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Từng câu
          </button>
        </div>
      </div>

      {/* Quiz Header */}
      <div className="bg-[#0E1D2D] border border-slate-800 rounded-2xl p-6 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-slate-400">
          <span className="text-amber-400 font-semibold">Kiểm tra kiến thức</span>
          <span className="tabular-nums">
            Điểm đạt: {quiz.pass_score}% · Đã chọn: {answeredCount}/{questions.length}
          </span>
        </div>
        <h1 className="text-xl font-bold text-white">{quiz.title}</h1>
        {permissions.isGuest && (
          <p className="text-xs font-mono text-cyan-300">
            Chế độ Guest: hệ thống vẫn chấm điểm và hiện giải thích tại chỗ sau khi nộp, nhưng không lưu lịch sử điểm.
          </p>
        )}
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400">
          {error}
        </div>
      )}

      {/* Result Banner (only shown AFTER submission) */}
      {gradeResult && (
        <div
          className={`rounded-2xl p-6 border space-y-3 ${
            gradeResult.passed
              ? 'bg-emerald-500/10 border-emerald-500/40'
              : 'bg-amber-500/10 border-amber-500/40'
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                  gradeResult.passed
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-amber-500/20 text-amber-400'
                }`}
              >
                {gradeResult.passed ? (
                  <Award className="w-6 h-6" />
                ) : (
                  <XCircle className="w-6 h-6" />
                )}
              </div>
              <div>
                <div className="text-xs font-mono uppercase tracking-wider text-slate-300">
                  {gradeResult.passed ? 'Đạt yêu cầu' : 'Chưa đạt điểm chuẩn'}
                </div>
                <div className="text-2xl font-bold text-white font-mono tabular-nums">
                  {gradeResult.score}%{' '}
                  <span className="text-sm font-normal text-slate-300">
                    ({gradeResult.correct_count}/{gradeResult.total_questions} câu đúng · Chuẩn{' '}
                    {gradeResult.pass_score}%)
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                resetQuiz();
                setActiveIndex(0);
              }}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-white cursor-pointer shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Làm lại</span>
            </button>
          </div>

          <div className="text-xs font-mono text-slate-300 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
            <span>
              {gradeResult.saved
                ? 'Đã lưu kết quả làm bài vào hồ sơ cá nhân.'
                : 'Kết quả chấm trực tiếp trên phiên Guest (chưa lưu vào database).'}
            </span>
          </div>
        </div>
      )}

      {/* Questions Area */}
      {questions.length === 0 ? (
        <div className="bg-[#0E1D2D] border border-slate-800 rounded-2xl p-8 text-center text-sm text-slate-400">
          Quiz này chưa có câu hỏi nào.
        </div>
      ) : displayMode === 'all' || gradeResult ? (
        <div className="space-y-4">
          {questions.map((q, idx) => (
            <QuizCard
              key={q.id}
              index={idx}
              question={q}
              selectedOption={selectedAnswers[q.id]}
              result={resultMap.get(q.id)}
              disabled={submitting}
              onSelect={optIdx => selectOption(q.id, optIdx)}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          <QuizCard
            index={safeActiveIndex}
            question={questions[safeActiveIndex]}
            selectedOption={selectedAnswers[questions[safeActiveIndex].id]}
            result={resultMap.get(questions[safeActiveIndex].id)}
            disabled={submitting}
            onSelect={optIdx => selectOption(questions[safeActiveIndex].id, optIdx)}
          />

          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              disabled={safeActiveIndex === 0}
              onClick={() => setActiveIndex(i => Math.max(0, i - 1))}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300 hover:border-slate-600 disabled:opacity-40 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Câu trước</span>
            </button>

            <span className="text-xs font-mono text-slate-400 tabular-nums">
              Câu {safeActiveIndex + 1} / {questions.length}
            </span>

            <button
              type="button"
              disabled={safeActiveIndex >= questions.length - 1}
              onClick={() =>
                setActiveIndex(i => Math.min(questions.length - 1, i + 1))
              }
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300 hover:border-slate-600 disabled:opacity-40 cursor-pointer"
            >
              <span>Câu sau</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Submit Action */}
      {questions.length > 0 && !gradeResult && (
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <span className="text-xs font-mono text-slate-400 inline-flex items-center gap-1.5">
            <ListChecks className="w-4 h-4 text-cyan-400" />
            <span>Đã trả lời {answeredCount}/{questions.length} câu hỏi</span>
          </span>
          <button
            type="button"
            disabled={submitting || answeredCount === 0}
            onClick={submitQuiz}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs sm:text-sm transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
            <span>{submitting ? 'Đang chấm bài...' : 'Nộp bài & Chấm điểm'}</span>
          </button>
        </div>
      )}
    </div>
  );
};
