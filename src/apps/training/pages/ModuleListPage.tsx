import React, { useMemo, useState } from 'react';
import { BookOpen, ClipboardCheck, Globe, Lock, Search } from 'lucide-react';
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
        <div className="h-12 rounded-xl bg-slate-900/70 border border-slate-800 animate-pulse" />
        <div className="h-32 rounded-2xl bg-slate-900/70 border border-slate-800 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white">Danh sách Module</h2>
          <p className="text-xs font-mono text-slate-400 mt-0.5">
            {permissions.isGuest
              ? 'Chế độ Guest chỉ hiển thị module công khai Equipment Modeling'
              : `Tổng cộng ${modules.length} module đào tạo Piping Engineer`}
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Tìm module..."
            className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-[#0E1D2D] border border-slate-800 rounded-2xl p-8 text-center text-sm text-slate-400">
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

            return (
              <button
                key={mod.id}
                type="button"
                onClick={() => onOpenModule(mod.id)}
                className="w-full text-left bg-[#0E1D2D] border border-slate-800 hover:border-amber-400/60 rounded-2xl p-5 transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-4 cursor-pointer group"
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                    <span className="text-amber-400 font-semibold tabular-nums">
                      Module {String(idx + 1).padStart(2, '0')}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="inline-flex items-center gap-1">
                      {mod.is_public ? (
                        <>
                          <Globe className="w-3.5 h-3.5 text-cyan-400" />
                          <span className="text-cyan-400">Công khai (Public)</span>
                        </>
                      ) : (
                        <>
                          <Lock className="w-3.5 h-3.5 text-slate-400" />
                          <span>Nội bộ</span>
                        </>
                      )}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="inline-flex items-center gap-1 tabular-nums">
                      <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{modLessons.length} bài</span>
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="inline-flex items-center gap-1 tabular-nums">
                      <ClipboardCheck className="w-3.5 h-3.5 text-amber-400" />
                      <span>{quizCount} quiz</span>
                    </span>
                  </div>

                  <h3 className="text-base sm:text-lg font-bold text-white group-hover:text-amber-400 transition-colors">
                    {mod.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    {mod.description}
                  </p>
                </div>

                {!permissions.isGuest && (
                  <div className="w-full lg:w-56 shrink-0">
                    <ProgressBar
                      percent={percent}
                      label="Hoàn thành"
                      sublabel={`${done}/${modLessons.length}`}
                      accent={percent >= 100 ? 'emerald' : 'cyan'}
                    />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
