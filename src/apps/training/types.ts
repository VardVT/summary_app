import { UserRole } from '../../types';

export type TrainingDocumentBucket = 'training-documents' | 'training-public';

export interface TrainingModule {
  id: string;
  title: string;
  description: string;
  sort_order: number;
  is_public: boolean;
  created_at: string;
}

export interface TrainingLesson {
  id: string;
  module_id: string;
  title: string;
  content_md: string;
  video_url: string | null;
  slides_url: string | null;
  sort_order: number;
  created_at: string;
}

export interface TrainingQuiz {
  id: string;
  lesson_id: string;
  title: string;
  pass_score: number;
  created_at: string;
}

export interface TrainingQuizQuestion {
  id: string;
  quiz_id: string;
  question: string;
  options: string[];
  explanation: string;
  sort_order: number;
}

export interface TrainingQuizQuestionEditable extends TrainingQuizQuestion {
  correct_index: number;
}

export interface TrainingQuizAnswerSubmission {
  question_id: string;
  selected_index: number;
}

export interface TrainingQuizQuestionResult {
  question_id: string;
  selected_index: number | null;
  is_correct: boolean;
  correct_index: number;
  explanation: string;
}

export interface TrainingQuizGradeResponse {
  quiz_id: string;
  score: number;
  pass_score: number;
  passed: boolean;
  total_questions: number;
  correct_count: number;
  saved: boolean;
  results: TrainingQuizQuestionResult[];
}

export interface TrainingQuizAttempt {
  id: string;
  user_id: string;
  quiz_id: string;
  score: number;
  answers: TrainingQuizAnswerSubmission[];
  created_at: string;
}

export interface TrainingLessonProgress {
  user_id: string;
  lesson_id: string;
  completed_at: string;
}

export interface TrainingDocument {
  id: string;
  title: string;
  description: string;
  storage_path: string;
  bucket_id: TrainingDocumentBucket;
  lesson_id: string | null;
  uploaded_by: string | null;
  created_at: string;
}

export interface TrainingLearner {
  id: string;
  display_name: string;
  email: string;
  role: UserRole;
  employee_id: string;
}

export interface TrainingPermissions {
  role: UserRole;
  isGuest: boolean;
  hasRealSupabaseSession: boolean;
  canEdit: boolean;
  canViewAllProgress: boolean;
  canViewDocuments: boolean;
  canSaveProgress: boolean;
}

export type TrainingRouteView =
  | 'home'
  | 'modules'
  | 'module'
  | 'lesson'
  | 'quiz'
  | 'documents'
  | 'editor'
  | 'progress';

export interface TrainingQuizEditPayload {
  quiz: TrainingQuiz;
  questions: TrainingQuizQuestionEditable[];
}
