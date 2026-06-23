import { useMutation, useQuery } from '@tanstack/react-query';
import type { StartAttemptResponse, StudentExamsResponse } from '@exam/contracts';
import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { api } from '../../api.js';
import { useMe } from '../../hooks/useMe.js';

export function StudentDashboard() {
  const { data: me } = useMe();
  const navigate = useNavigate();
  const [startingExamId, setStartingExamId] = useState<string>();
  const { data, isLoading, error } = useQuery({
    queryKey: ['student-exams'],
    queryFn: () => api<StudentExamsResponse>('/api/student/exams'),
    enabled: me?.user.role === 'student',
  });
  const start = useMutation({
    mutationFn: (id: string) =>
      api<StartAttemptResponse>(`/api/student/exams/${id}/start`, { method: 'POST' }),
  });

  if (me?.user.role !== 'student') return <Navigate to="/teacher" replace />;
  if (isLoading) return <p>Loading exams...</p>;
  if (error) return <p className="error">Unable to load available exams.</p>;
  if (!data?.exams.length)
    return (
      <section>
        <h1 id="student-dashboard-title">My exams</h1>
        <p>No published exams are available yet.</p>
      </section>
    );

  const openAttempt = async (examId: string) => {
    setStartingExamId(examId);
    try {
      const result = await start.mutateAsync(examId);
      navigate(`/student/attempts/${result.attempt.id}`);
    } finally {
      setStartingExamId(undefined);
    }
  };

  return (
    <section>
      <h1 id="student-dashboard-title">My exams</h1>
      <div className="exam-grid">
        {data.exams.map((exam) => (
          <article data-testid={`exam-card-${exam.id}`} key={exam.id}>
            <h2>{exam.title}</h2>
            <p>{exam.instructions}</p>
            <p>
              <strong>Status:</strong> {exam.status.replace('_', ' ')}
            </p>
            {exam.durationMinutes && (
              <p>
                <strong>Duration:</strong> {exam.durationMinutes} minutes
              </p>
            )}
            {exam.score !== null && (
              <p>
                <strong>Score:</strong> {exam.score}
              </p>
            )}
            {exam.status === 'submitted' ? (
              <button
                aria-label={`View result for ${exam.title}`}
                disabled={!exam.attemptId}
                onClick={() => exam.attemptId && navigate(`/student/attempts/${exam.attemptId}`)}
              >
                View result
              </button>
            ) : exam.status === 'expired' ? (
              <p className="error">This attempt has expired.</p>
            ) : (
              <button
                aria-label={`${exam.status === 'in_progress' ? 'Continue' : 'Start'} ${exam.title}`}
                disabled={start.isPending && startingExamId === exam.id}
                onClick={() => void openAttempt(exam.id)}
              >
                {exam.status === 'in_progress' ? 'Continue exam' : 'Start exam'}
              </button>
            )}
            {start.error && startingExamId === exam.id && (
              <p className="error" role="alert">
                {start.error instanceof Error ? start.error.message : 'Unable to start this exam.'}
              </p>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
