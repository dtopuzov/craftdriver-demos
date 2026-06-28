import { useMutation, useQuery } from '@tanstack/react-query';
import type { AttemptResponse, QuestionPresentation } from '@exam/contracts';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../../api.js';
import { queryClient } from '../../queryClient.js';
import {
  choiceOptions,
  formatAnswer,
  formatCorrectAnswer,
  multipleChoiceValues,
  numericAnswerValue,
  singleChoiceValue,
} from './answerFormatting.js';

function answerIsBlank(answer: unknown) {
  return answer === undefined || answer === '' || (Array.isArray(answer) && answer.length === 0);
}

function QuestionInput({
  question,
  answer,
  onSave,
}: {
  question: QuestionPresentation;
  answer: unknown;
  onSave: (answer: unknown) => void;
}) {
  const inputId = `answer-${question.key}`;
  const options = choiceOptions(question);

  if (question.kind === 'numeric')
    return (
      <div className="answer-field">
        <label htmlFor={inputId}>Your answer</label>
        <input
          id={inputId}
          inputMode="decimal"
          defaultValue={numericAnswerValue(answer)}
          onBlur={(event) => onSave(event.target.value)}
        />
      </div>
    );

  return (
    <fieldset>
      <legend>Your answer</legend>
      {options.map((option) => {
        const checked =
          question.kind === 'multiple_choice'
            ? multipleChoiceValues(answer).includes(option.id)
            : singleChoiceValue(answer) === option.id;
        return (
          <label key={option.id}>
            <input
              type={question.kind === 'multiple_choice' ? 'checkbox' : 'radio'}
              name={question.key}
              value={option.id}
              checked={checked}
              onChange={(event) => {
                if (question.kind === 'multiple_choice') {
                  const current = multipleChoiceValues(answer);
                  onSave(
                    event.target.checked
                      ? [...new Set([...current, option.id])]
                      : current.filter((id) => id !== option.id),
                  );
                  return;
                }
                onSave(event.target.value);
              }}
            />
            {option.text}
          </label>
        );
      })}
    </fieldset>
  );
}

export function AttemptPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const attempt = useQuery({
    queryKey: ['attempt', id],
    queryFn: () => api<AttemptResponse>(`/api/student/attempts/${id}`),
  });
  const save = useMutation({
    mutationFn: ({ key, answer }: { key: string; answer: unknown }) =>
      api(`/api/student/attempts/${id}/answers/${key}`, {
        method: 'PUT',
        body: JSON.stringify({ answer }),
      }),
  });
  const submit = useMutation({
    mutationFn: () => api(`/api/student/attempts/${id}/submit`, { method: 'POST' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['student-exams'] });
      navigate('/student');
    },
  });
  const [draftAnswers, setDraftAnswers] = useState<Record<string, unknown>>({});
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [failedSave, setFailedSave] = useState<{ key: string; answer: unknown }>();
  const [reviewOpen, setReviewOpen] = useState(false);

  const persistAnswer = async (key: string, answer: unknown) => {
    setDraftAnswers((answers) => ({ ...answers, [key]: answer }));
    setSaveStatus('saving');
    setFailedSave(undefined);
    try {
      await save.mutateAsync({ key, answer });
      setSaveStatus('saved');
    } catch {
      setSaveStatus('error');
      setFailedSave({ key, answer });
    }
  };

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (saveStatus === 'saving' || saveStatus === 'error') event.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [saveStatus]);

  if (attempt.isLoading) return <p>Loading attempt...</p>;
  if (attempt.error || !attempt.data) return <p className="error">Attempt unavailable.</p>;

  const data = attempt.data.attempt;
  const answerFor = (key: string) => draftAnswers[key] ?? data.answers[key];
  const unanswered = data.questions.filter((question) => answerIsBlank(answerFor(question.key))).length;
  const submitted = data.status === 'submitted';

  return (
    <section>
      <h1>
        {submitted ? 'Exam result' : 'Exam attempt'}: {data.title ?? 'Exam'}
      </h1>
      <p>
        {data.revisionNumber ? `Revision ${data.revisionNumber}` : 'Current revision'}
        {data.durationMinutes ? ` - ${data.durationMinutes} minutes` : ''}
      </p>
      {data.instructions && <p>{data.instructions}</p>}

      {submitted ? (
        <>
          {data.feedbackPolicy === 'none' ? (
            <p>Your exam was submitted successfully. Your teacher will share feedback when it is available.</p>
          ) : (
            <>
              <p>
                <strong>Score:</strong> {data.result?.score} / {data.result?.maxScore}
              </p>
              {data.result?.feedbackPolicy === 'answers_and_explanations' && (
                <section>
                  <h2>Question feedback</h2>
                  {data.questions.map((question) => {
                    const feedback = data.result?.questions?.find((item) => item.key === question.key);
                    return (
                      <article key={question.key}>
                        <h3>{question.prompt}</h3>
                        <p>
                          {feedback?.isCorrect ? 'Correct' : 'Not correct'} -{' '}
                          {feedback?.awardedPoints ?? 0} points
                        </p>
                        <p>
                          <strong>Your answer:</strong> {formatAnswer(question, data.answers[question.key])}
                        </p>
                        {feedback && (
                          <p>
                            <strong>Correct answer:</strong>{' '}
                            {formatCorrectAnswer(question, feedback.correctAnswer)}
                          </p>
                        )}
                        {feedback?.explanation && <p>{feedback.explanation}</p>}
                      </article>
                    );
                  })}
                </section>
              )}
            </>
          )}
          <button onClick={() => navigate('/student')}>Back to my exams</button>
        </>
      ) : (
        <>
          <p aria-live="polite">
            {saveStatus === 'saving'
              ? 'Saving your answer...'
              : saveStatus === 'saved'
                ? 'Answer saved.'
                : 'Answers save automatically.'}
          </p>
          {saveStatus === 'error' && failedSave && (
            <p className="error" role="alert">
              We could not save your answer.{' '}
              <button onClick={() => void persistAnswer(failedSave.key, failedSave.answer)}>
                Retry save
              </button>
            </p>
          )}
          <p>
            {unanswered
              ? `${unanswered} question${unanswered === 1 ? '' : 's'} still unanswered.`
              : 'All questions answered. Ready to submit.'}
          </p>
          <button onClick={() => setReviewOpen((open) => !open)}>
            {reviewOpen ? 'Hide review' : 'Review questions'}
          </button>
          {reviewOpen && (
            <nav aria-label="Question review">
              <ul>
                {data.questions.map((question, index) => (
                  <li key={question.key}>
                    <button
                      onClick={() =>
                        document
                          .getElementById(`question-${question.key}`)
                          ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                      }
                    >
                      Question {index + 1}: {answerIsBlank(answerFor(question.key)) ? 'Unanswered' : 'Answered'}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
          )}
          {data.questions.map((question) => (
            <article data-testid={`question-${question.key}`} id={`question-${question.key}`} key={question.key}>
              <h2>{question.prompt}</h2>
              {question.points !== undefined && <p>{question.points} points</p>}
              <QuestionInput
                question={question}
                answer={answerFor(question.key)}
                onSave={(answer) => void persistAnswer(question.key, answer)}
              />
            </article>
          ))}
          <button
            disabled={submit.isPending || saveStatus === 'saving' || saveStatus === 'error'}
            onClick={() => {
              if (window.confirm('Submit this attempt? You cannot change it afterwards.')) submit.mutate();
            }}
          >
            {submit.isPending ? 'Submitting...' : 'Submit attempt'}
          </button>
          {submit.error && (
            <p className="error" role="alert">
              {submit.error instanceof Error ? submit.error.message : 'We could not submit your exam. Please try again.'}
            </p>
          )}
        </>
      )}
    </section>
  );
}
