import React from 'react';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  Globe,
  Lock,
  Sparkles,
} from 'lucide-react';
import {
  TrainingLesson,
  TrainingModule,
  TrainingPermissions,
  TrainingQuiz,
  TrainingQuizAttempt,
} from '../types';
import { ProgressBar } from '../components/ProgressBar';

interface HomePageProps {
  permissions: TrainingPermissions;
  modules: TrainingModule[];
  lessons: TrainingLesson[];
  quizzes: TrainingQuiz[];
  completedLessonIds: Set<string>;
  quizAttempts: TrainingQuizAttempt[];
  loading: boolean;
  onOpenModule: (moduleId: string) => void;
  onOpenLesson: (lessonId: string) => void;
  onOpenModules: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  permissions,
  modules,
  lessons,
  quizzes,
  completedLessonIds,
  quizAttempts,
  loading,
  onOpenModule,
  onOpenLesson,
  onOpenModules,
}) => {
  const totalLessons = lessons.length;
  const completedCount = lessons.filter(l => completedLessonIds.has(l.id)).length;
  const overallPercent = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  const passedQuizIds = new Set(
    quizAttempts
      .filter(a => {
        const q = quizzes.find(item => item.id === a.quiz_id);
        return q ? a.score >= q.pass_score : a.score >= 70;
      })
      .map(a => a.quiz_id),
  );

  const nextLesson = lessons.find(l => !completedLessonIds.has(l.id)) || lessons[0] || null;

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-32 rounded-2xl bg-slate-900/70 border border-slate-800 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-44 rounded-2xl bg-slate-900/70 border border-slate-800 animate-pulse" />
          <div className="h-44 rounded-2xl bg-slate-900/70 border border-slate-800 animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Banner / Personal Progress Card */}
      {permissions.isGuest ? (
        <div className="bg-[#0E1D2D] border border-slate-800 rounded-2xl p-6 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="text-xs font-mono text-cyan-400">
                Chế độ Guest · Xem module công khai
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-white mt-1">
                Chào mừng đến với Piping Academy
              </h2>
            </div>
            <span className="inline-flex items-center gap-1.5 text-xs font-mono text-amber-400">
              <Globe className="w-4 h-4" />
              <span>Public Access</span>
            </span>
          </div>
          <p className="text-sm text-slate-300 max-w-3xl leading-relaxed">
            Bạn đang truy cập với tư cách Guest (không có phiên đăng nhập nội bộ). Bạn có thể học toàn bộ module công khai{' '}
            <strong className="text-white">Equipment Modeling</strong> và làm quiz chấm điểm tại chỗ (kết quả không lưu vào hệ thống).
          </p>
        </div>
      ) : (
        <div className="bg-[#0E1D2D] border border-slate-800 rounded-2xl p-6 space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-xs font-mono text-amber-400">
                Tiến độ đào tạo cá nhân · AVEVA Marine & DSS / DNV / SOLAS
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-white">
                Lộ trình Piping Engineer
              </h2>
            </div>
            {nextLesson && (
              <button
                type="button"
                onClick={() => onOpenLesson(nextLesson.id)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs sm:text-sm transition-colors cursor-pointer shrink-0 whitespace-nowrap"
              >
                <span>{completedCount > 0 ? 'Học tiếp bài kế' : 'Bắt đầu học ngay'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>

          <ProgressBar
            percent={overallPercent}
            label="Tổng tiến độ hoàn thành bài học"
            sublabel={`${completedCount}/${totalLessons} bài`}
            accent={overallPercent >= 100 ? 'emerald' : 'cyan'}
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-800/80">
            <div>
              <div className="text-xs font-mono text-slate-400">Module khả dụng</div>
              <div className="text-xl font-bold text-white font-mono tabular-nums mt-0.5">
                {modules.length}
              </div>
            </div>
            <div>
              <div className="text-xs font-mono text-slate-400">Bài học đã hoàn thành</div>
              <div className="text-xl font-bold text-cyan-400 font-mono tabular-nums mt-0.5">
                {completedCount} / {totalLessons}
              </div>
            </div>
            <div>
              <div className="text-xs font-mono text-slate-400">Quiz đã đạt</div>
              <div className="text-xl font-bold text-emerald-400 font-mono tabular-nums mt-0.5">
                {passedQuizIds.size} / {quizzes.length}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Module Overview Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base sm:text-lg font-bold text-white">
            {permissions.isGuest ? 'Module công khai dành cho Guest' : 'Danh sách Module đào tạo'}
          </h3>
          <button
            type="button"
            onClick={onOpenModules}
            className="text-xs font-mono text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer"
          >
            Xem tất cả →
          </button>
        </div>

        {modules.length === 0 ? (
          <div className="bg-[#0E1D2D] border border-slate-800 rounded-2xl p-8 text-center text-sm text-slate-400">
            Chưa có module nào khả dụng. Vui lòng chạy migration seed hoặc liên hệ Lead/Admin.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {modules.map((mod, idx) => {
              const modLessons = lessons.filter(l => l.module_id === mod.id);
              const modLessonIds = new Set(modLessons.map(l => l.id));
              const modDone = modLessons.filter(l => completedLessonIds.has(l.id)).length;
              const modPercent =
                modLessons.length > 0 ? Math.round((modDone / modLessons.length) * 100) : 0;
              const modQuizzes = quizzes.filter(q => modLessonIds.has(q.lesson_id)).length;

              return (
                <button
                  key={mod.id}
                  type="button"
                  onClick={() => onOpenModule(mod.id)}
                  className="text-left bg-[#0E1D2D] border border-slate-800 hover:border-cyan-400/60 rounded-2xl p-5 transition-colors flex flex-col justify-between gap-4 cursor-pointer group"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2 text-xs font-mono text-slate-400">
                      <span className="text-amber-400 font-semibold tabular-nums">
                        Module {String(idx + 1).padStart(2, '0')}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        {mod.is_public ? (
                          <>
                            <Globe className="w-3.5 h-3.5 text-cyan-400" />
                            <span className="text-cyan-400">Public</span>
                          </>
                        ) : (
                          <>
                            <Lock className="w-3.5 h-3.5 text-slate-400" />
                            <span>Nội bộ</span>
                          </>
                        )}
                      </span>
                    </div>

                    <h4 className="text-base font-bold text-white group-hover:text-amber-400 transition-colors">
                      {mod.title}
                    </h4>

                    <p className="text-xs sm:text-sm text-slate-300 line-clamp-2 leading-relaxed">
                      {mod.description}
                    </p>
                  </div>

                  <div className="space-y-3 pt-3 border-t border-slate-800/80">
                    <div className="flex items-center gap-3 text-xs font-mono text-slate-400">
                      <span className="inline-flex items-center gap-1">
                        <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
                        <span className="tabular-nums">{modLessons.length} bài học</span>
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="inline-flex items-center gap-1">
                        <ClipboardCheck className="w-3.5 h-3.5 text-amber-400" />
                        <span className="tabular-nums">{modQuizzes} quiz</span>
                      </span>
                    </div>

                    {!permissions.isGuest && (
                      <ProgressBar
                        percent={modPercent}
                        sublabel={`${modDone}/${modLessons.length}`}
                        accent={modPercent >= 100 ? 'emerald' : 'cyan'}
                        size="sm"
                      />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {permissions.isGuest && (
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 flex items-center gap-3 text-xs text-slate-300">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            Các module nội bộ (Kiến thức nền DSS/DNV/SOLAS, Pipe Modeling, 2D Drawing, Hole & Report) và Thư viện tài liệu gốc sẽ hiển thị sau khi đăng nhập tài khoản kỹ sư VARD.
          </span>
        </div>
      )}
    </div>
  );
};
