import React, { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  BookOpen,
  FileText,
  GraduationCap,
  Home,
  PenSquare,
  RefreshCw,
  Users,
} from 'lucide-react';
import { AppAccessLevel } from '../../types';
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

export const TrainingApp: React.FC<TrainingAppProps> = ({ accessLevel = 'edit' }) => {
  const [searchParams, setSearchParams] = useSearchParams();
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

  const roleLabel = permissions.isGuest
    ? 'Guest (Public)'
    : permissions.role === 'admin'
    ? 'Admin'
    : permissions.role === 'lead'
    ? 'Lead'
    : 'Engineer';

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-[#0B1F33] text-slate-100">
      {/* Sub-navigation bar */}
      <header className="shrink-0 bg-[#0E1D2D]/95 border-b border-slate-800 px-4 sm:px-6 py-3">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-mono uppercase tracking-wider text-amber-400">
                APP-06 · Piping Academy
              </div>
              <div className="text-sm sm:text-base font-bold text-white leading-tight">
                Trainning App
              </div>
            </div>
          </div>

          <nav className="flex flex-wrap items-center gap-1.5 text-xs font-mono">
            <button
              type="button"
              onClick={() => navigateView('home')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-colors cursor-pointer ${
                view === 'home'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                  : 'text-slate-300 hover:bg-slate-800/80 border border-transparent'
              }`}
            >
              <Home className="w-3.5 h-3.5" />
              <span>Trang chủ</span>
            </button>

            <button
              type="button"
              onClick={() => navigateView('modules')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-colors cursor-pointer ${
                view === 'modules' || view === 'module' || view === 'lesson' || view === 'quiz'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                  : 'text-slate-300 hover:bg-slate-800/80 border border-transparent'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Modules</span>
            </button>

            {permissions.canViewDocuments && (
              <button
                type="button"
                onClick={() => navigateView('documents')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-colors cursor-pointer ${
                  view === 'documents'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                    : 'text-slate-300 hover:bg-slate-800/80 border border-transparent'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Thư viện</span>
              </button>
            )}

            {permissions.canEdit && (
              <button
                type="button"
                onClick={() => navigateView('editor')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-colors cursor-pointer ${
                  view === 'editor'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                    : 'text-slate-300 hover:bg-slate-800/80 border border-transparent'
                }`}
              >
                <PenSquare className="w-3.5 h-3.5" />
                <span>Soạn nội dung</span>
              </button>
            )}

            {permissions.canViewAllProgress && (
              <button
                type="button"
                onClick={() => navigateView('progress')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-colors cursor-pointer ${
                  view === 'progress'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                    : 'text-slate-300 hover:bg-slate-800/80 border border-transparent'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Tiến độ nhóm</span>
              </button>
            )}
          </nav>

          <span className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-slate-300">
            {roleLabel}
          </span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-6">
        <div className="max-w-6xl mx-auto space-y-5">
          {(catalogError || progressError) && (
            <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs sm:text-sm text-red-300">
                {catalogError || progressError}
              </div>
              <button
                type="button"
                onClick={() => {
                  reloadCatalog();
                  reloadProgress();
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono text-white cursor-pointer"
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
              onOpenModules={() => navigateView('modules')}
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
              completedLessonIds={completedLessonIds}
              savingLessonId={savingLessonId}
              latestAttemptByQuizId={latestAttemptByQuizId}
              onBackToModule={mId => navigateView('module', { moduleId: mId })}
              onOpenLesson={id => navigateView('lesson', { lessonId: id })}
              onOpenQuiz={qId => navigateView('quiz', { quizId: qId })}
              onToggleComplete={toggleLessonComplete}
            />
          )}

          {view === 'quiz' && (
            <QuizPage
              permissions={permissions}
              quizId={quizId}
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
        </div>
      </main>
    </div>
  );
};

export default TrainingApp;
