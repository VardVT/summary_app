import { useCallback, useEffect, useState } from 'react';
import { TrainingDocument, TrainingLesson, TrainingQuiz } from '../types';
import {
  fetchDocumentsByLesson,
  fetchLessonById,
  fetchQuizByLesson,
} from '../services/trainingApi';

export function useLesson(lessonId: string | null) {
  const [lesson, setLesson] = useState<TrainingLesson | null>(null);
  const [documents, setDocuments] = useState<TrainingDocument[]>([]);
  const [quiz, setQuiz] = useState<TrainingQuiz | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(lessonId));
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!lessonId) {
      setLesson(null);
      setDocuments([]);
      setQuiz(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [lessonData, docsData, quizData] = await Promise.all([
        fetchLessonById(lessonId),
        fetchDocumentsByLesson(lessonId),
        fetchQuizByLesson(lessonId),
      ]);
      setLesson(lessonData);
      setDocuments(docsData);
      setQuiz(quizData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải chi tiết bài học.');
    } finally {
      setLoading(false);
    }
  }, [lessonId]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { lesson, documents, quiz, loading, error, reload };
}
