import { useCallback, useEffect, useState } from 'react';
import { TrainingLesson, TrainingModule, TrainingQuiz } from '../types';
import { fetchAllLessons, fetchAllQuizzes, fetchModules } from '../services/trainingApi';

export function useModules() {
  const [modules, setModules] = useState<TrainingModule[]>([]);
  const [lessons, setLessons] = useState<TrainingLesson[]>([]);
  const [quizzes, setQuizzes] = useState<TrainingQuiz[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [mods, less, quizList] = await Promise.all([
        fetchModules(),
        fetchAllLessons(),
        fetchAllQuizzes(),
      ]);
      setModules(mods);
      setLessons(less);
      setQuizzes(quizList);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải danh sách module.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { modules, lessons, quizzes, loading, error, reload };
}
