import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Award,
  Bookmark,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  ListChecks,
  RotateCcw,
  Send,
  XCircle,
} from 'lucide-react';
import {
  TrainingLesson,
  TrainingModule,
  TrainingPermissions,
  TrainingQuiz,
} from '../types';
import { useQuiz } from '../hooks/useQuiz';
import { QuizCard } from '../components/QuizCard';

interface QuizPageProps {
  permissions: TrainingPermissions;
  quizId: string;
  modules: TrainingModule[];
  lessons: TrainingLesson[];
  quizzes: TrainingQuiz[];
  onSelectQuiz: (quizId: string) => void;
  onBackToLesson: (lessonId: string) => void;
  onAttemptSaved: () => void;
}

export const QuizPage: React.FC<QuizPageProps> = ({
  permissions,
  quizId,
  modules,
  lessons,
  quizzes,
  onSelectQuiz,
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

  const [displayMode, setDisplayMode] = useState<'single' | 'all'>('single');
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [flaggedIds, setFlaggedIds] = useState<Set<string>>(() => new Set());

  const parentLesson = useMemo(
    () => (quiz ? lessons.find(l => l.id === quiz.lesson_id) ?? null : null),
    [quiz, lessons],
  );
  const parentModule = useMemo(
    () =>
      parentLesson
        ? modules.find(m => m.id === parentLesson.module_id) ?? null
        : null,
    [parentLesson, modules],
  );

  const toggleFlag = (questionId: string) => {
    setFlaggedIds(prev => {
      const next = new Set(prev);
      if (next.has(questionId)) next.delete(questionId);
      else next.add(questionId);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-28 rounded-2xl bg-white border border-slate-200 animate-pulse" />
        <div className="h-64 rounded-2xl bg-white border border-slate-200 animate-pulse" />
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="bg-white border border-red-200 rounded-2xl p-6 text-center space-y-3 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">Không tìm thấy Quiz</h2>
        <p className="text-xs sm:text-sm text-red-600">
          {error || 'Quiz không tồn tại hoặc yêu cầu đăng nhập để làm bài.'}
        </p>
      </div>
    );
  }

  const answeredCount = questions.filter(q => selectedAnswers[q.id] !== undefined).length;
  const progressPercent =
    questions.length > 0 ? Math.round((answeredCount / questions.length) * 100) : 0;

  const resultMap = new Map(
    (gradeResult?.results ?? []).map(r => [r.question_id, r]),
  );

  const safeActiveIndex =
    questions.length > 0 ? Math.min(activeIndex, questions.length - 1) : 0;
  const activeQuestion = questions[safeActiveIndex];

  return (
    <div className="space-y-5">
      {/* Top Quiz Switcher + Back */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => onBackToLesson(quiz.lesson_id)}
          className="inline-flex items-center gap-1.5 text-xs font-mono text-slate-500 hover:text-[#0284C7] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Quay lại bài học</span>
        </button>

        <div className="flex flex-wrap items-center gap-2">
          {quizzes.length > 1 && (
            <select
              value={quiz.id}
              onChange={e => {
                setActiveIndex(0);
                setFlaggedIds(new Set());
                onSelectQuiz(e.target.value);
              }}
              className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-medium text-slate-700 focus:outline-none focus:border-[#0284C7]"
            >
              {quizzes.map(q => (
                <option key={q.id} value={q.id}>
                  {q.title}
                </option>
              ))}
            </select>
          )}

          <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-white border border-slate-200 text-xs font-mono">
            <button
              type="button"
              onClick={() => setDisplayMode('single')}
              className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                displayMode === 'single'
                  ? 'bg-[#0284C7] text-white font-bold'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Từng câu
            </button>
            <button
              type="button"
              onClick={() => setDisplayMode('all')}
              className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                displayMode === 'all'
                  ? 'bg-[#0284C7] text-white font-bold'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Cả bài ({questions.length})
            </button>
          </div>
        </div>
      </div>

      {/* Quiz Header Card (Screen 2 Top Card) */}
      <section className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 space-y-4 shadow-[0_2px_10px_rgba(15,23,42,0.03)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="px-2.5 py-0.5 rounded-full bg-sky-50 border border-sky-200 text-[#0284C7] font-mono font-bold uppercase">
                {parentModule?.title || 'AVEVA MARINE'}
              </span>
              <span className="text-slate-500 font-medium">
                • Điểm đạt: {quiz.pass_score}%
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">
              {quiz.title}
            </h1>
            {parentLesson && (
              <p className="text-xs sm:text-sm text-slate-500">{parentLesson.title}</p>
            )}
          </div>

          <div className="flex items-center gap-4 shrink-0">
            <div className="text-right">
              <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">
                Tiến độ bài thi
              </div>
              <div className="text-xl font-extrabold font-mono text-[#0284C7] tabular-nums">
                {String(answeredCount).padStart(2, '0')}
                <span className="text-sm font-normal text-slate-400">
                  {' '}
                  / {String(questions.length).padStart(2, '0')} Câu
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#0284C7] rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </section>

      {error && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
          {error}
        </div>
      )}

      {/* Question Map Strip (Screen 2 "BẢN ĐỒ CÂU HỎI") */}
      {questions.length > 0 && (
        <section className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 space-y-3 shadow-[0_2px_10px_rgba(15,23,42,0.03)]">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-mono font-bold uppercase tracking-wider text-slate-500">
              Bản đồ câu hỏi
            </span>
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#0284C7]" />
                <span>Đã làm ({answeredCount})</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span>Xem lại ({flaggedIds.size})</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-slate-300" />
                <span>Chưa làm ({Math.max(0, questions.length - answeredCount)})</span>
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {questions.map((q, idx) => {
              const isCurrent = displayMode === 'single' && idx === safeActiveIndex;
              const isAnswered = selectedAnswers[q.id] !== undefined;
              const isFlagged = flaggedIds.has(q.id);
              const graded = resultMap.get(q.id);

              let btnClass =
                'bg-[#F8FAFC] border-slate-200 text-slate-500 hover:border-slate-300';
              let dotClass = 'bg-slate-300';

              if (graded) {
                btnClass = graded.is_correct
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                  : 'bg-red-50 border-red-300 text-red-700';
                dotClass = graded.is_correct ? 'bg-emerald-500' : 'bg-red-500';
              } else if (isCurrent) {
                btnClass = 'bg-[#0284C7] border-[#0284C7] text-white shadow-sm';
                dotClass = 'bg-white';
              } else if (isFlagged) {
                btnClass = 'bg-amber-50 border-amber-300 text-amber-800';
                dotClass = 'bg-amber-500';
              } else if (isAnswered) {
                btnClass = 'bg-sky-50 border-sky-200 text-[#0284C7]';
                dotClass = 'bg-[#0284C7]';
              }

              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => {
                    setDisplayMode('single');
                    setActiveIndex(idx);
                  }}
                  className={`min-w-[52px] px-3 py-2 rounded-xl border font-mono text-xs font-bold flex flex-col items-center gap-1 transition-all cursor-pointer ${btnClass}`}
                >
                  <span>{String(idx + 1).padStart(2, '0')}</span>
                  <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* 2-Column Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Question(s) */}
        <div className="lg:col-span-8 space-y-4">
          {questions.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-sm text-slate-500">
              Quiz này chưa có câu hỏi nào.
            </div>
          ) : displayMode === 'all' || gradeResult ? (
            <div className="space-y-4">
              {questions.map((q, idx) => (
                <QuizCard
                  key={q.id}
                  index={idx}
                  totalQuestions={questions.length}
                  question={q}
                  selectedOption={selectedAnswers[q.id]}
                  result={resultMap.get(q.id)}
                  disabled={submitting}
                  onSelect={optIdx => selectOption(q.id, optIdx)}
                />
              ))}
            </div>
          ) : (
            activeQuestion && (
              <div className="space-y-4">
                <QuizCard
                  index={safeActiveIndex}
                  totalQuestions={questions.length}
                  question={activeQuestion}
                  selectedOption={selectedAnswers[activeQuestion.id]}
                  result={resultMap.get(activeQuestion.id)}
                  disabled={submitting}
                  onSelect={optIdx => selectOption(activeQuestion.id, optIdx)}
                />

                {/* Bottom Action Footer */}
                <div className="bg-white border border-slate-200/90 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={safeActiveIndex === 0}
                      onClick={() => setActiveIndex(i => Math.max(0, i - 1))}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200/70 text-xs font-semibold text-slate-700 disabled:opacity-40 cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Câu trước</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleFlag(activeQuestion.id)}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs font-semibold cursor-pointer ${
                        flaggedIds.has(activeQuestion.id)
                          ? 'bg-amber-50 border-amber-300 text-amber-800'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <Bookmark className="w-3.5 h-3.5" />
                      <span>
                        {flaggedIds.has(activeQuestion.id) ? 'Đã đánh dấu' : 'Đánh dấu xem lại'}
                      </span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={safeActiveIndex >= questions.length - 1}
                      onClick={() =>
                        setActiveIndex(i => Math.min(questions.length - 1, i + 1))
                      }
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-50 hover:bg-sky-100 border border-sky-200 text-xs font-semibold text-[#0284C7] disabled:opacity-40 cursor-pointer"
                    >
                      <span>Câu tiếp theo</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      disabled={submitting || answeredCount === 0}
                      onClick={submitQuiz}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0F4C81] hover:bg-[#0B3C66] text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{submitting ? 'Đang chấm...' : 'Nộp bài sát hạch'}</span>
                    </button>
                  </div>
                </div>
              </div>
            )
          )}

          {displayMode === 'all' && questions.length > 0 && !gradeResult && (
            <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs font-mono text-slate-500 inline-flex items-center gap-1.5">
                <ListChecks className="w-4 h-4 text-[#0284C7]" />
                <span>
                  Đã trả lời {answeredCount}/{questions.length} câu hỏi
                </span>
              </span>
              <button
                type="button"
                disabled={submitting || answeredCount === 0}
                onClick={submitQuiz}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0F4C81] hover:bg-[#0B3C66] text-white font-bold text-xs cursor-pointer disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                <span>{submitting ? 'Đang chấm bài...' : 'Nộp bài sát hạch'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Right Sidebar: Result Card & Lesson Link */}
        <aside className="lg:col-span-4 space-y-5">
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 space-y-4 shadow-[0_2px_10px_rgba(15,23,42,0.03)]">
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="font-bold uppercase tracking-wider text-slate-500">
                {gradeResult ? 'Kết quả sát hạch' : 'Trạng thái làm bài'}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-sky-50 border border-sky-200 text-[#0284C7] font-semibold">
                {permissions.isGuest ? '• Guest Mode' : '• Server Grade'}
              </span>
            </div>

            {gradeResult ? (
              <div className="space-y-4">
                <div
                  className={`p-4 rounded-2xl border flex items-center gap-4 ${
                    gradeResult.passed
                      ? 'bg-emerald-50/70 border-emerald-200'
                      : 'bg-amber-50/70 border-amber-200'
                  }`}
                >
                  <div
                    className={`w-16 h-16 rounded-full border-4 flex flex-col items-center justify-center shrink-0 bg-white ${
                      gradeResult.passed ? 'border-emerald-500' : 'border-amber-500'
                    }`}
                  >
                    <span className="text-lg font-extrabold text-slate-900 font-mono leading-none">
                      {gradeResult.score}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">/100</span>
                  </div>

                  <div>
                    <div
                      className={`inline-flex items-center gap-1 text-sm font-bold ${
                        gradeResult.passed ? 'text-emerald-700' : 'text-amber-700'
                      }`}
                    >
                      {gradeResult.passed ? (
                        <>
                          <Award className="w-4 h-4" />
                          <span>Đạt Chuẩn</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-4 h-4" />
                          <span>Chưa đạt</span>
                        </>
                      )}
                    </div>
                    <div className="text-xs text-slate-600 mt-0.5">
                      Chuẩn đạt: {gradeResult.pass_score}% ({gradeResult.correct_count}/
                      {gradeResult.total_questions} câu đúng)
                    </div>
                  </div>
                </div>

                <div className="text-xs text-slate-500 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#0284C7] shrink-0" />
                  <span>
                    {gradeResult.saved
                      ? 'Đã lưu kết quả làm bài vào hồ sơ cá nhân.'
                      : 'Kết quả chấm trực tiếp cho Guest (không lưu vào database).'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    resetQuiz();
                    setActiveIndex(0);
                    setFlaggedIds(new Set());
                  }}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#0284C7] hover:bg-[#0369A1] text-white text-xs font-bold cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Làm lại bài thi</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-slate-200/80 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Số câu đã chọn</span>
                    <span className="font-mono font-bold text-slate-900">
                      {answeredCount} / {questions.length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Đánh dấu xem lại</span>
                    <span className="font-mono font-bold text-amber-600">
                      {flaggedIds.size} câu
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Điểm chuẩn đạt</span>
                    <span className="font-mono font-bold text-[#0284C7]">
                      {quiz.pass_score}%
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-500 leading-relaxed">
                  Đáp án đúng và giải thích kỹ thuật chỉ hiển thị sau khi bạn bấm{' '}
                  <strong className="text-slate-700">Nộp bài sát hạch</strong>.
                </p>
              </div>
            )}
          </div>

          {/* Back to Lesson Reference Card */}
          {parentLesson && (
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 space-y-3 shadow-[0_2px_10px_rgba(15,23,42,0.03)]">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                <BookOpen className="w-4 h-4 text-[#0284C7]" />
                <span>Tài liệu bài học liên quan</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                {parentLesson.title}
              </p>
              <button
                type="button"
                onClick={() => onBackToLesson(parentLesson.id)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 border border-slate-200 text-xs font-semibold text-slate-700 cursor-pointer"
              >
                Mở lại nội dung bài học
              </button>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};
