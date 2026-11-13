import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw, Search, Users } from 'lucide-react';
import {
  TrainingLearner,
  TrainingLesson,
  TrainingLessonProgress,
  TrainingModule,
  TrainingPermissions,
  TrainingQuiz,
  TrainingQuizAttempt,
} from '../types';
import {
  fetchAllLessonProgress,
  fetchAllQuizAttempts,
  fetchLearners,
} from '../services/trainingApi';
import { RoleGate } from '../components/RoleGate';
import { ProgressBar } from '../components/ProgressBar';

interface ProgressPageProps {
  permissions: TrainingPermissions;
  modules: TrainingModule[];
  lessons: TrainingLesson[];
  quizzes: TrainingQuiz[];
  onBackHome: () => void;
}

export const ProgressPage: React.FC<ProgressPageProps> = ({
  permissions,
  modules,
  lessons,
  quizzes,
  onBackHome,
}) => {
  const [learners, setLearners] = useState<TrainingLearner[]>([]);
  const [lessonProgress, setLessonProgress] = useState<TrainingLessonProgress[]>([]);
  const [quizAttempts, setQuizAttempts] = useState<TrainingQuizAttempt[]>([]);
  const [selectedModuleId, setSelectedModuleId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadProgressBoard = useCallback(async () => {
    if (!permissions.canViewAllProgress) return;
    setLoading(true);
    setError(null);
    try {
      const [learnerList, progList, attemptList] = await Promise.all([
        fetchLearners(),
        fetchAllLessonProgress(),
        fetchAllQuizAttempts(),
      ]);
      setLearners(learnerList);
      setLessonProgress(progList);
      setQuizAttempts(attemptList);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Không thể tải bảng tiến độ nhóm.',
      );
    } finally {
      setLoading(false);
    }
  }, [permissions.canViewAllProgress]);

  useEffect(() => {
    loadProgressBoard();
  }, [loadProgressBoard]);

  const scopedLessons = useMemo(
    () =>
      selectedModuleId === 'all'
        ? lessons
        : lessons.filter(l => l.module_id === selectedModuleId),
    [lessons, selectedModuleId],
  );

  const scopedLessonIds = useMemo(
    () => new Set(scopedLessons.map(l => l.id)),
    [scopedLessons],
  );

  const scopedQuizIds = useMemo(
    () =>
      new Set(
        quizzes.filter(q => scopedLessonIds.has(q.lesson_id)).map(q => q.id),
      ),
    [quizzes, scopedLessonIds],
  );

  const filteredLearners = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return learners.filter(learner => {
      if (!q) return true;
      return (
        learner.display_name.toLowerCase().includes(q) ||
        learner.email.toLowerCase().includes(q) ||
        learner.employee_id.toLowerCase().includes(q)
      );
    });
  }, [learners, searchQuery]);

  const rows = useMemo(() => {
    return filteredLearners.map(learner => {
      const userProg = lessonProgress.filter(
        p => p.user_id === learner.id && scopedLessonIds.has(p.lesson_id),
      );
      const completedCount = userProg.length;
      const totalCount = scopedLessons.length;
      const percent =
        totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

      const userAttempts = quizAttempts.filter(
        a => a.user_id === learner.id && scopedQuizIds.has(a.quiz_id),
      );
      const latestAttempt = userAttempts[0] ?? null;

      const timestamps: number[] = [
        ...userProg.map(p => Date.parse(p.completed_at)),
        ...userAttempts.map(a => Date.parse(a.created_at)),
      ].filter(ts => Number.isFinite(ts));

      const lastActiveAt =
        timestamps.length > 0
          ? new Date(Math.max(...timestamps)).toLocaleDateString('vi-VN')
          : 'Chưa hoạt động';

      return {
        learner,
        completedCount,
        totalCount,
        percent,
        latestAttempt,
        lastActiveAt,
      };
    });
  }, [
    filteredLearners,
    lessonProgress,
    quizAttempts,
    scopedLessonIds,
    scopedLessons.length,
    scopedQuizIds,
  ]);

  const avgCompletion =
    rows.length > 0
      ? Math.round(rows.reduce((sum, r) => sum + r.percent, 0) / rows.length)
      : 0;

  return (
    <RoleGate permissions={permissions} require="progress" onBack={onBackHome}>
      <div className="space-y-5">
        {/* Header & Filters */}
        <div className="bg-[#0E1D2D] border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs font-mono text-amber-400">
                Lead & Admin · Theo dõi đào tạo nhóm
              </span>
              <h1 className="text-xl font-bold text-white mt-0.5 flex items-center gap-2">
                <Users className="w-5 h-5 text-cyan-400" />
                <span>Bảng tiến độ học viên</span>
              </h1>
            </div>
            <button
              type="button"
              onClick={loadProgressBoard}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-mono text-slate-200 cursor-pointer shrink-0 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Làm mới</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Tìm học viên theo tên, email hoặc mã nhân viên..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400/60"
              />
            </div>

            <select
              value={selectedModuleId}
              onChange={e => setSelectedModuleId(e.target.value)}
              className="px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-cyan-400/60"
            >
              <option value="all">Tất cả module ({lessons.length} bài)</option>
              {modules.map(m => (
                <option key={m.id} value={m.id}>
                  {m.title}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-slate-800/80">
            <div>
              <div className="text-xs font-mono text-slate-400">Học viên</div>
              <div className="text-xl font-bold text-white font-mono tabular-nums">
                {rows.length}
              </div>
            </div>
            <div>
              <div className="text-xs font-mono text-slate-400">Hoàn thành trung bình</div>
              <div className="text-xl font-bold text-cyan-400 font-mono tabular-nums">
                {avgCompletion}%
              </div>
            </div>
            <div>
              <div className="text-xs font-mono text-slate-400">Bài học trong bộ lọc</div>
              <div className="text-xl font-bold text-amber-400 font-mono tabular-nums">
                {scopedLessons.length} bài · {scopedQuizIds.size} quiz
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400">
            {error}
          </div>
        )}

        {/* Progress Table */}
        <div className="bg-[#0E1D2D] border border-slate-800 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/60 text-[11px] font-mono uppercase tracking-wider text-slate-400">
                  <th className="py-3.5 px-4">Học viên</th>
                  <th className="py-3.5 px-4">Vai trò</th>
                  <th className="py-3.5 px-4 min-w-[200px]">% Hoàn thành</th>
                  <th className="py-3.5 px-4">Điểm Quiz gần nhất</th>
                  <th className="py-3.5 px-4">Hoạt động gần nhất</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70 text-sm">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-xs font-mono text-slate-400">
                      Đang tải dữ liệu tiến độ...
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-xs text-slate-400">
                      Không có học viên nào khớp bộ lọc.
                    </td>
                  </tr>
                ) : (
                  rows.map(row => (
                    <tr key={row.learner.id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-white">
                          {row.learner.display_name || row.learner.email}
                        </div>
                        <div className="text-xs font-mono text-slate-400">
                          {row.learner.employee_id ? `${row.learner.employee_id} · ` : ''}
                          {row.learner.email}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="text-xs font-mono uppercase px-2 py-0.5 rounded-md bg-slate-900 border border-slate-700 text-slate-300">
                          {row.learner.role}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <ProgressBar
                          percent={row.percent}
                          sublabel={`${row.completedCount}/${row.totalCount}`}
                          accent={row.percent >= 100 ? 'emerald' : 'cyan'}
                          size="sm"
                        />
                      </td>
                      <td className="py-3.5 px-4 font-mono tabular-nums">
                        {row.latestAttempt ? (
                          <span
                            className={
                              row.latestAttempt.score >= 70
                                ? 'text-emerald-400 font-bold'
                                : 'text-amber-400 font-bold'
                            }
                          >
                            {row.latestAttempt.score}%
                          </span>
                        ) : (
                          <span className="text-slate-500">--</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-xs font-mono text-slate-300 tabular-nums">
                        {row.lastActiveAt}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </RoleGate>
  );
};
