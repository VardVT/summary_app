import React, { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  BookOpen,
  ClipboardCheck,
  FileText,
  GraduationCap,
  Home,
  PenSquare,
  RefreshCw,
  Users,
} from 'lucide-react';
import { AppAccessLevel } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { TrainingRouteView } from './types';
import { useTrainingPermissions } from './hooks/useTrainingPermissions';
import { useModules } from './hooks/useModules';
import { useProgress } from './hooks/useProgress';
import { HomePage } from './pages/HomePage';
import { ModuleListPage } from './pages/ModuleListPage';
import { ModulePage } from './pages/ModulePage';
import { LessonPage } from './pages/LessonPage';
import { QuizPage } from './pages/QuizPage';
import { DocumentsPage } from './pages/DocumentsPage';
import { EditorPage } from './pages/EditorPage';
import { ProgressPage } from './pages/ProgressPage';

export interface TrainingAppProps {
  accessLevel?: AppAccessLevel;
}

const VALID_VIEWS: TrainingRouteView[] = [
  'home',
  'modules',
  'module',
  'lesson',
  'quiz',
  'documents',
  'editor',
  'progress',
];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'GV';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export const TrainingApp: React.FC<TrainingAppProps> = ({ accessLevel = 'edit' }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const permissions = useTrainingPermissions(accessLevel);

  const {
    modules,
    lessons,
    quizzes,
    loading: loadingCatalog,
    error: catalogError,
    reload: reloadCatalog,
  } = useModules();

  const {
    quizAttempts,
    completedLessonIds,
    latestAttemptByQuizId,
    savingLessonId,
    error: progressError,
    reload: reloadProgress,
    toggleLessonComplete,
  } = useProgress(permissions.canSaveProgress);

  const rawView = searchParams.get('view') as TrainingRouteView | null;
  const view: TrainingRouteView =
    rawView && VALID_VIEWS.includes(rawView) ? rawView : 'home';
  const moduleId = searchParams.get('moduleId') ?? '';
  const lessonId = searchParams.get('lessonId') ?? '';
  const quizId = searchParams.get('quizId') ?? '';

  const defaultQuizId = useMemo(() => quizzes[0]?.id ?? '', [quizzes]);

  const navigateView = useCallback(
    (
      nextView: TrainingRouteView,
      params?: { moduleId?: string; lessonId?: string; quizId?: string },
    ) => {
      const next = new URLSearchParams();
      if (nextView !== 'home') next.set('view', nextView);
      if (params?.moduleId) next.set('moduleId', params.moduleId);
      if (params?.lessonId) next.set('lessonId', params.lessonId);
      if (params?.quizId) next.set('quizId', params.quizId);
      setSearchParams(next);
    },
    [setSearchParams],
  );

  const displayName = permissions.isGuest
    ? 'Guest Viewer'
    : user?.name || user?.email || 'Kỹ sư Piping';

  const roleSubtitle = permissions.isGuest
    ? 'GUEST DEMO'
    : permissions.role === 'admin'
    ? 'ADMIN'
    : permissions.role === 'lead'
    ? 'SENIOR / LEAD'
    : 'PIPING ENGINEER';

  const initials = getInitials(displayName);

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-[#F4F7FA] text-slate-900">
      {/* Top Navigation Bar matching mockup layout */}
      <header className="shrink-0 bg-white/95 backdrop-blur border-b border-slate-200/80 px-4 sm:px-6 py-2.5">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Brand */}
          <button
            type="button"
            onClick={() => navigateView('home')}
            className="flex items-center gap-3 text-left cursor-pointer"
          >
            <div className="w-9 h-9 rounded-xl bg-sky-50 border border-sky-200/80 flex items-center justify-center text-[#0284C7] shrink-0">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
                Piping Academy
              </div>
              <div className="text-[11px] font-mono uppercase tracking-wider text-slate-500">
                AVEVA Marine 3D
              </div>
            </div>
          </button>

          {/* Center Pill Navigation */}
          <nav className="flex flex-wrap items-center gap-1 p-1 rounded-2xl bg-slate-100/80 border border-slate-200/80 text-xs">
            <button
              type="button"
              onClick={() => navigateView('home')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl transition-all cursor-pointer font-medium ${
                view === 'home'
                  ? 'bg-[#0284C7] text-white shadow-sm font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/70'
              }`}
            >
              <Home className="w-3.5 h-3.5" />
              <span>Trang chủ</span>
            </button>

            <button
              type="button"
              onClick={() => navigateView('modules')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl transition-all cursor-pointer font-medium ${
                view === 'modules' || view === 'module' || view === 'lesson'
                  ? 'bg-[#0284C7] text-white shadow-sm font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/70'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Khóa học / Bài học</span>
            </button>

            {defaultQuizId && (
              <button
                type="button"
                onClick={() =>
                  navigateView('quiz', { quizId: quizId || defaultQuizId })
                }
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl transition-all cursor-pointer font-medium ${
                  view === 'quiz'
                    ? 'bg-[#0284C7] text-white shadow-sm font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/70'
                }`}
              >
                <ClipboardCheck className="w-3.5 h-3.5" />
                <span>Trắc nghiệm</span>
              </button>
            )}

            {permissions.canViewDocuments && (
              <button
                type="button"
                onClick={() => navigateView('documents')}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl transition-all cursor-pointer font-medium ${
                  view === 'documents'
                    ? 'bg-[#0284C7] text-white shadow-sm font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/70'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Tài liệu</span>
              </button>
            )}

            {permissions.canViewAllProgress && (
              <button
                type="button"
                onClick={() => navigateView('progress')}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl transition-all cursor-pointer font-medium ${
                  view === 'progress'
                    ? 'bg-[#0284C7] text-white shadow-sm font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/70'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Tiến độ</span>
              </button>
            )}

            {permissions.canEdit && (
              <button
                type="button"
                onClick={() => navigateView('editor')}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl transition-all cursor-pointer font-medium ${
                  view === 'editor'
                    ? 'bg-[#0284C7] text-white shadow-sm font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/70'
                }`}
              >
                <PenSquare className="w-3.5 h-3.5" />
                <span>Soạn nội dung</span>
              </button>
            )}
          </nav>

          {/* Right User Identity Pill */}
          <div className="flex items-center gap-2.5 pl-2">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-bold text-slate-800 leading-tight">
                {displayName}
              </div>
              <div className="text-[10px] font-mono text-emerald-600 flex items-center justify-end gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>{roleSubtitle}</span>
              </div>
            </div>
            <div className="w-9 h-9 rounded-full bg-sky-100 border border-sky-200 flex items-center justify-center text-xs font-bold text-[#0284C7] shrink-0">
              {initials}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Canvas */}
      <main className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {(catalogError || progressError) && (
            <div className="p-4 rounded-2xl bg-red-50 border border-red-200 flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs sm:text-sm text-red-700 font-medium">
                {catalogError || progressError}
              </div>
              <button
                type="button"
                onClick={() => {
                  reloadCatalog();
                  reloadProgress();
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-red-200 text-xs font-mono text-red-700 hover:bg-red-100/50 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Thử lại</span>
              </button>
            </div>
          )}

          {view === 'home' && (
            <HomePage
              permissions={permissions}
              modules={modules}
              lessons={lessons}
              quizzes={quizzes}
              completedLessonIds={completedLessonIds}
              quizAttempts={quizAttempts}
              loading={loadingCatalog}
              onOpenModule={id => navigateView('module', { moduleId: id })}
              onOpenLesson={id => navigateView('lesson', { lessonId: id })}
              onOpenQuiz={qId => navigateView('quiz', { quizId: qId })}
              onOpenModules={() => navigateView('modules')}
              onOpenDocuments={() => navigateView('documents')}
            />
          )}

          {view === 'modules' && (
            <ModuleListPage
              permissions={permissions}
              modules={modules}
              lessons={lessons}
              quizzes={quizzes}
              completedLessonIds={completedLessonIds}
              loading={loadingCatalog}
              onOpenModule={id => navigateView('module', { moduleId: id })}
            />
          )}

          {view === 'module' && (
            <ModulePage
              permissions={permissions}
              module={modules.find(m => m.id === moduleId) ?? null}
              lessons={lessons.filter(l => l.module_id === moduleId)}
              quizzes={quizzes}
              completedLessonIds={completedLessonIds}
              latestAttemptByQuizId={latestAttemptByQuizId}
              loading={loadingCatalog}
              onBack={() => navigateView('modules')}
              onOpenLesson={id => navigateView('lesson', { lessonId: id })}
              onOpenQuiz={id => navigateView('quiz', { quizId: id })}
            />
          )}

          {view === 'lesson' && (
            <LessonPage
              permissions={permissions}
              lessonId={lessonId}
              modules={modules}
              allLessons={lessons}
              quizzes={quizzes}
              completedLessonIds={completedLessonIds}
              savingLessonId={savingLessonId}
              latestAttemptByQuizId={latestAttemptByQuizId}
              onBackToModules={() => navigateView('modules')}
              onBackToModule={mId => navigateView('module', { moduleId: mId })}
              onOpenLesson={id => navigateView('lesson', { lessonId: id })}
              onOpenQuiz={qId => navigateView('quiz', { quizId: qId })}
              onToggleComplete={toggleLessonComplete}
            />
          )}

          {view === 'quiz' && (
            <QuizPage
              permissions={permissions}
              quizId={quizId || defaultQuizId}
              modules={modules}
              lessons={lessons}
              quizzes={quizzes}
              onSelectQuiz={qId => navigateView('quiz', { quizId: qId })}
              onBackToLesson={lId => navigateView('lesson', { lessonId: lId })}
              onAttemptSaved={reloadProgress}
            />
          )}

          {view === 'documents' && (
            <DocumentsPage
              permissions={permissions}
              modules={modules}
              lessons={lessons}
              onBackHome={() => navigateView('home')}
              onOpenLesson={id => navigateView('lesson', { lessonId: id })}
            />
          )}

          {view === 'editor' && (
            <EditorPage
              permissions={permissions}
              modules={modules}
              lessons={lessons}
              quizzes={quizzes}
              onDataChanged={reloadCatalog}
              onBackHome={() => navigateView('home')}
            />
          )}

          {view === 'progress' && (
            <ProgressPage
              permissions={permissions}
              modules={modules}
              lessons={lessons}
              quizzes={quizzes}
              onBackHome={() => navigateView('home')}
            />
          )}

          <footer className="pt-4 pb-2 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
            <span>Piping Academy · Hệ thống đào tạo kỹ sư đường ống AVEVA Marine.</span>
            <span>Tiêu chuẩn DSS & Quy phạm DNV / SOLAS</span>
          </footer>
        </div>
      </main>
    </div>
  );
};

export default TrainingApp;
