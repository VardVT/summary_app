import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  Globe,
  Lock,
  Search,
  TrendingUp,
} from 'lucide-react';
import {
  TrainingLesson,
  TrainingModule,
  TrainingPermissions,
  TrainingQuiz,
} from '../types';
import { ProgressBar } from '../components/ProgressBar';

interface ModuleListPageProps {
  permissions: TrainingPermissions;
  modules: TrainingModule[];
  lessons: TrainingLesson[];
  quizzes: TrainingQuiz[];
  completedLessonIds: Set<string>;
  loading: boolean;
  onOpenModule: (moduleId: string) => void;
}

export const ModuleListPage: React.FC<ModuleListPageProps> = ({
  permissions,
  modules,
  lessons,
  quizzes,
  completedLessonIds,
  loading,
  onOpenModule,
}) => {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return modules;
    return modules.filter(
      m => m.title.toLowerCase().includes(q) || m.description.toLowerCase().includes(q),
    );
  }, [modules, query]);

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-14 rounded-2xl bg-white border border-slate-200 animate-pulse" />
        <div className="h-32 rounded-2xl bg-white border border-slate-200 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-[0_2px_10px_rgba(15,23,42,0.03)]">
        <div>
          <span className="text-[11px] font-mono uppercase tracking-wider text-[#0284C7] font-bold">
            Chương trình đào tạo Piping Engineer
          </span>
          <h1 className="text-xl font-bold text-slate-900 mt-0.5">Danh Sách Khóa Học & Module</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {permissions.isGuest
              ? 'Chế độ Guest chỉ hiển thị module công khai AVEVA 3D'
              : `Tổng cộng ${modules.length} module lộ trình AVEVA Marine & tiêu chuẩn DSS / DNV / SOLAS`}
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3.5 top-2.5 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Tìm module..."
            className="w-full pl-9 pr-3 py-2 bg-[#F8FAFC] border border-slate-200 rounded-xl text-xs font-mono text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#0284C7]"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-sm text-slate-500">
          Không tìm thấy module phù hợp.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((mod, idx) => {
            const modLessons = lessons.filter(l => l.module_id === mod.id);
            const modLessonIds = new Set(modLessons.map(l => l.id));
            const done = modLessons.filter(l => completedLessonIds.has(l.id)).length;
            const percent =
              modLessons.length > 0 ? Math.round((done / modLessons.length) * 100) : 0;
            const quizCount = quizzes.filter(q => modLessonIds.has(q.lesson_id)).length;
            const isCompleted = !permissions.isGuest && modLessons.length > 0 && percent === 100;

            return (
              <div
                key={mod.id}
                className="bg-white border border-slate-200/90 hover:border-[#0284C7]/60 rounded-2xl p-5 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-[0_2px_8px_rgba(15,23,42,0.02)]"
              >
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${
                      isCompleted
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                        : mod.is_public
                        ? 'bg-amber-50 border-amber-200 text-amber-600'
                        : 'bg-sky-50 border-sky-200 text-[#0284C7]'
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : mod.is_public ? (
                      <Globe className="w-5 h-5" />
                    ) : (
                      <TrendingUp className="w-5 h-5" />
                    )}
                  </div>

                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-slate-500">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold tabular-nums">
                        MOD {String(idx + 1).padStart(2, '0')}
                      </span>
                      {mod.is_public ? (
                        <span className="inline-flex items-center gap-1 text-amber-600 font-semibold">
                          <Globe className="w-3.5 h-3.5" />
                          <span>Công khai (Guest)</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-slate-500">
                          <Lock className="w-3.5 h-3.5" />
                          <span>Nội bộ</span>
                        </span>
                      )}
                      <span aria-hidden="true">·</span>
                      <span className="inline-flex items-center gap-1 tabular-nums">
                        <BookOpen className="w-3.5 h-3.5 text-[#0284C7]" />
                        <span>{modLessons.length} bài</span>
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="inline-flex items-center gap-1 tabular-nums">
                        <ClipboardCheck className="w-3.5 h-3.5 text-amber-500" />
                        <span>{quizCount} quiz</span>
                      </span>
                    </div>

                    <h2 className="text-base sm:text-lg font-bold text-slate-900">
                      {mod.title}
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                      {mod.description}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row lg:flex-col items-stretch sm:items-center lg:items-end gap-3 shrink-0 lg:w-56">
                  {!permissions.isGuest && (
                    <ProgressBar
                      percent={percent}
                      label="Hoàn thành"
                      sublabel={`${done}/${modLessons.length}`}
                      accent={percent >= 100 ? 'emerald' : 'cyan'}
                      size="sm"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => onOpenModule(mod.id)}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-[#0284C7] hover:bg-[#0369A1] text-white text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <span>Mở module</span>
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
