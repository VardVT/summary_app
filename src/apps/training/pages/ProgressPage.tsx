import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Award,
  Layers,
  RefreshCw,
  Search,
  TrendingUp,
  Users,
} from 'lucide-react';
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

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'NV';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
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
  const [statusFilter, setStatusFilter] = useState<'all' | 'passed' | 'watch' | 'support'>('all');
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

  const allRows = useMemo(() => {
    return learners.map(learner => {
      const userProg = lessonProgress.filter(
        p => p.user_id === learner.id && scopedLessonIds.has(p.lesson_id),
      );
      const completedSet = new Set(
        lessonProgress.filter(p => p.user_id === learner.id).map(p => p.lesson_id),
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

      const moduleBreakdown = modules.map((mod, idx) => {
        const modLessons = lessons.filter(l => l.module_id === mod.id);
        const modDone = modLessons.filter(l => completedSet.has(l.id)).length;
        const modPct =
          modLessons.length > 0 ? Math.round((modDone / modLessons.length) * 100) : 0;
        return {
          id: mod.id,
          shortLabel: `M${idx + 1}`,
          title: mod.title,
          percent: modPct,
        };
      });

      const statusKey: 'passed' | 'watch' | 'support' =
        latestAttempt && latestAttempt.score < 70
          ? 'support'
          : percent >= 75 && (!latestAttempt || latestAttempt.score >= 70)
          ? 'passed'
          : 'watch';

      return {
        learner,
        completedCount,
        totalCount,
        percent,
        latestAttempt,
        lastActiveAt,
        moduleBreakdown,
        statusKey,
      };
    });
  }, [
    learners,
    lessonProgress,
    quizAttempts,
    scopedLessonIds,
    scopedLessons.length,
    scopedQuizIds,
    modules,
    lessons,
  ]);

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allRows.filter(row => {
      if (statusFilter !== 'all' && row.statusKey !== statusFilter) return false;
      if (!q) return true;
      return (
        row.learner.display_name.toLowerCase().includes(q) ||
        row.learner.email.toLowerCase().includes(q) ||
        row.learner.employee_id.toLowerCase().includes(q)
      );
    });
  }, [allRows, searchQuery, statusFilter]);

  const avgCompletion =
    allRows.length > 0
      ? Math.round(allRows.reduce((sum, r) => sum + r.percent, 0) / allRows.length)
      : 0;

  const scoredRows = allRows.filter(r => r.latestAttempt !== null);
  const avgQuizScore =
    scoredRows.length > 0
      ? (
          scoredRows.reduce((sum, r) => sum + (r.latestAttempt?.score ?? 0), 0) /
          scoredRows.length
        ).toFixed(1)
      : '--';

  const scoreDistribution = useMemo(() => {
    const excellent = scoredRows.filter(r => (r.latestAttempt?.score ?? 0) >= 85).length;
    const good = scoredRows.filter(
      r => (r.latestAttempt?.score ?? 0) >= 70 && (r.latestAttempt?.score ?? 0) < 85,
    ).length;
    const needsSupport = scoredRows.filter(r => (r.latestAttempt?.score ?? 0) < 70).length;
    const ungraded = allRows.length - scoredRows.length;
    return { excellent, good, needsSupport, ungraded };
  }, [allRows.length, scoredRows]);

  const moduleAverages = useMemo(() => {
    return modules.map((mod, idx) => {
      const modLessons = lessons.filter(l => l.module_id === mod.id);
      if (modLessons.length === 0 || learners.length === 0) {
        return { id: mod.id, idx, title: mod.title, avgPct: 0 };
      }
      const modLessonIds = new Set(modLessons.map(l => l.id));
      const totalDone = lessonProgress.filter(p => modLessonIds.has(p.lesson_id)).length;
      const avgPct = Math.round((totalDone / (modLessons.length * learners.length)) * 100);
      return { id: mod.id, idx, title: mod.title, avgPct };
    });
  }, [modules, lessons, learners.length, lessonProgress]);

  const lowestModule = useMemo(() => {
    if (moduleAverages.length === 0) return null;
    return [...moduleAverages].sort((a, b) => a.avgPct - b.avgPct)[0];
  }, [moduleAverages]);

  return (
    <RoleGate permissions={permissions} require="progress" onBack={onBackHome}>
      <div className="space-y-6">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-[11px] font-mono uppercase tracking-wider text-[#0284C7] font-bold">
              Lead & Admin · Phân tích năng lực đào tạo
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Tiến Độ & Đánh Giá Đội Ngũ
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 max-w-2xl">
              Theo dõi tỷ lệ hoàn thành từng module, điểm quiz gần nhất và hoạt động học tập của toàn bộ kỹ sư trong hệ thống.
            </p>
          </div>

          <button
            type="button"
            onClick={loadProgressBoard}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 cursor-pointer shrink-0 shadow-xs disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#0284C7] ${loading ? 'animate-spin' : ''}`} />
            <span>Làm mới dữ liệu</span>
          </button>
        </div>

        {/* 4 KPI Summary Cards (Screen 4 Top Grid) */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 space-y-3 shadow-[0_2px_10px_rgba(15,23,42,0.03)]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Hoàn thành trung bình</span>
              <span className="w-8 h-8 rounded-xl bg-sky-50 text-[#0284C7] flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </span>
            </div>
            <div className="text-3xl font-extrabold text-slate-900 font-mono tabular-nums">
              {avgCompletion}%
            </div>
            <ProgressBar percent={avgCompletion} size="sm" />
          </div>

          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 space-y-2 shadow-[0_2px_10px_rgba(15,23,42,0.03)]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Điểm TB Quiz</span>
              <span className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Award className="w-4 h-4" />
              </span>
            </div>
            <div className="text-3xl font-extrabold text-slate-900 font-mono tabular-nums">
              {avgQuizScore}
              <span className="text-sm font-normal text-slate-400"> / 100</span>
            </div>
            <div className="text-xs text-slate-500">
              {scoredRows.length} học viên đã có điểm quiz
            </div>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 space-y-2 shadow-[0_2px_10px_rgba(15,23,42,0.03)]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Học viên trong hệ thống</span>
              <span className="w-8 h-8 rounded-xl bg-sky-50 text-[#0284C7] flex items-center justify-center">
                <Users className="w-4 h-4" />
              </span>
            </div>
            <div className="text-3xl font-extrabold text-slate-900 font-mono tabular-nums">
              {learners.length}
            </div>
            <div className="text-xs text-slate-500">
              Lọc hiện tại: {filteredRows.length} học viên
            </div>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 space-y-2 shadow-[0_2px_10px_rgba(15,23,42,0.03)]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Module tiến độ thấp nhất</span>
              <span className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <AlertCircle className="w-4 h-4" />
              </span>
            </div>
            <div className="text-base font-extrabold text-slate-900 truncate">
              {lowestModule ? lowestModule.title : '--'}
            </div>
            <div className="text-xs text-amber-700 font-medium">
              {lowestModule
                ? `Trung bình ${lowestModule.avgPct}% hoàn thành`
                : 'Chưa có dữ liệu'}
            </div>
          </div>
        </section>

        {/* Search & Filter Toolbar */}
        <section className="bg-white border border-slate-200/90 rounded-2xl p-3.5 flex flex-col sm:flex-row gap-3 shadow-[0_2px_10px_rgba(15,23,42,0.03)]">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Tìm theo tên kỹ sư, mã NV hoặc email..."
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#F8FAFC] border border-slate-200 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#0284C7]"
            />
          </div>

          <select
            value={selectedModuleId}
            onChange={e => setSelectedModuleId(e.target.value)}
            className="px-3.5 py-2 rounded-xl bg-[#F8FAFC] border border-slate-200 text-xs sm:text-sm text-slate-700 focus:outline-none focus:border-[#0284C7]"
          >
            <option value="all">Tất cả module ({lessons.length} bài)</option>
            {modules.map(m => (
              <option key={m.id} value={m.id}>
                {m.title}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={e =>
              setStatusFilter(e.target.value as 'all' | 'passed' | 'watch' | 'support')
            }
            className="px-3.5 py-2 rounded-xl bg-[#F8FAFC] border border-slate-200 text-xs sm:text-sm text-slate-700 focus:outline-none focus:border-[#0284C7]"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="passed">Đạt chuẩn</option>
            <option value="watch">Đang theo sát</option>
            <option value="support">Cần kèm thêm (Quiz &lt; 70%)</option>
          </select>
        </section>

        {error && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
            {error}
          </div>
        )}

        {/* 2-Column Progress Board */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left: Learner Cards */}
          <section className="lg:col-span-8 space-y-3.5">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">
                  Danh Sách Kỹ Sư & Module Lộ Trình
                </h2>
                <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-xs font-mono text-slate-600">
                  {filteredRows.length} hiển thị
                </span>
              </div>
            </div>

            {loading ? (
              <div className="space-y-3">
                <div className="h-32 rounded-2xl bg-white border border-slate-200 animate-pulse" />
                <div className="h-32 rounded-2xl bg-white border border-slate-200 animate-pulse" />
              </div>
            ) : filteredRows.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-sm text-slate-500">
                Không có học viên nào khớp bộ lọc hiện tại.
              </div>
            ) : (
              <div className="space-y-3.5">
                {filteredRows.map(row => {
                  const initials = getInitials(row.learner.display_name || row.learner.email);
                  const badgeStyle =
                    row.statusKey === 'passed'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                      : row.statusKey === 'support'
                      ? 'bg-amber-50 border-amber-200 text-amber-800'
                      : 'bg-sky-50 border-sky-200 text-[#0284C7]';
                  const badgeLabel =
                    row.statusKey === 'passed'
                      ? 'Đạt chuẩn'
                      : row.statusKey === 'support'
                      ? 'Cần kèm thêm'
                      : 'Đang theo sát';

                  return (
                    <div
                      key={row.learner.id}
                      className="bg-white border border-slate-200/90 rounded-2xl p-5 space-y-4 shadow-[0_2px_10px_rgba(15,23,42,0.03)]"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3.5">
                          <div className="w-11 h-11 rounded-xl bg-sky-50 border border-sky-200/80 flex items-center justify-center text-sm font-bold text-[#0284C7] shrink-0">
                            {initials}
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-sm sm:text-base font-bold text-slate-900">
                                {row.learner.display_name || row.learner.email}
                              </h3>
                              {row.learner.employee_id && (
                                <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-mono text-[11px] font-semibold">
                                  {row.learner.employee_id}
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-500 mt-0.5">
                              <span className="font-mono uppercase text-[#0284C7] font-semibold">
                                {row.learner.role}
                              </span>
                              <span aria-hidden="true"> · </span>
                              <span>Hoạt động: {row.lastActiveAt}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 sm:justify-end">
                          <div className="text-left sm:text-right">
                            <div className="text-[10px] font-mono uppercase text-slate-400">
                              Điểm Quiz gần nhất
                            </div>
                            <div
                              className={`text-sm font-extrabold font-mono tabular-nums ${
                                row.latestAttempt
                                  ? row.latestAttempt.score >= 70
                                    ? 'text-emerald-600'
                                    : 'text-amber-600'
                                  : 'text-slate-400'
                              }`}
                            >
                              {row.latestAttempt ? `${row.latestAttempt.score} / 100` : '--'}
                            </div>
                          </div>

                          <span
                            className={`px-2.5 py-1 rounded-full border text-[11px] font-semibold shrink-0 ${badgeStyle}`}
                          >
                            {badgeLabel}
                          </span>
                        </div>
                      </div>

                      <ProgressBar
                        percent={row.percent}
                        label={
                          selectedModuleId === 'all'
                            ? `Tiến độ ${modules.length} Module`
                            : 'Tiến độ module đang lọc'
                        }
                        sublabel={`${row.completedCount}/${row.totalCount} bài`}
                        accent={
                          row.statusKey === 'support'
                            ? 'amber'
                            : row.percent >= 100
                            ? 'emerald'
                            : 'cyan'
                        }
                        size="sm"
                      />

                      {/* Module breakdown chips */}
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                        {row.moduleBreakdown.map(mb => (
                          <div
                            key={mb.id}
                            title={mb.title}
                            className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-mono text-center truncate ${
                              mb.percent >= 100
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-700 font-bold'
                                : mb.percent > 0
                                ? 'bg-sky-50 border-sky-200 text-[#0284C7] font-semibold'
                                : 'bg-[#F8FAFC] border-slate-200/80 text-slate-500'
                            }`}
                          >
                            {mb.shortLabel}: {mb.percent}%
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Right Sidebar: Score Distribution + Module Averages */}
          <aside className="lg:col-span-4 space-y-5">
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 space-y-4 shadow-[0_2px_10px_rgba(15,23,42,0.03)]">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-900">Phổ Điểm Quiz Đội Ngũ</h2>
                <span className="text-xs font-mono text-slate-400">
                  {learners.length} kỹ sư
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <ProgressBar
                  percent={
                    learners.length > 0
                      ? (scoreDistribution.excellent / learners.length) * 100
                      : 0
                  }
                  label="Xuất sắc (≥ 85%)"
                  sublabel={`${scoreDistribution.excellent} người`}
                  accent="emerald"
                  size="sm"
                />
                <ProgressBar
                  percent={
                    learners.length > 0 ? (scoreDistribution.good / learners.length) * 100 : 0
                  }
                  label="Khá / Đạt (70 - 84%)"
                  sublabel={`${scoreDistribution.good} người`}
                  accent="cyan"
                  size="sm"
                />
                <ProgressBar
                  percent={
                    learners.length > 0
                      ? (scoreDistribution.needsSupport / learners.length) * 100
                      : 0
                  }
                  label="Cần kèm lại (< 70%)"
                  sublabel={`${scoreDistribution.needsSupport} người`}
                  accent="amber"
                  size="sm"
                />
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-slate-500">
                  <span>Chưa có điểm quiz</span>
                  <span className="font-mono font-bold text-slate-700">
                    {scoreDistribution.ungraded} người
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 space-y-3.5 shadow-[0_2px_10px_rgba(15,23,42,0.03)]">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <Layers className="w-4 h-4 text-[#0284C7]" />
                <span>Tỷ Lệ Hoàn Thành Theo Module</span>
              </div>

              <div className="space-y-3">
                {moduleAverages.map(ma => (
                  <ProgressBar
                    key={ma.id}
                    percent={ma.avgPct}
                    label={`M${ma.idx + 1}. ${ma.title}`}
                    accent={ma.avgPct >= 80 ? 'emerald' : ma.avgPct < 30 ? 'amber' : 'cyan'}
                    size="sm"
                  />
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </RoleGate>
  );
};
