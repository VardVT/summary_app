import React from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Circle,
  ClipboardCheck,
  Globe,
  Lock,
} from 'lucide-react';
import {
  TrainingLesson,
  TrainingModule,
  TrainingPermissions,
  TrainingQuiz,
  TrainingQuizAttempt,
} from '../types';
import { ProgressBar } from '../components/ProgressBar';

interface ModulePageProps {
  permissions: TrainingPermissions;
  module: TrainingModule | null;
  lessons: TrainingLesson[];
  quizzes: TrainingQuiz[];
  completedLessonIds: Set<string>;
  latestAttemptByQuizId: Map<string, TrainingQuizAttempt>;
  loading: boolean;
  onBack: () => void;
  onOpenLesson: (lessonId: string) => void;
  onOpenQuiz: (quizId: string) => void;
}

export const ModulePage: React.FC<ModulePageProps> = ({
  permissions,
  module,
  lessons,
  quizzes,
  completedLessonIds,
  latestAttemptByQuizId,
  loading,
  onBack,
  onOpenLesson,
  onOpenQuiz,
}) => {
  if (loading) {
    return (
      <div className="h-48 rounded-2xl bg-white border border-slate-200 animate-pulse" />
    );
  }

  if (!module) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-3 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">Không tìm thấy Module</h2>
        <p className="text-xs sm:text-sm text-slate-500">
          Module không tồn tại hoặc yêu cầu đăng nhập tài khoản nội bộ để xem.
        </p>
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2 rounded-xl bg-[#0284C7] hover:bg-[#0369A1] text-white text-xs font-semibold cursor-pointer"
        >
          Quay lại danh sách
        </button>
      </div>
    );
  }

  const completedCount = lessons.filter(l => completedLessonIds.has(l.id)).length;
  const percent = lessons.length > 0 ? Math.round((completedCount / lessons.length) * 100) : 0;

  return (
    <div className="space-y-5">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-xs font-mono text-slate-500 hover:text-[#0284C7] transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Danh sách Module</span>
      </button>

      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 space-y-4 shadow-[0_2px_10px_rgba(15,23,42,0.03)]">
        <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-slate-500">
          {module.is_public ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 font-semibold">
              <Globe className="w-3.5 h-3.5" />
              <span>Module Công khai (Public)</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-sky-50 border border-sky-200 text-[#0284C7] font-semibold">
              <Lock className="w-3.5 h-3.5" />
              <span>Module Nội bộ</span>
            </span>
          )}
          <span aria-hidden="true">·</span>
          <span className="tabular-nums">{lessons.length} bài học</span>
        </div>

        <h1 className="text-xl sm:text-2xl font-bold text-slate-900">{module.title}</h1>
        <p className="text-sm text-slate-600 leading-relaxed">{module.description}</p>

        {!permissions.isGuest && (
          <ProgressBar
            percent={percent}
            label="Tiến độ Module"
            sublabel={`${completedCount}/${lessons.length} bài`}
            accent={percent >= 100 ? 'emerald' : 'cyan'}
          />
        )}
      </div>

      {lessons.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-sm text-slate-500">
          Module này chưa có bài học nào.
        </div>
      ) : (
        <div className="space-y-3">
          {lessons.map((lesson, idx) => {
            const isDone = completedLessonIds.has(lesson.id);
            const lessonQuiz = quizzes.find(q => q.lesson_id === lesson.id);
            const attempt = lessonQuiz ? latestAttemptByQuizId.get(lessonQuiz.id) : undefined;

            return (
              <div
                key={lesson.id}
                className="bg-white border border-slate-200/90 hover:border-slate-300 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-[0_2px_8px_rgba(15,23,42,0.02)]"
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  <div className="mt-0.5 shrink-0">
                    {!permissions.isGuest && isDone ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    ) : (
                      <Circle className="w-5 h-5 text-slate-300" />
                    )}
                  </div>
                  <div className="min-w-0 space-y-1">
                    <div className="text-xs font-mono font-bold text-[#0284C7] tabular-nums">
                      Bài {String(idx + 1).padStart(2, '0')}
                    </div>
                    <h2 className="text-sm sm:text-base font-bold text-slate-900">
                      {lesson.title}
                    </h2>
                    <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-slate-500">
                      {lesson.video_url && <span>Có Video</span>}
                      {lesson.slides_url && <span>Có Slide</span>}
                      {lessonQuiz && (
                        <span className="text-amber-600 font-semibold">
                          Quiz: {lessonQuiz.title}
                          {attempt ? ` · Điểm gần nhất: ${attempt.score}%` : ''}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {lessonQuiz && (
                    <button
                      type="button"
                      onClick={() => onOpenQuiz(lessonQuiz.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 border border-slate-200 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
                    >
                      <ClipboardCheck className="w-3.5 h-3.5 text-[#0284C7]" />
                      <span>Làm quiz</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onOpenLesson(lesson.id)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0284C7] hover:bg-[#0369A1] text-white text-xs font-bold transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Vào học</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
