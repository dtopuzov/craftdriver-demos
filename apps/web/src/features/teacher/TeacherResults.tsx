import { useQuery } from '@tanstack/react-query';
import type { TeacherAttemptDetailResponse, TeacherResultsResponse } from '@exam/contracts';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../api.js';

function formatDate(value: string | Date | null) {
  return value ? new Date(value).toLocaleString() : '-';
}

function formatUnknownAnswer(answer: unknown): string {
  if (answer === undefined || answer === null || answer === '') return 'No answer';
  if (typeof answer === 'string' || typeof answer === 'number' || typeof answer === 'boolean')
    return String(answer);
  if (Array.isArray(answer)) return answer.map(formatUnknownAnswer).join(', ');
  if (typeof answer === 'object') {
    if ('selectedOptionId' in answer) return formatUnknownAnswer(answer.selectedOptionId);
    if ('selectedOptionIds' in answer) return formatUnknownAnswer(answer.selectedOptionIds);
    if ('value' in answer) return formatUnknownAnswer(answer.value);
    if ('expected' in answer) return formatUnknownAnswer(answer.expected);
  }
  return JSON.stringify(answer);
}

export function TeacherResultsPage() {
  const { examId = '' } = useParams();
  return <TeacherResults examId={examId} />;
}

export function TeacherResults({ examId }: { examId: string }) {
  const [attemptId, setAttemptId] = useState<string>();
  const results = useQuery({
    queryKey: ['teacher-results', examId],
    queryFn: () => api<TeacherResultsResponse>(`/api/teacher/exams/${examId}/results`),
  });
  const detail = useQuery({
    queryKey: ['teacher-attempt', attemptId],
    queryFn: () => api<TeacherAttemptDetailResponse>(`/api/teacher/attempts/${attemptId}`),
    enabled: Boolean(attemptId),
  });

  if (results.isLoading) return <p>Loading results...</p>;
  if (results.error) return <p className="error">Unable to load results.</p>;

  return (
    <section>
      <p>
        <Link to={`/teacher/exams/${examId}`}>Back to exam</Link>
      </p>
      <h1>Exam results</h1>
      {results.data?.results.length ? (
        <table>
          <thead>
            <tr>
              <th>Student</th>
              <th>Status</th>
              <th>Revision</th>
              <th>Score</th>
              <th>Started</th>
              <th>Submitted</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {results.data.results.map((result) => (
              <tr data-testid={`result-row-${result.id}`} key={result.id}>
                <td>{result.studentName}</td>
                <td>{result.status.replace('_', ' ')}</td>
                <td>{result.revisionNumber}</td>
                <td>
                  {result.score ?? '-'} / {result.maxScore}
                </td>
                <td>{formatDate(result.startedAt)}</td>
                <td>{formatDate(result.submittedAt)}</td>
                <td>
                  <button
                    aria-label={`View attempt for ${result.studentName}`}
                    onClick={() => setAttemptId(result.id)}
                  >
                    View attempt
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>No students have started this exam yet.</p>
      )}

      {detail.isLoading && <p>Loading attempt detail...</p>}
      {detail.error && <p className="error">Unable to load this attempt.</p>}
      {detail.data && (
        <article>
          <h2>{detail.data.attempt.studentName}&apos;s attempt</h2>
          <p>
            <strong>{detail.data.attempt.title}</strong> - Revision {detail.data.attempt.revisionNumber}
          </p>
          <p>
            {detail.data.attempt.score ?? '-'} / {detail.data.attempt.maxScore} -{' '}
            {detail.data.attempt.status.replace('_', ' ')}
          </p>
          <p>
            Started {formatDate(detail.data.attempt.startedAt)}
            {detail.data.attempt.submittedAt ? ` - Submitted ${formatDate(detail.data.attempt.submittedAt)}` : ''}
          </p>
          <ol className="question-list">
            {detail.data.attempt.questions.map((question) => (
              <li key={question.key}>
                <article>
                  <h3>{question.prompt}</h3>
                  <p>
                    <strong>Answer:</strong> {formatUnknownAnswer(question.answer)}
                  </p>
                  <p>
                    {question.isCorrect === null ? 'Not graded yet' : question.isCorrect ? 'Correct' : 'Incorrect'} -{' '}
                    {question.awardedPoints ?? 0} / {question.points} points
                  </p>
                </article>
              </li>
            ))}
          </ol>
        </article>
      )}
    </section>
  );
}
