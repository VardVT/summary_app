import React, { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Circle,
  ClipboardCheck,
  Download,
  ExternalLink,
  FileText,
  Lightbulb,
  Play,
  Presentation,
  Video,
} from 'lucide-react';
import {
  TrainingDocument,
  TrainingLesson,
  TrainingModule,
  TrainingPermissions,
  TrainingQuiz,
  TrainingQuizAttempt,
} from '../types';
import { useLesson } from '../hooks/useLesson';
import { getDocumentDownloadUrl, isValidHttpsUrl } from '../services/trainingApi';
import { MarkdownView } from '../components/MarkdownView';
import { ProgressBar } from '../components/ProgressBar';

interface LessonPageProps {
  permissions: TrainingPermissions;
  lessonId: string;
  modules: TrainingModule[];
  allLessons: TrainingLesson[];
  quizzes: TrainingQuiz[];
  completedLessonIds: Set<string>;
  savingLessonId: string | null;
  latestAttemptByQuizId: Map<string, TrainingQuizAttempt>;
  onBackToModules: () => void;
  onBackToModule: (moduleId: string) => void;
  onOpenLesson: (lessonId: string) => void;
  onOpenQuiz: (quizId: string) => void;
  onToggleComplete: (lessonId: string) => Promise<void>;
}

export const LessonPage: React.FC<LessonPageProps> = ({
  permissions,
  lessonId,
  modules,
  allLessons,
  quizzes,
  completedLessonIds,
  savingLessonId,
  latestAttemptByQuizId,
  onBackToModules,
  onBackToModule,
  onOpenLesson,
  onOpenQuiz,
  onToggleComplete,
}) => {
  const { lesson, documents, quiz, loading, error } = useLesson(lessonId);
  const [activeSubTab, setActiveSubTab] = useState<'notes' | 'files'>('notes');
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [downloadingDocId, setDownloadingDocId] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 h-80 rounded-2xl bg-white border border-slate-200 animate-pulse" />
        <div className="lg:col-span-8 h-96 rounded-2xl bg-white border border-slate-200 animate-pulse" />
      </div>
    );
  }

  if (error || !lesson) {
    return (
      <div className="bg-white border border-red-200 rounded-2xl p-6 text-center space-y-3 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">Không thể mở bài học</h2>
        <p className="text-xs sm:text-sm text-red-600">
          {error || 'Bài học không tồn tại hoặc yêu cầu đăng nhập tài khoản nội bộ.'}
        </p>
      </div>
    );
  }

  const parentModule = modules.find(m => m.id === lesson.module_id) || null;
  const moduleLessons = allLessons.filter(l => l.module_id === lesson.module_id);
  const currentIdx = moduleLessons.findIndex(l => l.id === lesson.id);
  const prevLesson = currentIdx > 0 ? moduleLessons[currentIdx - 1] : null;
  const nextLesson =
    currentIdx >= 0 && currentIdx < moduleLessons.length - 1
      ? moduleLessons[currentIdx + 1]
      : null;

  const modCompletedCount = moduleLessons.filter(l => completedLessonIds.has(l.id)).length;
  const modPercent =
    moduleLessons.length > 0 ? Math.round((modCompletedCount / moduleLessons.length) * 100) : 0;

  const isCompleted = completedLessonIds.has(lesson.id);
  const isSaving = savingLessonId === lesson.id;
  const quizAttempt = quiz ? latestAttemptByQuizId.get(quiz.id) : undefined;
  const moduleQuiz =
    quiz || quizzes.find(q => moduleLessons.some(l => l.id === q.lesson_id)) || null;

  const hasSafeVideo = Boolean(lesson.video_url && isValidHttpsUrl(lesson.video_url));
  const hasSafeSlides = Boolean(lesson.slides_url && isValidHttpsUrl(lesson.slides_url));

  const handleDownloadAttachment = async (doc: TrainingDocument) => {
    setDownloadingDocId(doc.id);
    setDownloadError(null);
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
    } catch (err) {
      setDownloadError(
        err instanceof Error ? err.message : 'Không thể tải tệp đính kèm.',
      );
    } finally {
      setDownloadingDocId(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* Breadcrumb Bar (Screen 3 Top) */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
          <button
            type="button"
            onClick={onBackToModules}
            className="hover:text-[#0284C7] font-medium cursor-pointer"
          >
            Khóa học
          </button>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          <button
            type="button"
            onClick={() => onBackToModule(lesson.module_id)}
            className="hover:text-[#0284C7] font-medium cursor-pointer"
          >
            {parentModule?.title || 'Module'}
          </button>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          <span className="px-2.5 py-0.5 rounded-lg bg-sky-50 border border-sky-200/80 text-[#0284C7] font-semibold">
            Bài {String(Math.max(1, currentIdx + 1)).padStart(2, '0')}: {lesson.title}
          </span>
        </div>

        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-slate-200 text-[11px] font-mono text-slate-600">
          <span className="w-2 h-2 rounded-full bg-[#0284C7]" />
          <span>{parentModule?.is_public ? 'PUBLIC MODULE' : 'AVEVA MARINE'}</span>
        </span>
      </div>

      {/* 2-Column Lesson Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Sidebar: Module Progress + Syllabus + Quick Quiz */}
        <aside className="lg:col-span-4 space-y-4">
          {!permissions.isGuest && (
            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 space-y-2.5 shadow-[0_2px_8px_rgba(15,23,42,0.02)]">
              <ProgressBar
                percent={modPercent}
                label={`Tiến độ ${parentModule?.title || 'Module'}`}
                sublabel={`${modCompletedCount}/${moduleLessons.length} bài`}
                accent={modPercent >= 100 ? 'emerald' : 'cyan'}
                size="sm"
              />
            </div>
          )}

          {/* Sibling Lessons */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 space-y-3 shadow-[0_2px_8px_rgba(15,23,42,0.02)]">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900">Nội dung bài học</h2>
              <span className="text-xs font-mono text-slate-400">
                {moduleLessons.length} bài giảng
              </span>
            </div>

            <div className="space-y-2">
              {moduleLessons.map((item, idx) => {
                const isActive = item.id === lesson.id;
                const done = completedLessonIds.has(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onOpenLesson(item.id)}
                    className={`w-full text-left p-3 rounded-xl border transition-all flex items-start gap-3 cursor-pointer ${
                      isActive
                        ? 'bg-sky-50/80 border-2 border-[#0284C7]'
                        : 'bg-[#F8FAFC] border-slate-200/70 hover:border-slate-300'
                    }`}
                  >
                    <div className="mt-0.5 shrink-0">
                      {isActive ? (
                        <div className="w-5 h-5 rounded-full bg-[#0284C7] text-white flex items-center justify-center">
                          <Play className="w-2.5 h-2.5 fill-current ml-0.5" />
                        </div>
                      ) : !permissions.isGuest && done ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      ) : (
                        <Circle className="w-5 h-5 text-slate-300" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div
                        className={`text-[10px] font-mono uppercase tracking-wider font-bold ${
                          isActive ? 'text-[#0284C7]' : 'text-slate-400'
                        }`}
                      >
                        {isActive
                          ? 'Đang học'
                          : done && !permissions.isGuest
                          ? 'Hoàn thành'
                          : `Bài ${String(idx + 1).padStart(2, '0')}`}
                      </div>
                      <div className="text-xs sm:text-sm font-semibold text-slate-800 line-clamp-2 leading-snug mt-0.5">
                        {item.title}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {moduleQuiz && (
              <div className="p-3.5 rounded-xl bg-sky-50/70 border border-sky-200/80 space-y-2.5 mt-2">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                  <ClipboardCheck className="w-4 h-4 text-[#0284C7]" />
                  <span>{moduleQuiz.title}</span>
                </div>
                <p className="text-xs text-slate-600">
                  Điểm đạt yêu cầu: {moduleQuiz.pass_score}%
                  {quizAttempt ? ` · Gần nhất: ${quizAttempt.score}%` : ''}
                </p>
                <button
                  type="button"
                  onClick={() => onOpenQuiz(moduleQuiz.id)}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-sky-50 border border-sky-200 text-[#0284C7] text-xs font-bold transition-colors cursor-pointer"
                >
                  <span>Làm bài Test ngay</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          <div className="bg-sky-50/70 border border-sky-200/80 rounded-2xl p-4 space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#0284C7]">
              <Lightbulb className="w-4 h-4" />
              <span>Ghi chú thực hành</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Luôn đối chiếu attribute và kiểm tra tiêu chuẩn trước khi chuyển bước kế tiếp trong quy trình.
            </p>
          </div>
        </aside>

        {/* Right Main Area */}
        <article className="lg:col-span-8 space-y-5">
          {/* Header & Video/Slides Links */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 space-y-4 shadow-[0_2px_10px_rgba(15,23,42,0.03)]">
            <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-slate-500">
              <span className="text-[#0284C7] font-bold">
                {parentModule?.title || 'Piping Academy'}
              </span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">
                Bài {currentIdx >= 0 ? currentIdx + 1 : 1} / {moduleLessons.length || 1}
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 leading-snug">
              {lesson.title}
            </h1>

            {(hasSafeVideo || hasSafeSlides) && (
              <div className="flex flex-wrap items-center gap-3 pt-1">
                {hasSafeVideo && lesson.video_url && (
                  <a
                    href={lesson.video_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0F172A] hover:bg-slate-800 text-white text-xs font-semibold transition-colors"
                  >
                    <Video className="w-4 h-4 text-sky-400" />
                    <span>Mở Video hướng dẫn</span>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                  </a>
                )}
                {hasSafeSlides && lesson.slides_url && (
                  <a
                    href={lesson.slides_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 text-xs font-semibold transition-colors"
                  >
                    <Presentation className="w-4 h-4" />
                    <span>Mở Slide bài giảng</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Sub-tabs: Notes vs Attachments */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-white border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setActiveSubTab('notes')}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg font-semibold transition-colors cursor-pointer ${
                  activeSubTab === 'notes'
                    ? 'bg-[#0F172A] text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Ghi chú chính</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveSubTab('files')}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg font-semibold transition-colors cursor-pointer ${
                  activeSubTab === 'files'
                    ? 'bg-[#0F172A] text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Download className="w-3.5 h-3.5" />
                <span>Tài liệu đính kèm ({documents.length})</span>
              </button>
            </div>
          </div>

          {/* Tab Panel */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-[0_2px_10px_rgba(15,23,42,0.03)]">
            {activeSubTab === 'notes' ? (
              <MarkdownView content={lesson.content_md} />
            ) : documents.length === 0 ? (
              <div className="text-center py-6 text-sm text-slate-500">
                Bài học này chưa có tệp tài liệu đính kèm.
              </div>
            ) : (
              <div className="space-y-3">
                {downloadError && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
                    {downloadError}
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {documents.map(doc => (
                    <div
                      key={doc.id}
                      className="p-4 rounded-xl bg-[#F8FAFC] border border-slate-200 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                          {doc.title}
                        </div>
                        {doc.description && (
                          <div className="text-xs text-slate-500 truncate mt-0.5">
                            {doc.description}
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        disabled={downloadingDocId === doc.id}
                        onClick={() => handleDownloadAttachment(doc)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0284C7] hover:bg-[#0369A1] text-white text-xs font-semibold cursor-pointer shrink-0 disabled:opacity-50"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>{downloadingDocId === doc.id ? 'Đang tạo...' : 'Tải'}</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Bottom Prev / Complete / Next & Quiz Bar */}
          <footer className="bg-white border border-slate-200/90 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-[0_2px_10px_rgba(15,23,42,0.03)]">
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={!prevLesson}
                onClick={() => prevLesson && onOpenLesson(prevLesson.id)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-semibold disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Bài trước</span>
              </button>
              <button
                type="button"
                disabled={!nextLesson}
                onClick={() => nextLesson && onOpenLesson(nextLesson.id)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-semibold disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
              >
                <span>Bài kế</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {permissions.canSaveProgress ? (
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => onToggleComplete(lesson.id)}
                  className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer disabled:opacity-60 ${
                    isCompleted
                      ? 'bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                      : 'bg-sky-50 border border-sky-200 text-[#0284C7] hover:bg-sky-100'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {isSaving
                      ? 'Đang lưu...'
                      : isCompleted
                      ? 'Đã hoàn thành'
                      : 'Đánh dấu hoàn thành'}
                  </span>
                </button>
              ) : (
                <span className="text-xs font-mono text-slate-500">
                  Guest (không lưu tiến độ)
                </span>
              )}

              {quiz && (
                <button
                  type="button"
                  onClick={() => onOpenQuiz(quiz.id)}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[#0284C7] hover:bg-[#0369A1] text-white font-bold text-xs transition-colors cursor-pointer"
                >
                  <ClipboardCheck className="w-4 h-4" />
                  <span>
                    Làm trắc nghiệm
                    {quizAttempt ? ` (${quizAttempt.score}%)` : ''}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </footer>
        </article>
      </div>
    </div>
  );
};
