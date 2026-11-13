import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  Award,
  CheckCircle2,
  ClipboardCheck,
  Download,
  FileText,
  Globe,
  HelpCircle,
  Layers,
  Lock,
  Play,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import {
  TrainingDocument,
  TrainingLesson,
  TrainingModule,
  TrainingPermissions,
  TrainingQuiz,
  TrainingQuizAttempt,
} from '../types';
import { fetchLibraryDocuments, getDocumentDownloadUrl } from '../services/trainingApi';

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
  onOpenQuiz: (quizId: string) => void;
  onOpenModules: () => void;
  onOpenDocuments: () => void;
}

function getFileExtension(path: string, title: string): string {
  const src = (path || title).split('?')[0];
  const ext = src.includes('.') ? src.split('.').pop()?.toUpperCase() : '';
  return ext && ext.length <= 5 ? ext : 'FILE';
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
  onOpenQuiz,
  onOpenModules,
  onOpenDocuments,
}) => {
  const [recentDocs, setRecentDocs] = useState<TrainingDocument[]>([]);
  const [downloadingDocId, setDownloadingDocId] = useState<string | null>(null);

  useEffect(() => {
    if (!permissions.canViewDocuments) {
      setRecentDocs([]);
      return;
    }
    let cancelled = false;
    fetchLibraryDocuments()
      .then(list => {
        if (!cancelled) setRecentDocs(list.slice(0, 3));
      })
      .catch(() => {
        if (!cancelled) setRecentDocs([]);
      });
    return () => {
      cancelled = true;
    };
  }, [permissions.canViewDocuments]);

  const totalLessons = lessons.length;
  const completedCount = lessons.filter(l => completedLessonIds.has(l.id)).length;
  const overallPercent = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  const latestByQuiz = new Map<string, TrainingQuizAttempt>();
  for (const attempt of quizAttempts) {
    if (!latestByQuiz.has(attempt.quiz_id)) {
      latestByQuiz.set(attempt.quiz_id, attempt);
    }
  }

  const latestScores = Array.from(latestByQuiz.values()).map(a => a.score);
  const avgQuizScore =
    latestScores.length > 0
      ? (latestScores.reduce((s, n) => s + n, 0) / latestScores.length).toFixed(1)
      : '--';

  const passedQuizIds = new Set(
    quizAttempts
      .filter(a => {
        const q = quizzes.find(item => item.id === a.quiz_id);
        return q ? a.score >= q.pass_score : a.score >= 70;
      })
      .map(a => a.quiz_id),
  );

  const nextLesson = lessons.find(l => !completedLessonIds.has(l.id)) || lessons[0] || null;
  const nextLessonModuleIdx = nextLesson
    ? modules.findIndex(m => m.id === nextLesson.module_id)
    : -1;
  const nextLessonInModIdx = nextLesson
    ? lessons
        .filter(l => l.module_id === nextLesson.module_id)
        .findIndex(l => l.id === nextLesson.id)
    : -1;

  const featuredQuiz =
    quizzes.find(q => !passedQuizIds.has(q.id)) || quizzes[0] || null;

  const handleQuickDownload = async (doc: TrainingDocument) => {
    setDownloadingDocId(doc.id);
    try {
      const url = await getDocumentDownloadUrl(doc);
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.download = doc.title;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } finally {
      setDownloadingDocId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="h-56 rounded-3xl bg-white border border-slate-200 animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 h-96 rounded-2xl bg-white border border-slate-200 animate-pulse" />
          <div className="lg:col-span-4 h-96 rounded-2xl bg-white border border-slate-200 animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hero Summary Card (Screen 1 Top Card) */}
      <section className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-[0_2px_12px_rgba(15,23,42,0.03)] space-y-6">
        <div className="space-y-2.5 max-w-3xl">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-50 border border-sky-200/70 text-[#0284C7] text-xs font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>
              {permissions.isGuest
                ? 'Chế độ Guest · Module Công khai'
                : 'Lộ trình đào tạo Kỹ sư Đường ống'}
            </span>
          </span>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Học Thiết Kế Đường Ống Hàng Hải
          </h1>

          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
            {permissions.isGuest
              ? 'Bạn đang truy cập ở chế độ Guest. Bạn có thể học module công khai AVEVA 3D (Equipment, Pipe, Layout) và làm bài trắc nghiệm chấm điểm tại chỗ.'
              : 'Nền tảng đào tạo kỹ sư mô hình hoá AVEVA Marine 3D, xử lý va chạm kết cấu, xuất bản vẽ 2D và tiêu chuẩn đóng tàu DSS / DNV / SOLAS.'}
          </p>
        </div>

        {/* 3 KPI Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-[#F8FAFC] border border-slate-200/80 rounded-2xl p-4 flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-sky-50 border border-sky-200/70 flex items-center justify-center text-[#0284C7] shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-extrabold text-slate-900 tabular-nums">
                {modules.length} Modules
              </div>
              <div className="text-xs text-slate-500">
                {permissions.isGuest ? 'Module công khai khả dụng' : 'Toàn bộ lộ trình đào tạo'}
              </div>
            </div>
          </div>

          <div className="bg-[#F8FAFC] border border-slate-200/80 rounded-2xl p-4 flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-200/70 flex items-center justify-center text-emerald-600 shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-extrabold text-slate-900 tabular-nums">
                {permissions.isGuest ? `${totalLessons} Bài học` : `${overallPercent}% Hoàn thành`}
              </div>
              <div className="text-xs text-slate-500 tabular-nums">
                {permissions.isGuest
                  ? 'AVEVA 3D tự biên soạn'
                  : `${completedCount} / ${totalLessons} bài học`}
              </div>
            </div>
          </div>

          <div className="bg-[#F8FAFC] border border-slate-200/80 rounded-2xl p-4 flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-200/70 flex items-center justify-center text-amber-600 shrink-0">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-extrabold text-slate-900 tabular-nums">
                {permissions.isGuest
                  ? `${quizzes.length} Quiz`
                  : avgQuizScore === '--'
                  ? '-- Điểm TB'
                  : `${avgQuizScore} Điểm TB`}
              </div>
              <div className="text-xs text-slate-500 tabular-nums">
                {permissions.isGuest
                  ? 'Chấm tại chỗ (không lưu)'
                  : `${passedQuizIds.size} / ${quizzes.length} quiz đã đạt`}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main 2-Column Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Module List */}
        <section className="lg:col-span-8 space-y-3.5">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-lg font-bold text-slate-900">Danh Sách Modules</h2>
            <button
              type="button"
              onClick={onOpenModules}
              className="text-xs font-mono text-[#0284C7] hover:underline cursor-pointer"
            >
              {modules.length} mô-đun trọng tâm →
            </button>
          </div>

          {modules.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-sm text-slate-500">
              Chưa có module nào khả dụng. Vui lòng chạy migration seed hoặc liên hệ Lead/Admin.
            </div>
          ) : (
            <div className="space-y-3">
              {modules.map((mod, idx) => {
                const modLessons = lessons.filter(l => l.module_id === mod.id);
                const modDone = modLessons.filter(l => completedLessonIds.has(l.id)).length;
                const modPercent =
                  modLessons.length > 0 ? Math.round((modDone / modLessons.length) * 100) : 0;

                const isCompleted = !permissions.isGuest && modLessons.length > 0 && modPercent === 100;
                const isInProgress = !permissions.isGuest && modPercent > 0 && modPercent < 100;
                const isActiveTarget =
                  isInProgress ||
                  (!permissions.isGuest && modPercent === 0 && idx === 0 && completedCount === 0);

                return (
                  <div
                    key={mod.id}
                    className={`bg-white rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
                      isActiveTarget
                        ? 'border-2 border-[#0284C7] shadow-[0_4px_16px_rgba(2,132,199,0.08)]'
                        : 'border border-slate-200/90 hover:border-slate-300 shadow-[0_2px_8px_rgba(15,23,42,0.02)]'
                    }`}
                  >
                    <div className="flex items-start gap-4 min-w-0 flex-1">
                      <div
                        className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${
                          isCompleted
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                            : mod.is_public
                            ? 'bg-amber-50 border-amber-200 text-amber-600'
                            : isActiveTarget
                            ? 'bg-sky-50 border-sky-200 text-[#0284C7]'
                            : 'bg-slate-50 border-slate-200 text-slate-400'
                        }`}
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="w-5 h-5" />
                        ) : mod.is_public ? (
                          <Globe className="w-5 h-5" />
                        ) : isActiveTarget ? (
                          <TrendingUp className="w-5 h-5" />
                        ) : (
                          <Lock className="w-5 h-5" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span
                            className={`px-2 py-0.5 rounded-md font-mono text-[11px] font-bold ${
                              isActiveTarget
                                ? 'bg-[#0284C7] text-white'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            MOD {String(idx + 1).padStart(2, '0')}
                          </span>
                          {mod.is_public ? (
                            <span className="text-amber-600 font-semibold">
                              Công khai (Guest)
                            </span>
                          ) : isCompleted ? (
                            <span className="text-emerald-600 font-semibold">
                              • Đã hoàn tất
                            </span>
                          ) : isInProgress ? (
                            <span className="text-[#0284C7] font-semibold">
                              • Đang học ({modPercent}%)
                            </span>
                          ) : (
                            <span className="text-slate-400 font-medium">
                              {modLessons.length} bài học
                            </span>
                          )}
                        </div>

                        <h3 className="text-base font-bold text-slate-900">{mod.title}</h3>
                        <p className="text-xs sm:text-sm text-slate-500 line-clamp-1">
                          {mod.description}
                        </p>

                        {!permissions.isGuest && (
                          <div className="pt-1 max-w-xs">
                            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${
                                  isCompleted
                                    ? 'bg-emerald-500'
                                    : mod.is_public
                                    ? 'bg-amber-500'
                                    : 'bg-[#0284C7]'
                                }`}
                                style={{ width: `${modPercent}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onOpenModule(mod.id)}
                      className={`inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer shrink-0 whitespace-nowrap ${
                        isActiveTarget
                          ? 'bg-[#0284C7] hover:bg-[#0369A1] text-white shadow-sm'
                          : 'bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700'
                      }`}
                    >
                      <span>
                        {isActiveTarget
                          ? 'Tiếp tục học'
                          : isCompleted
                          ? 'Xem lại bài'
                          : 'Xem bài'}
                      </span>
                      {isActiveTarget && <ArrowRight className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Right Sidebar (3 Stacked Action Cards) */}
        <aside className="lg:col-span-4 space-y-5">
          {/* Card 1: Next Lesson */}
          {nextLesson && (
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 space-y-3 shadow-[0_2px_10px_rgba(15,23,42,0.03)]">
              <div className="flex items-center justify-between gap-2 text-[11px] font-mono">
                <span className="font-bold text-[#0284C7] uppercase tracking-wider">
                  Bài học tiếp theo
                </span>
                <span className="text-slate-400">
                  Mod {String(Math.max(1, nextLessonModuleIdx + 1)).padStart(2, '0')} - Bài{' '}
                  {String(Math.max(1, nextLessonInModIdx + 1)).padStart(2, '0')}
                </span>
              </div>

              <h3 className="text-base font-bold text-slate-900 leading-snug">
                {nextLesson.title}
              </h3>

              <p className="text-xs text-slate-500 leading-relaxed">
                {modules.find(m => m.id === nextLesson.module_id)?.description ||
                  'Tiếp tục nội dung thực hành AVEVA Marine Piping.'}
              </p>

              <button
                type="button"
                onClick={() => onOpenLesson(nextLesson.id)}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#0284C7] hover:bg-[#0369A1] text-white text-xs sm:text-sm font-bold transition-colors cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Vào học ngay</span>
              </button>
            </div>
          )}

          {/* Card 2: Featured Quiz */}
          {featuredQuiz && (
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 space-y-3 shadow-[0_2px_10px_rgba(15,23,42,0.03)]">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-mono font-bold text-amber-600 uppercase tracking-wider">
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>Quiz kiểm tra</span>
                </span>
                <span className="px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-700 font-mono text-[11px] font-bold">
                  Đạt {featuredQuiz.pass_score}%
                </span>
              </div>

              <h3 className="text-base font-bold text-slate-900 leading-snug">
                {featuredQuiz.title}
              </h3>

              <p className="text-xs text-slate-500">
                Kiểm tra kiến thức trắc nghiệm và xem giải thích chi tiết ngay sau khi nộp bài.
              </p>

              <button
                type="button"
                onClick={() => onOpenQuiz(featuredQuiz.id)}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 border border-slate-200 text-slate-800 text-xs font-bold transition-colors cursor-pointer"
              >
                <ClipboardCheck className="w-4 h-4 text-[#0284C7]" />
                <span>Làm bài thử thách</span>
              </button>
            </div>
          )}

          {/* Card 3: Popular / Recent Documents */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 space-y-3.5 shadow-[0_2px_10px_rgba(15,23,42,0.03)]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-bold text-slate-500 uppercase tracking-wider">
                Tài liệu thư viện
              </span>
              {permissions.canViewDocuments && (
                <button
                  type="button"
                  onClick={onOpenDocuments}
                  className="text-xs font-semibold text-[#0284C7] hover:underline cursor-pointer"
                >
                  Tất cả
                </button>
              )}
            </div>

            {!permissions.canViewDocuments ? (
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-500 leading-relaxed flex items-start gap-2.5">
                <Lock className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <span>
                  Thư viện tài liệu tiêu chuẩn (DSS 28, DSS 12, DSS 00, DNV, SOLAS) mở khóa sau khi đăng nhập tài khoản nội bộ.
                </span>
              </div>
            ) : recentDocs.length === 0 ? (
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-500">
                Chưa có tài liệu nào được tải lên thư viện.
              </div>
            ) : (
              <div className="space-y-2">
                {recentDocs.map(doc => {
                  const ext = getFileExtension(doc.storage_path, doc.title);
                  return (
                    <button
                      key={doc.id}
                      type="button"
                      disabled={downloadingDocId === doc.id}
                      onClick={() => handleQuickDownload(doc)}
                      className="w-full p-2.5 rounded-xl bg-[#F8FAFC] hover:bg-sky-50/60 border border-slate-200/70 flex items-center justify-between gap-2.5 text-left transition-colors cursor-pointer disabled:opacity-60"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="text-xs font-semibold text-slate-700 truncate">
                          {doc.title}
                        </span>
                      </div>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white border border-slate-200 text-[10px] font-mono font-bold text-slate-600 shrink-0">
                        {downloadingDocId === doc.id ? (
                          <Download className="w-3 h-3 animate-bounce text-[#0284C7]" />
                        ) : (
                          ext
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};
