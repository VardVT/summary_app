import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { TrainingLessonProgress, TrainingQuizAttempt } from '../types';
import {
  fetchMyLessonProgress,
  fetchMyQuizAttempts,
  getRealSupabaseUserId,
  setLessonCompleted,
} from '../services/trainingApi';

export function useProgress(canSaveProgress: boolean) {
  const { user } = useAuth();
  const [lessonProgress, setLessonProgress] = useState<TrainingLessonProgress[]>([]);
  const [quizAttempts, setQuizAttempts] = useState<TrainingQuizAttempt[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [savingLessonId, setSavingLessonId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!canSaveProgress || !user?.id) {
      // Guest không lưu tiến độ và không gọi API tiến độ
      setLessonProgress([]);
      setQuizAttempts([]);
      setLoading(false);
      return;
    }

    const realUid = await getRealSupabaseUserId();
    if (!realUid) {
      setLessonProgress([]);
      setQuizAttempts([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [prog, attempts] = await Promise.all([
        fetchMyLessonProgress(realUid),
        fetchMyQuizAttempts(realUid),
      ]);
      setLessonProgress(prog);
      setQuizAttempts(attempts);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải tiến độ học tập.');
    } finally {
      setLoading(false);
    }
  }, [canSaveProgress, user?.id]);

  useEffect(() => {
    reload();
  }, [reload]);

  const completedLessonIds = useMemo(
    () => new Set(lessonProgress.map(p => p.lesson_id)),
    [lessonProgress],
  );

  const latestAttemptByQuizId = useMemo(() => {
    const map = new Map<string, TrainingQuizAttempt>();
    for (const attempt of quizAttempts) {
      if (!map.has(attempt.quiz_id)) {
        map.set(attempt.quiz_id, attempt);
      }
    }
    return map;
  }, [quizAttempts]);

  const toggleLessonComplete = useCallback(
    async (lessonId: string) => {
      if (!canSaveProgress) return;
      const realUid = await getRealSupabaseUserId();
      if (!realUid) {
        setError('Phiên đăng nhập Supabase chưa sẵn sàng để lưu tiến độ.');
        return;
      }

      const nextCompleted = !completedLessonIds.has(lessonId);
      setSavingLessonId(lessonId);
      setError(null);
      try {
        await setLessonCompleted(realUid, lessonId, nextCompleted);
        await reload();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Không thể cập nhật tiến độ bài học.');
      } finally {
        setSavingLessonId(null);
      }
    },
    [canSaveProgress, completedLessonIds, reload],
  );

  return {
    lessonProgress,
    quizAttempts,
    completedLessonIds,
    latestAttemptByQuizId,
    loading,
    savingLessonId,
    error,
    reload,
    toggleLessonComplete,
  };
}
