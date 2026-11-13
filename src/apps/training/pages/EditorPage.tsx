import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  Eye,
  FileUp,
  FolderLock,
  Globe,
  Layers,
  Pencil,
  Plus,
  Save,
  Trash2,
  Upload,
} from 'lucide-react';
import {
  TrainingDocument,
  TrainingDocumentBucket,
  TrainingLesson,
  TrainingModule,
  TrainingPermissions,
  TrainingQuiz,
  TrainingQuizQuestionEditable,
} from '../types';
import {
  deleteDocument,
  deleteLesson,
  deleteModule,
  deleteQuiz,
  deleteQuizQuestion,
  fetchLibraryDocuments,
  fetchQuizForEdit,
  getRealSupabaseUserId,
  isValidHttpsUrl,
  saveQuizQuestion,
  uploadDocumentFile,
  upsertLesson,
  upsertModule,
  upsertQuizForLesson,
} from '../services/trainingApi';
import { RoleGate } from '../components/RoleGate';
import { MarkdownView } from '../components/MarkdownView';

interface EditorPageProps {
  permissions: TrainingPermissions;
  modules: TrainingModule[];
  lessons: TrainingLesson[];
  quizzes: TrainingQuiz[];
  onDataChanged: () => Promise<void>;
  onBackHome: () => void;
}

type EditorTab = 'modules' | 'lessons' | 'documents';

const PUBLIC_INTERNET_WARNING = 'Nội dung này sẽ đọc được bởi bất kỳ ai trên internet.';

export const EditorPage: React.FC<EditorPageProps> = ({
  permissions,
  modules,
  lessons,
  quizzes,
  onDataChanged,
  onBackHome,
}) => {
  const [activeTab, setActiveTab] = useState<EditorTab>('modules');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState<boolean>(false);

  // =========================================================================
  // TAB 1: MODULES STATE
  // =========================================================================
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);
  const [modTitle, setModTitle] = useState('');
  const [modDesc, setModDesc] = useState('');
  const [modOrder, setModOrder] = useState<number>(1);
  const [modIsPublic, setModIsPublic] = useState<boolean>(false);
  const [confirmDeleteModId, setConfirmDeleteModId] = useState<string | null>(null);

  const resetModuleForm = useCallback(() => {
    setEditingModuleId(null);
    setModTitle('');
    setModDesc('');
    setModOrder(modules.length + 1);
    setModIsPublic(false);
  }, [modules.length]);

  useEffect(() => {
    if (!editingModuleId && !modTitle) {
      setModOrder(modules.length + 1);
    }
  }, [modules.length, editingModuleId, modTitle]);

  const handleSelectEditModule = (mod: TrainingModule) => {
    setEditingModuleId(mod.id);
    setModTitle(mod.title);
    setModDesc(mod.description);
    setModOrder(mod.sort_order);
    setModIsPublic(mod.is_public);
    setStatusMessage(null);
    setErrorMessage(null);
  };

  const handleSaveModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modTitle.trim()) {
      setErrorMessage('Vui lòng nhập tên module.');
      return;
    }
    setBusy(true);
    setErrorMessage(null);
    setStatusMessage(null);
    try {
      await upsertModule({
        id: editingModuleId ?? undefined,
        title: modTitle,
        description: modDesc,
        sort_order: modOrder,
        is_public: modIsPublic,
      });
      await onDataChanged();
      setStatusMessage(editingModuleId ? 'Đã cập nhật module.' : 'Đã tạo module mới.');
      resetModuleForm();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Không thể lưu module.');
    } finally {
      setBusy(false);
    }
  };

  const handleMoveModule = async (idx: number, direction: -1 | 1) => {
    const targetIdx = idx + direction;
    if (targetIdx < 0 || targetIdx >= modules.length) return;
    const current = modules[idx];
    const swapWith = modules[targetIdx];
    setBusy(true);
    setErrorMessage(null);
    try {
      await Promise.all([
        upsertModule({ ...current, sort_order: swapWith.sort_order }),
        upsertModule({ ...swapWith, sort_order: current.sort_order }),
      ]);
      await onDataChanged();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Không thể đổi thứ tự module.');
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteModule = async (id: string) => {
    setBusy(true);
    setErrorMessage(null);
    setStatusMessage(null);
    try {
      await deleteModule(id);
      setConfirmDeleteModId(null);
      if (editingModuleId === id) resetModuleForm();
      await onDataChanged();
      setStatusMessage('Đã xóa module.');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Không thể xóa module.');
    } finally {
      setBusy(false);
    }
  };

  // =========================================================================
  // TAB 2: LESSONS & QUIZ STATE
  // =========================================================================
  const [selectedModuleId, setSelectedModuleId] = useState<string>('');
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonContent, setLessonContent] = useState('');
  const [lessonVideoUrl, setLessonVideoUrl] = useState('');
  const [lessonSlidesUrl, setLessonSlidesUrl] = useState('');
  const [lessonOrder, setLessonOrder] = useState<number>(1);
  const [previewMarkdown, setPreviewMarkdown] = useState<boolean>(false);
  const [confirmDeleteLessonId, setConfirmDeleteLessonId] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedModuleId && modules.length > 0) {
      setSelectedModuleId(modules[0].id);
    }
  }, [modules, selectedModuleId]);

  const selectedModule = useMemo(
    () => modules.find(m => m.id === selectedModuleId) ?? null,
    [modules, selectedModuleId],
  );

  const moduleLessons = useMemo(
    () => lessons.filter(l => l.module_id === selectedModuleId),
    [lessons, selectedModuleId],
  );

  const resetLessonForm = useCallback(() => {
    setEditingLessonId(null);
    setLessonTitle('');
    setLessonContent('');
    setLessonVideoUrl('');
    setLessonSlidesUrl('');
    setLessonOrder(moduleLessons.length + 1);
    setPreviewMarkdown(false);
  }, [moduleLessons.length]);

  const handleSelectLesson = (lesson: TrainingLesson) => {
    setEditingLessonId(lesson.id);
    setLessonTitle(lesson.title);
    setLessonContent(lesson.content_md);
    setLessonVideoUrl(lesson.video_url ?? '');
    setLessonSlidesUrl(lesson.slides_url ?? '');
    setLessonOrder(lesson.sort_order);
    setPreviewMarkdown(false);
    setStatusMessage(null);
    setErrorMessage(null);
  };

  const handleSaveLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedModuleId) {
      setErrorMessage('Vui lòng chọn module.');
      return;
    }
    if (!lessonTitle.trim()) {
      setErrorMessage('Vui lòng nhập tiêu đề bài học.');
      return;
    }
    if (!isValidHttpsUrl(lessonVideoUrl)) {
      setErrorMessage('Link video không hợp lệ (chỉ chấp nhận URL bắt đầu bằng https://).');
      return;
    }
    if (!isValidHttpsUrl(lessonSlidesUrl)) {
      setErrorMessage('Link slide không hợp lệ (chỉ chấp nhận URL bắt đầu bằng https://).');
      return;
    }

    setBusy(true);
    setErrorMessage(null);
    setStatusMessage(null);
    try {
      const saved = await upsertLesson({
        id: editingLessonId ?? undefined,
        module_id: selectedModuleId,
        title: lessonTitle,
        content_md: lessonContent,
        video_url: lessonVideoUrl,
        slides_url: lessonSlidesUrl,
        sort_order: lessonOrder,
      });
      await onDataChanged();
      setEditingLessonId(saved.id);
      setStatusMessage(editingLessonId ? 'Đã cập nhật bài học.' : 'Đã tạo bài học mới.');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Không thể lưu bài học.');
    } finally {
      setBusy(false);
    }
  };

  const handleMoveLesson = async (idx: number, direction: -1 | 1) => {
    const targetIdx = idx + direction;
    if (targetIdx < 0 || targetIdx >= moduleLessons.length) return;
    const current = moduleLessons[idx];
    const swapWith = moduleLessons[targetIdx];
    setBusy(true);
    setErrorMessage(null);
    try {
      await Promise.all([
        upsertLesson({ ...current, sort_order: swapWith.sort_order }),
        upsertLesson({ ...swapWith, sort_order: current.sort_order }),
      ]);
      await onDataChanged();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Không thể đổi thứ tự bài học.');
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteLesson = async (lessonId: string) => {
    setBusy(true);
    setErrorMessage(null);
    setStatusMessage(null);
    try {
      await deleteLesson(lessonId);
      setConfirmDeleteLessonId(null);
      if (editingLessonId === lessonId) resetLessonForm();
      await onDataChanged();
      setStatusMessage('Đã xóa bài học.');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Không thể xóa bài học.');
    } finally {
      setBusy(false);
    }
  };

  // Quiz editor
  const lessonQuiz = useMemo(
    () => (editingLessonId ? quizzes.find(q => q.lesson_id === editingLessonId) ?? null : null),
    [quizzes, editingLessonId],
  );
  const [quizTitle, setQuizTitle] = useState('');
  const [quizPassScore, setQuizPassScore] = useState<number>(70);
  const [editableQuestions, setEditableQuestions] = useState<TrainingQuizQuestionEditable[]>([]);
  const [loadingQuizEdit, setLoadingQuizEdit] = useState(false);
  const [confirmDeleteQuiz, setConfirmDeleteQuiz] = useState(false);

  // Question form
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [qPrompt, setQPrompt] = useState('');
  const [qOptions, setQOptions] = useState<string[]>(['', '', '', '']);
  const [qCorrectIdx, setQCorrectIdx] = useState<number>(0);
  const [qExplanation, setQExplanation] = useState('');
  const [qSortOrder, setQSortOrder] = useState<number>(1);

  const loadQuizEditDetails = useCallback(async (quizId: string) => {
    setLoadingQuizEdit(true);
    try {
      const payload = await fetchQuizForEdit(quizId);
      setQuizTitle(payload.quiz.title);
      setQuizPassScore(payload.quiz.pass_score);
      setEditableQuestions(payload.questions);
      setQSortOrder(payload.questions.length + 1);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Không thể tải dữ liệu câu hỏi.');
    } finally {
      setLoadingQuizEdit(false);
    }
  }, []);

  useEffect(() => {
    setConfirmDeleteQuiz(false);
    setEditingQuestionId(null);
    setQPrompt('');
    setQOptions(['', '', '', '']);
    setQCorrectIdx(0);
    setQExplanation('');

    if (lessonQuiz) {
      setQuizTitle(lessonQuiz.title);
      setQuizPassScore(lessonQuiz.pass_score);
      loadQuizEditDetails(lessonQuiz.id);
    } else {
      setQuizTitle(lessonTitle ? `Kiểm tra: ${lessonTitle}` : '');
      setQuizPassScore(70);
      setEditableQuestions([]);
      setQSortOrder(1);
    }
  }, [lessonQuiz, lessonTitle, loadQuizEditDetails]);

  const handleSaveQuizMeta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLessonId) return;
    if (!quizTitle.trim()) {
      setErrorMessage('Vui lòng nhập tên Quiz.');
      return;
    }
    setBusy(true);
    setErrorMessage(null);
    setStatusMessage(null);
    try {
      const saved = await upsertQuizForLesson({
        id: lessonQuiz?.id,
        lesson_id: editingLessonId,
        title: quizTitle,
        pass_score: quizPassScore,
      });
      await onDataChanged();
      await loadQuizEditDetails(saved.id);
      setStatusMessage(lessonQuiz ? 'Đã cập nhật thông tin Quiz.' : 'Đã tạo Quiz cho bài học.');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Không thể lưu Quiz.');
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteQuiz = async () => {
    if (!lessonQuiz) return;
    setBusy(true);
    setErrorMessage(null);
    try {
      await deleteQuiz(lessonQuiz.id);
      setConfirmDeleteQuiz(false);
      setEditableQuestions([]);
      await onDataChanged();
      setStatusMessage('Đã xóa Quiz.');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Không thể xóa Quiz.');
    } finally {
      setBusy(false);
    }
  };

  const handleEditQuestion = (q: TrainingQuizQuestionEditable) => {
    setEditingQuestionId(q.id);
    setQPrompt(q.question);
    setQOptions(q.options.length >= 2 ? q.options : ['', '']);
    setQCorrectIdx(q.correct_index);
    setQExplanation(q.explanation);
    setQSortOrder(q.sort_order);
  };

  const resetQuestionForm = () => {
    setEditingQuestionId(null);
    setQPrompt('');
    setQOptions(['', '', '', '']);
    setQCorrectIdx(0);
    setQExplanation('');
    setQSortOrder(editableQuestions.length + 1);
  };

  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lessonQuiz) return;
    const cleanedOptions = qOptions.map(o => o.trim()).filter(Boolean);
    if (!qPrompt.trim()) {
      setErrorMessage('Vui lòng nhập nội dung câu hỏi.');
      return;
    }
    if (cleanedOptions.length < 2) {
      setErrorMessage('Câu hỏi phải có ít nhất 2 phương án trả lời.');
      return;
    }
    const safeCorrectIndex = Math.min(Math.max(0, qCorrectIdx), cleanedOptions.length - 1);

    setBusy(true);
    setErrorMessage(null);
    setStatusMessage(null);
    try {
      await saveQuizQuestion({
        id: editingQuestionId,
        quiz_id: lessonQuiz.id,
        question: qPrompt,
        options: cleanedOptions,
        correct_index: safeCorrectIndex,
        explanation: qExplanation,
        sort_order: qSortOrder,
      });
      await loadQuizEditDetails(lessonQuiz.id);
      resetQuestionForm();
      setStatusMessage(editingQuestionId ? 'Đã cập nhật câu hỏi.' : 'Đã thêm câu hỏi mới.');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Không thể lưu câu hỏi.');
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!lessonQuiz) return;
    setBusy(true);
    setErrorMessage(null);
    try {
      await deleteQuizQuestion(questionId);
      if (editingQuestionId === questionId) resetQuestionForm();
      await loadQuizEditDetails(lessonQuiz.id);
      setStatusMessage('Đã xóa câu hỏi.');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Không thể xóa câu hỏi.');
    } finally {
      setBusy(false);
    }
  };

  // =========================================================================
  // TAB 3: DOCUMENTS UPLOAD STATE
  // =========================================================================
  const [docs, setDocs] = useState<TrainingDocument[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [docTitle, setDocTitle] = useState('');
  const [docDesc, setDocDesc] = useState('');
  const [docLessonId, setDocLessonId] = useState<string>('');
  const [docBucket, setDocBucket] = useState<TrainingDocumentBucket>('training-documents');
  const [docFile, setDocFile] = useState<File | null>(null);
  const [confirmDeleteDocId, setConfirmDeleteDocId] = useState<string | null>(null);

  const loadDocs = useCallback(async () => {
    setLoadingDocs(true);
    try {
      const list = await fetchLibraryDocuments();
      setDocs(list);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Không thể tải danh sách tài liệu.');
    } finally {
      setLoadingDocs(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'documents') {
      loadDocs();
    }
  }, [activeTab, loadDocs]);

  const docTargetLesson = useMemo(
    () => lessons.find(l => l.id === docLessonId) ?? null,
    [lessons, docLessonId],
  );
  const docTargetModule = useMemo(
    () => (docTargetLesson ? modules.find(m => m.id === docTargetLesson.module_id) ?? null : null),
    [modules, docTargetLesson],
  );

  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docFile) {
      setErrorMessage('Vui lòng chọn tệp để tải lên.');
      return;
    }
    setBusy(true);
    setErrorMessage(null);
    setStatusMessage(null);
    try {
      const uid = await getRealSupabaseUserId();
      await uploadDocumentFile(docFile, {
        title: docTitle || docFile.name,
        description: docDesc,
        lesson_id: docLessonId || null,
        bucket_id: docBucket,
        uploaded_by: uid,
      });
      setDocTitle('');
      setDocDesc('');
      setDocFile(null);
      await loadDocs();
      setStatusMessage('Đã tải lên tài liệu thành công.');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Tải lên tài liệu thất bại.');
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteDocument = async (doc: TrainingDocument) => {
    setBusy(true);
    setErrorMessage(null);
    try {
      await deleteDocument(doc);
      setConfirmDeleteDocId(null);
      await loadDocs();
      setStatusMessage('Đã xóa tài liệu.');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Không thể xóa tài liệu.');
    } finally {
      setBusy(false);
    }
  };

  const showPublicDocWarning =
    docBucket === 'training-public' || Boolean(docTargetModule?.is_public);

  return (
    <RoleGate permissions={permissions} require="edit" onBack={onBackHome}>
      <div className="space-y-5">
        {/* Header & Subtabs */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-[0_2px_10px_rgba(15,23,42,0.03)]">
          <div>
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#0284C7] font-bold">
              Lead & Admin · Soạn thảo đào tạo
            </span>
            <h1 className="text-xl font-extrabold text-slate-900 mt-0.5">
              Quản Trị Nội Dung Piping Academy
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-1 p-1 rounded-xl bg-slate-100 border border-slate-200 text-xs font-mono">
            <button
              type="button"
              onClick={() => setActiveTab('modules')}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors cursor-pointer ${
                activeTab === 'modules'
                  ? 'bg-[#0284C7] text-white font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Modules ({modules.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('lessons')}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors cursor-pointer ${
                activeTab === 'lessons'
                  ? 'bg-[#0284C7] text-white font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Bài học & Quiz ({lessons.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('documents')}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors cursor-pointer ${
                activeTab === 'documents'
                  ? 'bg-[#0284C7] text-white font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileUp className="w-3.5 h-3.5" />
              <span>Tài liệu</span>
            </button>
          </div>
        </div>

        {statusMessage && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
            {errorMessage}
          </div>
        )}

        {/* TAB 1: MODULES */}
        {activeTab === 'modules' && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
            <div className="lg:col-span-3 space-y-3">
              {modules.map((mod, idx) => (
                <div
                  key={mod.id}
                  className="bg-white border border-slate-200/90 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold tabular-nums">
                        #{mod.sort_order}
                      </span>
                      {mod.is_public ? (
                        <span className="inline-flex items-center gap-1 text-amber-600 font-semibold">
                          <Globe className="w-3.5 h-3.5" />
                          <span>Public (Guest)</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-slate-500">
                          <FolderLock className="w-3.5 h-3.5" />
                          <span>Nội bộ</span>
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-bold text-slate-900">{mod.title}</h3>
                    <p className="text-xs text-slate-500 line-clamp-2">{mod.description}</p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      disabled={busy || idx === 0}
                      onClick={() => handleMoveModule(idx, -1)}
                      title="Đưa lên"
                      className="p-2 rounded-lg bg-[#F8FAFC] border border-slate-200 text-slate-600 hover:border-slate-300 disabled:opacity-30 cursor-pointer"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={busy || idx === modules.length - 1}
                      onClick={() => handleMoveModule(idx, 1)}
                      title="Đưa xuống"
                      className="p-2 rounded-lg bg-[#F8FAFC] border border-slate-200 text-slate-600 hover:border-slate-300 disabled:opacity-30 cursor-pointer"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectEditModule(mod)}
                      title="Sửa module"
                      className="p-2 rounded-lg bg-sky-50 border border-sky-200 text-[#0284C7] hover:bg-sky-100 cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    {confirmDeleteModId === mod.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => handleDeleteModule(mod.id)}
                          className="px-2.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold cursor-pointer"
                        >
                          Xác nhận xóa
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteModId(null)}
                          className="px-2 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-xs cursor-pointer"
                        >
                          Hủy
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteModId(mod.id)}
                        title="Xóa module"
                        className="p-2 rounded-lg bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <form
              onSubmit={handleSaveModule}
              className="lg:col-span-2 bg-white border border-slate-200/90 rounded-2xl p-5 space-y-4 h-fit shadow-[0_2px_10px_rgba(15,23,42,0.03)]"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-900">
                  {editingModuleId ? 'Cập nhật Module' : 'Thêm Module mới'}
                </h2>
                {editingModuleId && (
                  <button
                    type="button"
                    onClick={resetModuleForm}
                    className="text-xs font-mono text-[#0284C7] hover:underline cursor-pointer"
                  >
                    + Tạo mới
                  </button>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-mono text-slate-500">Tên Module *</label>
                <input
                  type="text"
                  value={modTitle}
                  onChange={e => setModTitle(e.target.value)}
                  placeholder="Ví dụ: AVEVA 3D"
                  className="w-full px-3 py-2 rounded-xl bg-[#F8FAFC] border border-slate-200 focus:border-[#0284C7] focus:outline-none text-sm text-slate-900"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-mono text-slate-500">Mô tả</label>
                <textarea
                  rows={3}
                  value={modDesc}
                  onChange={e => setModDesc(e.target.value)}
                  placeholder="Nội dung tổng quan của module..."
                  className="w-full px-3 py-2 rounded-xl bg-[#F8FAFC] border border-slate-200 focus:border-[#0284C7] focus:outline-none text-sm text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-mono text-slate-500">Thứ tự</label>
                  <input
                    type="number"
                    value={modOrder}
                    onChange={e => setModOrder(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-[#F8FAFC] border border-slate-200 focus:border-[#0284C7] focus:outline-none text-sm text-slate-900 font-mono"
                  />
                </div>
                <div className="flex items-end pb-1">
                  <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={modIsPublic}
                      onChange={e => setModIsPublic(e.target.checked)}
                      className="rounded border-slate-300 text-[#0284C7]"
                    />
                    <span>Công khai (Guest)</span>
                  </label>
                </div>
              </div>

              {modIsPublic && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                  <span>{PUBLIC_INTERNET_WARNING}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={busy}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#0284C7] hover:bg-[#0369A1] text-white font-bold text-xs cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{editingModuleId ? 'Lưu cập nhật' : 'Tạo Module'}</span>
              </button>
            </form>
          </div>
        )}

        {/* TAB 2: LESSONS & QUIZ */}
        {activeTab === 'lessons' && (
          <div className="space-y-5">
            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-3 flex-1">
                <span className="text-xs font-mono text-slate-500 shrink-0">Chọn Module:</span>
                <select
                  value={selectedModuleId}
                  onChange={e => {
                    setSelectedModuleId(e.target.value);
                    setEditingLessonId(null);
                  }}
                  className="px-3 py-2 rounded-xl bg-[#F8FAFC] border border-slate-200 text-sm text-slate-800 focus:outline-none focus:border-[#0284C7]"
                >
                  {modules.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.title} {m.is_public ? '(Public)' : '(Nội bộ)'}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={resetLessonForm}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0284C7] hover:bg-[#0369A1] text-white font-bold text-xs cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Bài học mới</span>
              </button>
            </div>

            {selectedModule?.is_public && (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                <span>
                  Module đang chọn ở chế độ công khai: {PUBLIC_INTERNET_WARNING}
                </span>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              <div className="lg:col-span-4 space-y-2.5">
                {moduleLessons.length === 0 ? (
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center text-xs text-slate-500">
                    Module này chưa có bài học.
                  </div>
                ) : (
                  moduleLessons.map((lesson, idx) => {
                    const isSelected = editingLessonId === lesson.id;
                    const hasQuiz = quizzes.some(q => q.lesson_id === lesson.id);
                    return (
                      <div
                        key={lesson.id}
                        className={`bg-white border rounded-2xl p-3.5 space-y-2 shadow-xs ${
                          isSelected ? 'border-2 border-[#0284C7]' : 'border-slate-200'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => handleSelectLesson(lesson)}
                            className="text-left flex-1 min-w-0 cursor-pointer"
                          >
                            <div className="text-[11px] font-mono text-[#0284C7] font-bold">
                              Bài #{lesson.sort_order}
                              {hasQuiz ? ' · Có Quiz' : ''}
                            </div>
                            <div className="text-sm font-bold text-slate-900 truncate">
                              {lesson.title}
                            </div>
                          </button>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              disabled={busy || idx === 0}
                              onClick={() => handleMoveLesson(idx, -1)}
                              className="p-1.5 rounded-lg bg-[#F8FAFC] border border-slate-200 text-slate-600 disabled:opacity-30 cursor-pointer"
                            >
                              <ArrowUp className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              disabled={busy || idx === moduleLessons.length - 1}
                              onClick={() => handleMoveLesson(idx, 1)}
                              className="p-1.5 rounded-lg bg-[#F8FAFC] border border-slate-200 text-slate-600 disabled:opacity-30 cursor-pointer"
                            >
                              <ArrowDown className="w-3 h-3" />
                            </button>
                            {confirmDeleteLessonId === lesson.id ? (
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => handleDeleteLesson(lesson.id)}
                                className="px-2 py-1 rounded-lg bg-red-600 text-white text-[11px] font-bold cursor-pointer"
                              >
                                Xóa
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteLessonId(lesson.id)}
                                className="p-1.5 rounded-lg bg-red-50 border border-red-200 text-red-600 cursor-pointer"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="lg:col-span-8 space-y-5">
                <form
                  onSubmit={handleSaveLesson}
                  className="bg-white border border-slate-200/90 rounded-2xl p-5 space-y-4 shadow-[0_2px_10px_rgba(15,23,42,0.03)]"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="text-sm font-bold text-slate-900">
                      {editingLessonId ? 'Chỉnh sửa bài học' : 'Tạo bài học mới'}
                    </h2>
                    <button
                      type="button"
                      onClick={() => setPreviewMarkdown(p => !p)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-50 border border-sky-200 text-xs font-mono text-[#0284C7] font-semibold cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>{previewMarkdown ? 'Quay lại soạn thảo' : 'Xem trước Markdown'}</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div className="sm:col-span-3 space-y-1">
                      <label className="block text-xs font-mono text-slate-500">
                        Tiêu đề bài học *
                      </label>
                      <input
                        type="text"
                        value={lessonTitle}
                        onChange={e => setLessonTitle(e.target.value)}
                        placeholder="Ví dụ: Modeling Equipment trong AVEVA"
                        className="w-full px-3 py-2 rounded-xl bg-[#F8FAFC] border border-slate-200 focus:border-[#0284C7] focus:outline-none text-sm text-slate-900"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-xs font-mono text-slate-500">Thứ tự</label>
                      <input
                        type="number"
                        value={lessonOrder}
                        onChange={e => setLessonOrder(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl bg-[#F8FAFC] border border-slate-200 text-sm text-slate-900 font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block text-xs font-mono text-slate-500">
                        Video URL (chỉ https://)
                      </label>
                      <input
                        type="url"
                        value={lessonVideoUrl}
                        onChange={e => setLessonVideoUrl(e.target.value)}
                        placeholder="https://..."
                        className="w-full px-3 py-2 rounded-xl bg-[#F8FAFC] border border-slate-200 text-sm text-slate-900 font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-xs font-mono text-slate-500">
                        Slides URL (chỉ https://)
                      </label>
                      <input
                        type="url"
                        value={lessonSlidesUrl}
                        onChange={e => setLessonSlidesUrl(e.target.value)}
                        placeholder="https://..."
                        className="w-full px-3 py-2 rounded-xl bg-[#F8FAFC] border border-slate-200 text-sm text-slate-900 font-mono"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-mono text-slate-500">
                      Nội dung (Markdown)
                    </label>
                    {previewMarkdown ? (
                      <div className="p-4 rounded-xl bg-[#F8FAFC] border border-slate-200 min-h-[180px]">
                        <MarkdownView content={lessonContent || '*Chưa có nội dung.*'} />
                      </div>
                    ) : (
                      <textarea
                        rows={8}
                        value={lessonContent}
                        onChange={e => setLessonContent(e.target.value)}
                        placeholder="## Mục tiêu bài học&#10;- ..."
                        className="w-full px-3 py-2.5 rounded-xl bg-[#F8FAFC] border border-slate-200 focus:border-[#0284C7] focus:outline-none text-sm text-slate-900 font-mono"
                      />
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={busy}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0284C7] hover:bg-[#0369A1] text-white font-bold text-xs cursor-pointer disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    <span>{editingLessonId ? 'Lưu bài học' : 'Tạo bài học'}</span>
                  </button>
                </form>

                {editingLessonId && (
                  <div className="bg-white border border-slate-200/90 rounded-2xl p-5 space-y-5 shadow-[0_2px_10px_rgba(15,23,42,0.03)]">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <ClipboardCheck className="w-4 h-4 text-[#0284C7]" />
                        <span>Quiz của bài học</span>
                      </h2>
                      {lessonQuiz && (
                        <div>
                          {confirmDeleteQuiz ? (
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={handleDeleteQuiz}
                                className="px-2.5 py-1 rounded-lg bg-red-600 text-white text-xs font-bold cursor-pointer"
                              >
                                Xác nhận xóa Quiz
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteQuiz(false)}
                                className="px-2 py-1 rounded-lg bg-slate-100 text-slate-600 text-xs cursor-pointer"
                              >
                                Hủy
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteQuiz(true)}
                              className="text-xs font-mono text-red-600 hover:underline cursor-pointer"
                            >
                              Xóa Quiz này
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    <form
                      onSubmit={handleSaveQuizMeta}
                      className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end"
                    >
                      <div className="sm:col-span-2 space-y-1">
                        <label className="block text-xs font-mono text-slate-500">Tên Quiz *</label>
                        <input
                          type="text"
                          value={quizTitle}
                          onChange={e => setQuizTitle(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-[#F8FAFC] border border-slate-200 text-sm text-slate-900"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-xs font-mono text-slate-500">
                          Điểm đạt (%)
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={quizPassScore}
                          onChange={e => setQuizPassScore(Number(e.target.value))}
                          className="w-full px-3 py-2 rounded-xl bg-[#F8FAFC] border border-slate-200 text-sm text-slate-900 font-mono"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={busy}
                        className="px-4 py-2 rounded-xl bg-[#0284C7] hover:bg-[#0369A1] text-white font-bold text-xs cursor-pointer disabled:opacity-50"
                      >
                        {lessonQuiz ? 'Cập nhật Quiz' : 'Tạo Quiz'}
                      </button>
                    </form>

                    {lessonQuiz && (
                      <div className="pt-4 border-t border-slate-200 space-y-4">
                        <h3 className="text-xs font-mono text-slate-500 uppercase tracking-wider font-bold">
                          Danh sách câu hỏi ({editableQuestions.length})
                        </h3>

                        {loadingQuizEdit ? (
                          <div className="text-xs text-slate-400 font-mono">Đang tải câu hỏi...</div>
                        ) : (
                          <div className="space-y-2.5">
                            {editableQuestions.map((q, idx) => (
                              <div
                                key={q.id}
                                className="p-3.5 rounded-xl bg-[#F8FAFC] border border-slate-200 flex items-start justify-between gap-3"
                              >
                                <div className="space-y-1 min-w-0">
                                  <div className="text-xs font-mono text-[#0284C7] font-bold">
                                    Câu {idx + 1} · Đáp án đúng: [
                                    {String.fromCharCode(65 + q.correct_index)}]
                                  </div>
                                  <div className="text-sm font-semibold text-slate-900">
                                    {q.question}
                                  </div>
                                  {q.explanation && (
                                    <div className="text-xs text-slate-500">
                                      Giải thích: {q.explanation}
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => handleEditQuestion(q)}
                                    className="p-1.5 rounded-lg bg-sky-50 border border-sky-200 text-[#0284C7] cursor-pointer"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteQuestion(q.id)}
                                    className="p-1.5 rounded-lg bg-red-50 border border-red-200 text-red-600 cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        <form
                          onSubmit={handleSaveQuestion}
                          className="p-4 rounded-xl bg-[#F8FAFC] border border-slate-200 space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-[#0284C7]">
                              {editingQuestionId ? 'Sửa câu hỏi' : 'Thêm câu hỏi mới'}
                            </span>
                            {editingQuestionId && (
                              <button
                                type="button"
                                onClick={resetQuestionForm}
                                className="text-xs font-mono text-slate-500 hover:text-slate-900 cursor-pointer"
                              >
                                Hủy sửa
                              </button>
                            )}
                          </div>

                          <textarea
                            rows={2}
                            value={qPrompt}
                            onChange={e => setQPrompt(e.target.value)}
                            placeholder="Nội dung câu hỏi..."
                            className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-sm text-slate-900"
                          />

                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-xs font-mono text-slate-500">
                              <span>Các đáp án (chọn nút tròn để đặt đáp án đúng)</span>
                              <button
                                type="button"
                                onClick={() => setQOptions(prev => [...prev, ''])}
                                className="text-[#0284C7] hover:underline cursor-pointer font-semibold"
                              >
                                + Thêm lựa chọn
                              </button>
                            </div>
                            {qOptions.map((opt, idx) => (
                              <div key={idx} className="flex items-center gap-2">
                                <input
                                  type="radio"
                                  name="correct_answer"
                                  checked={qCorrectIdx === idx}
                                  onChange={() => setQCorrectIdx(idx)}
                                  className="text-[#0284C7]"
                                />
                                <span className="text-xs font-mono text-slate-500 w-5">
                                  {String.fromCharCode(65 + idx)}.
                                </span>
                                <input
                                  type="text"
                                  value={opt}
                                  onChange={e =>
                                    setQOptions(prev =>
                                      prev.map((item, i) => (i === idx ? e.target.value : item)),
                                    )
                                  }
                                  placeholder={`Phương án ${String.fromCharCode(65 + idx)}`}
                                  className="flex-1 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs sm:text-sm text-slate-900"
                                />
                                {qOptions.length > 2 && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setQOptions(prev => prev.filter((_, i) => i !== idx));
                                      if (qCorrectIdx >= qOptions.length - 1) setQCorrectIdx(0);
                                    }}
                                    className="p-1.5 text-slate-400 hover:text-red-600 cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                            <div className="sm:col-span-3 space-y-1">
                              <label className="block text-xs font-mono text-slate-500">
                                Giải thích (hiện sau khi nộp bài)
                              </label>
                              <input
                                type="text"
                                value={qExplanation}
                                onChange={e => setQExplanation(e.target.value)}
                                placeholder="Giải thích ngắn gọn dựa theo DSS / DNV / AVEVA..."
                                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs sm:text-sm text-slate-900"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="block text-xs font-mono text-slate-500">
                                Thứ tự
                              </label>
                              <input
                                type="number"
                                value={qSortOrder}
                                onChange={e => setQSortOrder(Number(e.target.value))}
                                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs sm:text-sm text-slate-900 font-mono"
                              />
                            </div>
                          </div>

                          <button
                            type="submit"
                            disabled={busy}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0284C7] hover:bg-[#0369A1] text-white font-bold text-xs cursor-pointer disabled:opacity-50"
                          >
                            <Save className="w-3.5 h-3.5" />
                            <span>{editingQuestionId ? 'Lưu câu hỏi' : 'Thêm câu hỏi'}</span>
                          </button>
                        </form>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: DOCUMENTS UPLOAD / DELETE */}
        {activeTab === 'documents' && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
            <div className="lg:col-span-3 space-y-3">
              {loadingDocs ? (
                <div className="h-28 rounded-2xl bg-white border border-slate-200 animate-pulse" />
              ) : docs.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-sm text-slate-500">
                  Chưa có tài liệu nào được tải lên.
                </div>
              ) : (
                docs.map(doc => (
                  <div
                    key={doc.id}
                    className="bg-white border border-slate-200/90 rounded-2xl p-4 flex items-center justify-between gap-3 shadow-xs"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 text-xs font-mono">
                        <span
                          className={
                            doc.bucket_id === 'training-public'
                              ? 'text-[#0284C7] font-semibold'
                              : 'text-amber-600 font-semibold'
                          }
                        >
                          {doc.bucket_id}
                        </span>
                      </div>
                      <div className="text-sm font-bold text-slate-900 truncate">{doc.title}</div>
                      <div className="text-xs text-slate-400 truncate">{doc.storage_path}</div>
                    </div>

                    {confirmDeleteDocId === doc.id ? (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => handleDeleteDocument(doc)}
                          className="px-2.5 py-1.5 rounded-lg bg-red-600 text-white text-xs font-bold cursor-pointer"
                        >
                          Xác nhận xóa
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteDocId(null)}
                          className="px-2 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-xs cursor-pointer"
                        >
                          Hủy
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteDocId(doc.id)}
                        className="p-2 rounded-lg bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 cursor-pointer shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>

            <form
              onSubmit={handleUploadDocument}
              className="lg:col-span-2 bg-white border border-slate-200/90 rounded-2xl p-5 space-y-4 h-fit shadow-[0_2px_10px_rgba(15,23,42,0.03)]"
            >
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Upload className="w-4 h-4 text-[#0284C7]" />
                <span>Tải tài liệu mới lên Storage</span>
              </h2>

              <div className="space-y-1.5">
                <label className="block text-xs font-mono text-slate-500">Chọn tệp *</label>
                <input
                  type="file"
                  onChange={e => {
                    const file = e.target.files?.[0] ?? null;
                    setDocFile(file);
                    if (file && !docTitle) setDocTitle(file.name);
                  }}
                  className="w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border file:border-sky-200 file:bg-sky-50 file:text-[#0284C7] file:font-mono hover:file:bg-sky-100"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-mono text-slate-500">Tiêu đề hiển thị</label>
                <input
                  type="text"
                  value={docTitle}
                  onChange={e => setDocTitle(e.target.value)}
                  placeholder="Ví dụ: DSS 28 Standard SFI.pdf"
                  className="w-full px-3 py-2 rounded-xl bg-[#F8FAFC] border border-slate-200 text-sm text-slate-900"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-mono text-slate-500">Mô tả</label>
                <textarea
                  rows={2}
                  value={docDesc}
                  onChange={e => setDocDesc(e.target.value)}
                  placeholder="Mô tả ngắn nội dung tài liệu..."
                  className="w-full px-3 py-2 rounded-xl bg-[#F8FAFC] border border-slate-200 text-sm text-slate-900"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-mono text-slate-500">
                  Gắn vào bài học (tùy chọn)
                </label>
                <select
                  value={docLessonId}
                  onChange={e => {
                    const nextLessonId = e.target.value;
                    setDocLessonId(nextLessonId);
                    const foundLesson = lessons.find(l => l.id === nextLessonId);
                    const foundMod = foundLesson
                      ? modules.find(m => m.id === foundLesson.module_id)
                      : null;
                    setDocBucket(foundMod?.is_public ? 'training-public' : 'training-documents');
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-[#F8FAFC] border border-slate-200 text-xs sm:text-sm text-slate-800"
                >
                  <option value="">-- Thư viện tài liệu chung (Nội bộ) --</option>
                  {lessons.map(l => {
                    const mod = modules.find(m => m.id === l.module_id);
                    return (
                      <option key={l.id} value={l.id}>
                        [{mod?.title || 'Module'}] {l.title}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-mono text-slate-500">Storage Bucket</label>
                <select
                  value={docBucket}
                  onChange={e => setDocBucket(e.target.value as TrainingDocumentBucket)}
                  className="w-full px-3 py-2 rounded-xl bg-[#F8FAFC] border border-slate-200 text-xs sm:text-sm text-slate-800 font-mono"
                >
                  <option value="training-documents">
                    training-documents (Private · Chỉ nội bộ)
                  </option>
                  <option value="training-public">
                    training-public (Public · Cho Guest)
                  </option>
                </select>
              </div>

              {showPublicDocWarning && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                  <span>{PUBLIC_INTERNET_WARNING}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={busy || !docFile}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#0284C7] hover:bg-[#0369A1] text-white font-bold text-xs cursor-pointer disabled:opacity-50"
              >
                <Upload className="w-4 h-4" />
                <span>{busy ? 'Đang tải lên...' : 'Tải tài liệu lên'}</span>
              </button>
            </form>
          </div>
        )}
      </div>
    </RoleGate>
  );
};
