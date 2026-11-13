import { useCallback, useEffect, useState } from 'react';
import {
  TrainingQuiz,
  TrainingQuizAnswerSubmission,
  TrainingQuizGradeResponse,
  TrainingQuizQuestion,
} from '../types';
import { fetchQuizById, fetchQuizQuestions, gradeQuiz } from '../services/trainingApi';

export function useQuiz(quizId: string | null, onSavedAttempt?: () => void) {
  const [quiz, setQuiz] = useState<TrainingQuiz | null>(null);
  const [questions, setQuestions] = useState<TrainingQuizQuestion[]>([]);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [gradeResult, setGradeResult] = useState<TrainingQuizGradeResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(quizId));
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!quizId) {
      setQuiz(null);
      setQuestions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setSelectedAnswers({});
    setGradeResult(null);

    try {
      const [quizData, questionList] = await Promise.all([
        fetchQuizById(quizId),
        fetchQuizQuestions(quizId),
      ]);
      setQuiz(quizData);
      setQuestions(questionList);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải bài quiz.');
    } finally {
      setLoading(false);
    }
  }, [quizId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const selectOption = useCallback((questionId: string, optionIndex: number) => {
    setSelectedAnswers(prev => ({ ...prev, [questionId]: optionIndex }));
  }, []);

  const submitQuiz = useCallback(async () => {
    if (!quizId) return;
    setSubmitting(true);
    setError(null);
    try {
      const payload: TrainingQuizAnswerSubmission[] = questions
        .filter(q => selectedAnswers[q.id] !== undefined)
        .map(q => ({
          question_id: q.id,
          selected_index: selectedAnswers[q.id],
        }));

      const result = await gradeQuiz(quizId, payload);
      setGradeResult(result);
      if (result.saved && onSavedAttempt) {
        onSavedAttempt();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể chấm bài quiz.');
    } finally {
      setSubmitting(false);
    }
  }, [quizId, questions, selectedAnswers, onSavedAttempt]);

  const resetQuiz = useCallback(() => {
    setSelectedAnswers({});
    setGradeResult(null);
    setError(null);
  }, []);

  return {
    quiz,
    questions,
    selectedAnswers,
    gradeResult,
    loading,
    submitting,
    error,
    selectOption,
    submitQuiz,
    resetQuiz,
    reload,
  };
}
