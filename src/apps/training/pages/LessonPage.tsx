import React, { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Download,
  ExternalLink,
  FileText,
  Presentation,
  Video,
} from 'lucide-react';
import {
  TrainingDocument,
  TrainingLesson,
  TrainingModule,
  TrainingPermissions,
  TrainingQuizAttempt,
} from '../types';
import { useLesson } from '../hooks/useLesson';
import { getDocumentDownloadUrl, isValidHttpsUrl } from '../services/trainingApi';
import { MarkdownView } from '../components/MarkdownView';

interface LessonPageProps {
  permissions: TrainingPermissions;
  lessonId: string;
  modules: TrainingModule[];
  allLessons: TrainingLesson[];
  completedLessonIds: Set<string>;
  savingLessonId: string | null;
  latestAttemptByQuizId: Map<string, TrainingQuizAttempt>;
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
  completedLessonIds,
  savingLessonId,
  latestAttemptByQuizId,
  onBackToModule,
  onOpenLesson,
  onOpenQuiz,
  onToggleComplete,
}) => {
  const { lesson, documents, quiz, loading, error } = useLesson(lessonId);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [downloadingDocId, setDownloadingDocId] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-24 rounded-2xl bg-slate-900/70 border border-slate-800 animate-pulse" />
        <div className="h-96 rounded-2xl bg-slate-900/70 border border-slate-800 animate-pulse" />
      </div>
    );
  }

  if (error || !lesson) {
    return (
      <div className="bg-[#0E1D2D] border border-red-500/30 rounded-2xl p-6 text-center space-y-3">
        <h2 className="text-lg font-bold text-white">Không thể mở bài học</h2>
        <p className="text-xs sm:text-sm text-red-400">
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

  const isCompleted = completedLessonIds.has(lesson.id);
  const isSaving = savingLessonId === lesson.id;
  const quizAttempt = quiz ? latestAttemptByQuizId.get(quiz.id) : undefined;

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
      {/* Breadcrumb & Prev/Next header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => onBackToModule(lesson.module_id)}
          className="inline-flex items-center gap-1.5 text-xs font-mono text-slate-400 hover:text-amber-400 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{parentModule ? parentModule.title : 'Quay lại Module'}</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={!prevLesson}
            onClick={() => prevLesson && onOpenLesson(prevLesson.id)}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300 hover:border-slate-600 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Bài trước</span>
          </button>
          <button
            type="button"
            disabled={!nextLesson}
            onClick={() => nextLesson && onOpenLesson(nextLesson.id)}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300 hover:border-slate-600 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
          >
            <span>Bài kế</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Lesson Card */}
      <article className="bg-[#0E1D2D] border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6">
        <header className="space-y-3 border-b border-slate-800 pb-5">
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-slate-400">
            <span className="text-amber-400 font-semibold">
              {parentModule?.title || 'Piping Academy'}
            </span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">
              Bài {currentIdx >= 0 ? currentIdx + 1 : 1} / {moduleLessons.length || 1}
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl font-bold text-white">{lesson.title}</h1>

          {(hasSafeVideo || hasSafeSlides) && (
            <div className="flex flex-wrap items-center gap-2.5 pt-2">
              {hasSafeVideo && lesson.video_url && (
                <a
                  href={lesson.video_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-300 text-xs font-semibold transition-colors"
                >
                  <Video className="w-4 h-4" />
                  <span>Xem Video hướng dẫn</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
              {hasSafeSlides && lesson.slides_url && (
                <a
                  href={lesson.slides_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-xs font-semibold transition-colors"
                >
                  <Presentation className="w-4 h-4" />
                  <span>Mở Slide bài giảng</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          )}
        </header>

        {/* Safe Markdown Body */}
        <MarkdownView content={lesson.content_md} />

        {/* Attached Documents */}
        {documents.length > 0 && (
          <section className="pt-5 border-t border-slate-800 space-y-3">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-cyan-400" />
              <span>Tài liệu đính kèm bài học</span>
            </h2>

            {downloadError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400">
                {downloadError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {documents.map(doc => (
                <div
                  key={doc.id}
                  className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="text-xs sm:text-sm font-semibold text-white truncate">
                      {doc.title}
                    </div>
                    {doc.description && (
                      <div className="text-xs text-slate-400 truncate mt-0.5">
                        {doc.description}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    disabled={downloadingDocId === doc.id}
                    onClick={() => handleDownloadAttachment(doc)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-mono cursor-pointer shrink-0 disabled:opacity-50"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{downloadingDocId === doc.id ? 'Đang tạo...' : 'Tải'}</span>
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Action Footer */}
        <footer className="pt-5 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {permissions.canSaveProgress ? (
            <button
              type="button"
              disabled={isSaving}
              onClick={() => onToggleComplete(lesson.id)}
              className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-colors cursor-pointer disabled:opacity-60 ${
                isCompleted
                  ? 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 hover:bg-emerald-500/30'
                  : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {isSaving
                  ? 'Đang lưu...'
                  : isCompleted
                  ? 'Đã hoàn thành (nhấn để bỏ đánh dấu)'
                  : 'Đánh dấu hoàn thành'}
              </span>
            </button>
          ) : (
            <span className="text-xs font-mono text-slate-400">
              Chế độ Guest · Đăng nhập tài khoản kỹ sư để lưu tiến độ hoàn thành bài học.
            </span>
          )}

          {quiz && (
            <button
              type="button"
              onClick={() => onOpenQuiz(quiz.id)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs sm:text-sm transition-colors cursor-pointer"
            >
              <ClipboardCheck className="w-4 h-4" />
              <span>
                Làm quiz{quizAttempt ? ` (Điểm gần nhất: ${quizAttempt.score}%)` : ''}
              </span>
            </button>
          )}
        </footer>
      </article>
    </div>
  );
};
