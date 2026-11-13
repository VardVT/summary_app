import { supabase, isSupabaseConfigured } from '../../../services/supabase';
import {
  TrainingDocument,
  TrainingDocumentBucket,
  TrainingLearner,
  TrainingLesson,
  TrainingLessonProgress,
  TrainingModule,
  TrainingQuiz,
  TrainingQuizAnswerSubmission,
  TrainingQuizAttempt,
  TrainingQuizEditPayload,
  TrainingQuizGradeResponse,
  TrainingQuizQuestion,
} from '../types';

export function isValidHttpsUrl(value: string | null | undefined): boolean {
  const trimmed = (value ?? '').trim();
  if (!trimmed) return true;
  if (!/^https:\/\//i.test(trimmed)) return false;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function getClient() {
  if (!supabase || !isSupabaseConfigured) {
    throw new Error(
      'Supabase chưa được cấu hình (thiếu VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY). Vui lòng cấu hình biến môi trường để kết nối dữ liệu.',
    );
  }
  return supabase;
}

export async function getRealSupabaseUserId(): Promise<string | null> {
  if (!supabase || !isSupabaseConfigured) return null;
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.user?.id ?? null;
  } catch {
    return null;
  }
}

// ============================================================================
// Modules & Lessons (Đọc nội dung - RLS tự động lọc theo role/anon)
// ============================================================================

export async function fetchModules(): Promise<TrainingModule[]> {
  const client = getClient();
  const { data, error } = await client
    .from('training_modules')
    .select('id, title, description, sort_order, is_public, created_at')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as TrainingModule[];
}

export async function fetchAllLessons(): Promise<TrainingLesson[]> {
  const client = getClient();
  const { data, error } = await client
    .from('training_lessons')
    .select('id, module_id, title, content_md, video_url, slides_url, sort_order, created_at')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as TrainingLesson[];
}

export async function fetchLessonsByModule(moduleId: string): Promise<TrainingLesson[]> {
  const client = getClient();
  const { data, error } = await client
    .from('training_lessons')
    .select('id, module_id, title, content_md, video_url, slides_url, sort_order, created_at')
    .eq('module_id', moduleId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as TrainingLesson[];
}

export async function fetchLessonById(lessonId: string): Promise<TrainingLesson | null> {
  const client = getClient();
  const { data, error } = await client
    .from('training_lessons')
    .select('id, module_id, title, content_md, video_url, slides_url, sort_order, created_at')
    .eq('id', lessonId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as TrainingLesson | null) ?? null;
}

export async function fetchAllQuizzes(): Promise<TrainingQuiz[]> {
  const client = getClient();
  const { data, error } = await client
    .from('training_quizzes')
    .select('id, lesson_id, title, pass_score, created_at')
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as TrainingQuiz[];
}

export async function fetchQuizByLesson(lessonId: string): Promise<TrainingQuiz | null> {
  const client = getClient();
  const { data, error } = await client
    .from('training_quizzes')
    .select('id, lesson_id, title, pass_score, created_at')
    .eq('lesson_id', lessonId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as TrainingQuiz | null) ?? null;
}

export async function fetchQuizById(quizId: string): Promise<TrainingQuiz | null> {
  const client = getClient();
  const { data, error } = await client
    .from('training_quizzes')
    .select('id, lesson_id, title, pass_score, created_at')
    .eq('id', quizId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as TrainingQuiz | null) ?? null;
}

export async function fetchQuizQuestions(quizId: string): Promise<TrainingQuizQuestion[]> {
  const client = getClient();
  // Lưu ý bảo mật: KHÔNG lấy đáp án đúng hay giải thích trước khi nộp bài;
  // chỉ trả về sau khi chấm qua RPC training_grade_quiz.
  const { data, error } = await client
    .from('training_quiz_questions')
    .select('id, quiz_id, question, options, sort_order')
    .eq('quiz_id', quizId)
    .order('sort_order', { ascending: true });

  if (error) throw new Error(error.message);
  return ((data ?? []) as Array<Omit<TrainingQuizQuestion, 'explanation'>>).map(q => ({
    ...q,
    explanation: '',
    options: Array.isArray(q.options) ? q.options.map(String) : [],
  }));
}

export async function gradeQuiz(
  quizId: string,
  answers: TrainingQuizAnswerSubmission[],
): Promise<TrainingQuizGradeResponse> {
  const client = getClient();
  const { data, error } = await client.rpc('training_grade_quiz', {
    p_quiz_id: quizId,
    p_answers: answers,
  });

  if (error) throw new Error(error.message);
  return data as TrainingQuizGradeResponse;
}

// ============================================================================
// Tiến độ cá nhân (CHỈ gọi khi có Supabase session thật, không dùng cho Guest)
// ============================================================================

export async function fetchMyLessonProgress(userId: string): Promise<TrainingLessonProgress[]> {
  const client = getClient();
  const { data, error } = await client
    .from('training_lesson_progress')
    .select('user_id, lesson_id, completed_at')
    .eq('user_id', userId);

  if (error) throw new Error(error.message);
  return (data ?? []) as TrainingLessonProgress[];
}

export async function setLessonCompleted(
  userId: string,
  lessonId: string,
  completed: boolean,
): Promise<void> {
  const client = getClient();
  if (completed) {
    const { error } = await client
      .from('training_lesson_progress')
      .upsert({ user_id: userId, lesson_id: lessonId }, { onConflict: 'user_id,lesson_id' });
    if (error) throw new Error(error.message);
  } else {
    const { error } = await client
      .from('training_lesson_progress')
      .delete()
      .eq('user_id', userId)
      .eq('lesson_id', lessonId);
    if (error) throw new Error(error.message);
  }
}

export async function fetchMyQuizAttempts(userId: string): Promise<TrainingQuizAttempt[]> {
  const client = getClient();
  const { data, error } = await client
    .from('training_quiz_attempts')
    .select('id, user_id, quiz_id, score, answers, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as TrainingQuizAttempt[];
}

// ============================================================================
// Tài liệu & Storage
// ============================================================================

export async function fetchDocumentsByLesson(lessonId: string): Promise<TrainingDocument[]> {
  const client = getClient();
  const { data, error } = await client
    .from('training_documents')
    .select('id, title, description, storage_path, bucket_id, lesson_id, uploaded_by, created_at')
    .eq('lesson_id', lessonId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as TrainingDocument[];
}

export async function fetchLibraryDocuments(): Promise<TrainingDocument[]> {
  const client = getClient();
  const { data, error } = await client
    .from('training_documents')
    .select('id, title, description, storage_path, bucket_id, lesson_id, uploaded_by, created_at')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as TrainingDocument[];
}

export async function getDocumentDownloadUrl(doc: TrainingDocument): Promise<string> {
  const client = getClient();
  if (doc.bucket_id === 'training-public') {
    const { data } = client.storage.from('training-public').getPublicUrl(doc.storage_path);
    return data.publicUrl;
  }

  // Tài liệu gốc bắt buộc dùng signed URL từ bucket private training-documents
  const { data, error } = await client.storage
    .from('training-documents')
    .createSignedUrl(doc.storage_path, 120);

  if (error || !data?.signedUrl) {
    throw new Error(error?.message || 'Không tạo được link tải tài liệu (yêu cầu đăng nhập).');
  }
  return data.signedUrl;
}

// ============================================================================
// Soạn nội dung (Lead & Admin)
// ============================================================================

export async function upsertModule(input: {
  id?: string;
  title: string;
  description: string;
  sort_order: number;
  is_public: boolean;
}): Promise<TrainingModule> {
  const client = getClient();
  const payload = {
    title: input.title.trim(),
    description: input.description.trim(),
    sort_order: Number.isFinite(input.sort_order) ? input.sort_order : 0,
    is_public: Boolean(input.is_public),
  };

  if (input.id) {
    const { data, error } = await client
      .from('training_modules')
      .update(payload)
      .eq('id', input.id)
      .select('id, title, description, sort_order, is_public, created_at')
      .single();
    if (error) throw new Error(error.message);
    return data as TrainingModule;
  }

  const { data, error } = await client
    .from('training_modules')
    .insert(payload)
    .select('id, title, description, sort_order, is_public, created_at')
    .single();
  if (error) throw new Error(error.message);
  return data as TrainingModule;
}

export async function deleteModule(moduleId: string): Promise<void> {
  const client = getClient();
  const { error } = await client.from('training_modules').delete().eq('id', moduleId);
  if (error) throw new Error(error.message);
}

export async function upsertLesson(input: {
  id?: string;
  module_id: string;
  title: string;
  content_md: string;
  video_url?: string | null;
  slides_url?: string | null;
  sort_order: number;
}): Promise<TrainingLesson> {
  const cleanVideo = (input.video_url ?? '').trim() || null;
  const cleanSlides = (input.slides_url ?? '').trim() || null;

  if (!isValidHttpsUrl(cleanVideo)) {
    throw new Error('Link video chỉ được phép bắt đầu bằng https://');
  }
  if (!isValidHttpsUrl(cleanSlides)) {
    throw new Error('Link slide chỉ được phép bắt đầu bằng https://');
  }

  const client = getClient();
  const payload = {
    module_id: input.module_id,
    title: input.title.trim(),
    content_md: input.content_md,
    video_url: cleanVideo,
    slides_url: cleanSlides,
    sort_order: Number.isFinite(input.sort_order) ? input.sort_order : 0,
  };

  if (input.id) {
    const { data, error } = await client
      .from('training_lessons')
      .update(payload)
      .eq('id', input.id)
      .select('id, module_id, title, content_md, video_url, slides_url, sort_order, created_at')
      .single();
    if (error) throw new Error(error.message);
    return data as TrainingLesson;
  }

  const { data, error } = await client
    .from('training_lessons')
    .insert(payload)
    .select('id, module_id, title, content_md, video_url, slides_url, sort_order, created_at')
    .single();
  if (error) throw new Error(error.message);
  return data as TrainingLesson;
}

export async function deleteLesson(lessonId: string): Promise<void> {
  const client = getClient();
  const { error } = await client.from('training_lessons').delete().eq('id', lessonId);
  if (error) throw new Error(error.message);
}

export async function upsertQuizForLesson(input: {
  id?: string;
  lesson_id: string;
  title: string;
  pass_score: number;
}): Promise<TrainingQuiz> {
  const client = getClient();
  const passScore = Math.min(100, Math.max(0, Math.round(input.pass_score)));
  const payload = {
    lesson_id: input.lesson_id,
    title: input.title.trim(),
    pass_score: passScore,
  };

  if (input.id) {
    const { data, error } = await client
      .from('training_quizzes')
      .update(payload)
      .eq('id', input.id)
      .select('id, lesson_id, title, pass_score, created_at')
      .single();
    if (error) throw new Error(error.message);
    return data as TrainingQuiz;
  }

  const { data, error } = await client
    .from('training_quizzes')
    .insert(payload)
    .select('id, lesson_id, title, pass_score, created_at')
    .single();
  if (error) throw new Error(error.message);
  return data as TrainingQuiz;
}

export async function deleteQuiz(quizId: string): Promise<void> {
  const client = getClient();
  const { error } = await client.from('training_quizzes').delete().eq('id', quizId);
  if (error) throw new Error(error.message);
}

export async function fetchQuizForEdit(quizId: string): Promise<TrainingQuizEditPayload> {
  const client = getClient();
  const { data, error } = await client.rpc('training_get_quiz_for_edit', {
    p_quiz_id: quizId,
  });
  if (error) throw new Error(error.message);
  const raw = data as TrainingQuizEditPayload;
  return {
    quiz: raw.quiz,
    questions: (raw.questions ?? []).map(q => ({
      ...q,
      options: Array.isArray(q.options) ? q.options.map(String) : [],
      correct_index: Number(q.correct_index ?? 0),
    })),
  };
}

export async function saveQuizQuestion(input: {
  id?: string | null;
  quiz_id: string;
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
  sort_order: number;
}): Promise<string> {
  const client = getClient();
  const { data, error } = await client.rpc('training_save_quiz_question', {
    p_question_id: input.id ?? null,
    p_quiz_id: input.quiz_id,
    p_question: input.question.trim(),
    p_options: input.options,
    p_correct_index: input.correct_index,
    p_explanation: input.explanation.trim(),
    p_sort_order: input.sort_order,
  });
  if (error) throw new Error(error.message);
  return String(data);
}

export async function deleteQuizQuestion(questionId: string): Promise<void> {
  const client = getClient();
  const { error } = await client.from('training_quiz_questions').delete().eq('id', questionId);
  if (error) throw new Error(error.message);
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/_+/g, '_');
}

export async function uploadDocumentFile(
  file: File,
  metadata: {
    title: string;
    description: string;
    lesson_id: string | null;
    bucket_id: TrainingDocumentBucket;
    uploaded_by: string | null;
  },
): Promise<TrainingDocument> {
  const client = getClient();
  const folder = metadata.lesson_id ? `lessons/${metadata.lesson_id}` : 'library';
  const storagePath = `${folder}/${Date.now()}_${sanitizeFilename(file.name)}`;

  const { error: uploadErr } = await client.storage
    .from(metadata.bucket_id)
    .upload(storagePath, file, { upsert: false });

  if (uploadErr) throw new Error(uploadErr.message);

  const { data, error: dbErr } = await client
    .from('training_documents')
    .insert({
      title: metadata.title.trim() || file.name,
      description: metadata.description.trim(),
      storage_path: storagePath,
      bucket_id: metadata.bucket_id,
      lesson_id: metadata.lesson_id,
      uploaded_by: metadata.uploaded_by,
    })
    .select('id, title, description, storage_path, bucket_id, lesson_id, uploaded_by, created_at')
    .single();

  if (dbErr) {
    await client.storage.from(metadata.bucket_id).remove([storagePath]);
    throw new Error(dbErr.message);
  }

  return data as TrainingDocument;
}

export async function deleteDocument(doc: TrainingDocument): Promise<void> {
  const client = getClient();
  const { error: dbErr } = await client.from('training_documents').delete().eq('id', doc.id);
  if (dbErr) throw new Error(dbErr.message);

  await client.storage.from(doc.bucket_id).remove([doc.storage_path]);
}

// ============================================================================
// Bảng tiến độ cả nhóm (Lead & Admin)
// ============================================================================

export async function fetchLearners(): Promise<TrainingLearner[]> {
  const client = getClient();
  const { data, error } = await client.rpc('training_list_learners');
  if (error) throw new Error(error.message);
  return (data ?? []) as TrainingLearner[];
}

export async function fetchAllLessonProgress(): Promise<TrainingLessonProgress[]> {
  const client = getClient();
  const { data, error } = await client
    .from('training_lesson_progress')
    .select('user_id, lesson_id, completed_at');
  if (error) throw new Error(error.message);
  return (data ?? []) as TrainingLessonProgress[];
}

export async function fetchAllQuizAttempts(): Promise<TrainingQuizAttempt[]> {
  const client = getClient();
  const { data, error } = await client
    .from('training_quiz_attempts')
    .select('id, user_id, quiz_id, score, answers, created_at')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as TrainingQuizAttempt[];
}
