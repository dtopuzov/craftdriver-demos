import { useMutation, useQuery } from '@tanstack/react-query';
import type { TeacherExamDetailResponse, TeacherQuestion } from '@exam/contracts';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../../api.js';
import { queryClient } from '../../queryClient.js';
import {
  type ExamDetails,
  type QuestionDraft,
  type QuestionPayload,
  emptyQuestionDraft,
  optionIdsFromAnswer,
  optionsFromText,
  questionPayload,
  questionToDraft,
  toDateTimeLocal,
} from './questionDraft.js';

export function TeacherExamPage() {
  const { examId = '' } = useParams();
  return <DraftEditor examId={examId} />;
}

export function DraftEditor({ examId }: { examId: string }) {
  const navigate = useNavigate();
  const detail = useQuery({
    queryKey: ['teacher-exam', examId],
    queryFn: () => api<TeacherExamDetailResponse>(`/api/teacher/exams/${examId}`),
  });
  const metadataForm = useForm<ExamDetails>({
    defaultValues: {
      title: '',
      instructions: '',
      durationMinutes: null,
      feedbackPolicy: 'score_only',
      availableFrom: null,
      availableUntil: null,
    },
  });
  const questionForm = useForm<QuestionDraft>({ defaultValues: emptyQuestionDraft });
  const [editingQuestion, setEditingQuestion] = useState<TeacherQuestion>();
  const [statusMessage, setStatusMessage] = useState('');
  const questionKind = questionForm.watch('kind');
  const optionIds = optionsFromText(questionForm.watch('options')).map((option) => option.id);
  const hasUnsavedChanges = metadataForm.formState.isDirty || questionForm.formState.isDirty;

  useEffect(() => {
    if (detail.data && !metadataForm.formState.isDirty)
      metadataForm.reset({
        title: detail.data.exam.title,
        instructions: detail.data.exam.instructions,
        durationMinutes: detail.data.exam.durationMinutes,
        feedbackPolicy: detail.data.exam.feedbackPolicy,
        availableFrom: toDateTimeLocal(detail.data.exam.availableFrom),
        availableUntil: toDateTimeLocal(detail.data.exam.availableUntil),
      });
  }, [detail.data, metadataForm]);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) event.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [hasUnsavedChanges]);

  const resetQuestionForm = () => {
    questionForm.reset(emptyQuestionDraft);
    setEditingQuestion(undefined);
  };
  const confirmLeave = () =>
    !hasUnsavedChanges || window.confirm('Discard unsaved exam or question changes?');

  const saveMetadata = useMutation({
    mutationFn: (value: ExamDetails) =>
      api(`/api/teacher/exams/${examId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          ...value,
          availableFrom: value.availableFrom ? new Date(value.availableFrom).toISOString() : null,
          availableUntil: value.availableUntil ? new Date(value.availableUntil).toISOString() : null,
        }),
      }),
    onSuccess: (_result, value) => {
      metadataForm.reset(value);
      setStatusMessage('Exam details saved.');
      void queryClient.invalidateQueries({ queryKey: ['teacher-exams'] });
    },
  });
  const addQuestion = useMutation({
    mutationFn: (payload: QuestionPayload) =>
      api(`/api/teacher/exams/${examId}/questions`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      resetQuestionForm();
      setStatusMessage('Question added.');
      void detail.refetch();
    },
  });
  const updateQuestion = useMutation({
    mutationFn: ({ questionId, payload }: { questionId: string; payload: QuestionPayload }) =>
      api(`/api/teacher/exams/${examId}/questions/${questionId}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      resetQuestionForm();
      setStatusMessage('Question saved.');
      void detail.refetch();
    },
  });
  const duplicateQuestion = useMutation({
    mutationFn: (questionId: string) =>
      api(`/api/teacher/exams/${examId}/questions/${questionId}/duplicate`, { method: 'POST' }),
    onSuccess: () => {
      setStatusMessage('Question duplicated.');
      void detail.refetch();
    },
  });
  const reorderQuestions = useMutation({
    mutationFn: (questionIds: string[]) =>
      api(`/api/teacher/exams/${examId}/questions/order`, {
        method: 'PUT',
        body: JSON.stringify({ questionIds }),
      }),
    onSuccess: () => {
      setStatusMessage('Question order saved.');
      void detail.refetch();
    },
  });
  const deleteQuestion = useMutation({
    mutationFn: (questionId: string) =>
      api(`/api/teacher/exams/${examId}/questions/${questionId}`, { method: 'DELETE' }),
    onSuccess: (_result, questionId) => {
      if (editingQuestion?.id === questionId) resetQuestionForm();
      setStatusMessage('Question deleted.');
      void detail.refetch();
    },
  });
  const publish = useMutation({
    mutationFn: () => api(`/api/teacher/exams/${examId}/publish`, { method: 'POST' }),
    onSuccess: () => {
      setStatusMessage('Exam published.');
      void detail.refetch();
      void queryClient.invalidateQueries({ queryKey: ['teacher-exams'] });
    },
  });
  const unpublish = useMutation({
    mutationFn: () => api(`/api/teacher/exams/${examId}/unpublish`, { method: 'POST' }),
    onSuccess: () => {
      setStatusMessage('Exam returned to draft.');
      void detail.refetch();
      void queryClient.invalidateQueries({ queryKey: ['teacher-exams'] });
    },
  });

  if (detail.isLoading) return <p>Loading draft...</p>;
  if (detail.error || !detail.data) return <p className="error">Draft unavailable.</p>;

  const { exam, questions } = detail.data;
  const editable = exam.status === 'draft';
  const publishBlockers = [
    ...(questions.length ? [] : ['Add at least one valid auto-gradable question.']),
    ...(metadataForm.formState.isDirty ? ['Save or discard unsaved exam details before publishing.'] : []),
    ...(questionForm.formState.isDirty ? ['Save or discard unsaved question changes before publishing.'] : []),
  ];
  const questionError =
    addQuestion.error ??
    updateQuestion.error ??
    duplicateQuestion.error ??
    reorderQuestions.error ??
    deleteQuestion.error;

  const moveQuestion = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= questions.length) return;
    const questionIds = questions.map((question) => question.id);
    [questionIds[index], questionIds[target]] = [questionIds[target], questionIds[index]];
    reorderQuestions.mutate(questionIds);
  };
  const startEditing = (item: TeacherQuestion) => {
    if (questionForm.formState.isDirty && !window.confirm('Discard unsaved question changes and edit this question instead?'))
      return;
    setEditingQuestion(item);
    questionForm.reset(questionToDraft(item));
  };
  const cancelEditing = () => {
    if (questionForm.formState.isDirty && !window.confirm('Discard unsaved question changes?')) return;
    resetQuestionForm();
  };
  const validateOptions = (value: string) => {
    const options = optionsFromText(value);
    if (options.length < 2) return 'Add at least two non-empty options.';
    const normalized = options.map((option) => option.text.toLocaleLowerCase());
    return new Set(normalized).size === normalized.length || 'Option text must be unique.';
  };
  const validateAnswer = (value: string) => {
    if (questionKind === 'numeric') return Number.isFinite(Number(value)) || 'Enter a finite expected number.';
    const selected = optionIdsFromAnswer(value);
    if (!selected.length) return 'Choose at least one correct option.';
    if (questionKind === 'single_choice' && selected.length !== 1) return 'Choose exactly one correct option.';
    return selected.every((id) => optionIds.includes(id)) || 'Use an option ID shown above.';
  };

  return (
    <section>
      <p>
        <Link
          to="/teacher"
          onClick={(event) => {
            if (!confirmLeave()) event.preventDefault();
          }}
        >
          Back to my exams
        </Link>
      </p>
      <h1>Edit exam</h1>
      <p>Status: {exam.status}</p>
      {statusMessage && <p aria-live="polite">{statusMessage}</p>}

      {editable ? (
        <>
          <form onSubmit={metadataForm.handleSubmit((value) => saveMetadata.mutate(value))}>
            <h2>Exam details</h2>
            <label>
              Title
              <input {...metadataForm.register('title', { required: 'Enter an exam title.' })} />
            </label>
            {metadataForm.formState.errors.title && (
              <p className="error">{metadataForm.formState.errors.title.message}</p>
            )}
            <label>
              Instructions
              <textarea {...metadataForm.register('instructions')} />
            </label>
            <label>
              Duration in minutes (optional)
              <input
                type="number"
                min="1"
                {...metadataForm.register('durationMinutes', {
                  setValueAs: (value) => (value === '' ? null : Number(value)),
                  validate: (value) =>
                    value === null ||
                    (Number.isInteger(value) && value > 0) ||
                    'Use a whole number greater than zero.',
                })}
              />
            </label>
            {metadataForm.formState.errors.durationMinutes && (
              <p className="error">{metadataForm.formState.errors.durationMinutes.message}</p>
            )}
            <label>
              Student feedback
              <select {...metadataForm.register('feedbackPolicy')}>
                <option value="none">No feedback</option>
                <option value="score_only">Score only</option>
                <option value="answers_and_explanations">Answers and explanations</option>
              </select>
            </label>
            <p className="field-hint">
              Choose what learners see after submitting: nothing, their score, or full answer feedback.
            </p>
            <fieldset>
              <legend>Availability (optional)</legend>
              <p className="field-hint">
                Leave both blank to make the published exam available immediately. Times use this browser&apos;s local timezone.
              </p>
              <label>
                Available from
                <input
                  type="datetime-local"
                  {...metadataForm.register('availableFrom', { setValueAs: (value) => value || null })}
                />
              </label>
              <label>
                Available until
                <input
                  type="datetime-local"
                  {...metadataForm.register('availableUntil', {
                    setValueAs: (value) => value || null,
                    validate: (value) => {
                      const availableFrom = metadataForm.getValues('availableFrom');
                      return (
                        !availableFrom ||
                        !value ||
                        new Date(availableFrom).getTime() < new Date(value).getTime() ||
                        'The end time must be after the start time.'
                      );
                    },
                  })}
                />
              </label>
              {metadataForm.formState.errors.availableUntil && (
                <p className="error">{metadataForm.formState.errors.availableUntil.message}</p>
              )}
            </fieldset>
            <button data-testid="save-exam-details" disabled={saveMetadata.isPending} type="submit">
              {saveMetadata.isPending ? 'Saving details...' : 'Save details'}
            </button>
            {saveMetadata.error && (
              <p className="error" role="alert">
                {saveMetadata.error instanceof Error ? saveMetadata.error.message : 'Unable to save exam details.'}
              </p>
            )}
          </form>

          <section>
            <h2>Questions</h2>
            {questions.length ? (
              <ol className="question-list">
                {questions.map((item, index) => (
                  <li key={item.id}>
                    <article>
                      <p>
                        <strong>{item.prompt}</strong>
                      </p>
                      <p>
                        {item.kind.replace('_', ' ')} - {item.points} points
                      </p>
                      {editingQuestion?.id === item.id && <p>Editing this question below.</p>}
                      <div className="inline-actions">
                        <button onClick={() => startEditing(item)} type="button">
                          Edit
                        </button>
                        <button
                          disabled={duplicateQuestion.isPending}
                          onClick={() => duplicateQuestion.mutate(item.id)}
                          type="button"
                        >
                          Duplicate
                        </button>
                        <button
                          disabled={reorderQuestions.isPending || index === 0}
                          onClick={() => moveQuestion(index, -1)}
                          type="button"
                        >
                          Move up
                        </button>
                        <button
                          disabled={reorderQuestions.isPending || index === questions.length - 1}
                          onClick={() => moveQuestion(index, 1)}
                          type="button"
                        >
                          Move down
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`Delete "${item.prompt}"? This cannot be undone.`))
                              deleteQuestion.mutate(item.id);
                          }}
                          disabled={deleteQuestion.isPending}
                          type="button"
                        >
                          Delete
                        </button>
                      </div>
                    </article>
                  </li>
                ))}
              </ol>
            ) : (
              <p>No questions yet. Add one before publishing.</p>
            )}
            {questionError && (
              <p className="error" role="alert">
                {questionError instanceof Error ? questionError.message : 'Unable to save this question.'}
              </p>
            )}
          </section>

          <form
            onSubmit={questionForm.handleSubmit((value) => {
              const payload = questionPayload(value);
              if (editingQuestion) updateQuestion.mutate({ questionId: editingQuestion.id, payload });
              else addQuestion.mutate(payload);
            })}
          >
            <h2>{editingQuestion ? `Edit question ${editingQuestion.position}` : 'Add a question'}</h2>
            <label>
              Type
              <select {...questionForm.register('kind')}>
                <option value="single_choice">Single choice</option>
                <option value="multiple_choice">Multiple choice</option>
                <option value="numeric">Numeric</option>
              </select>
            </label>
            <label>
              Prompt
              <input {...questionForm.register('prompt', { required: 'Enter a question prompt.' })} />
            </label>
            {questionForm.formState.errors.prompt && (
              <p className="error">{questionForm.formState.errors.prompt.message}</p>
            )}
            <label>
              Points
              <input
                type="number"
                min="0"
                {...questionForm.register('points', {
                  valueAsNumber: true,
                  validate: (value) =>
                    (Number.isInteger(value) && value >= 0) || 'Points must be a whole number of zero or more.',
                })}
              />
            </label>
            {questionForm.formState.errors.points && (
              <p className="error">{questionForm.formState.errors.points.message}</p>
            )}
            {questionKind === 'numeric' ? (
              <>
                <label>
                  Expected number
                  <input type="number" step="any" {...questionForm.register('answer', { validate: validateAnswer })} />
                </label>
                {questionForm.formState.errors.answer && (
                  <p className="error">{questionForm.formState.errors.answer.message}</p>
                )}
                <label>
                  Tolerance
                  <input
                    type="number"
                    min="0"
                    step="any"
                    {...questionForm.register('tolerance', {
                      valueAsNumber: true,
                      validate: (value) => (Number.isFinite(value) && value >= 0) || 'Tolerance must be zero or greater.',
                    })}
                  />
                </label>
                {questionForm.formState.errors.tolerance && (
                  <p className="error">{questionForm.formState.errors.tolerance.message}</p>
                )}
              </>
            ) : (
              <>
                <label>
                  Options (one per line)
                  <textarea {...questionForm.register('options', { validate: validateOptions })} />
                </label>
                {questionForm.formState.errors.options && (
                  <p className="error">{questionForm.formState.errors.options.message}</p>
                )}
                {optionIds.length > 0 && <p>Option IDs: {optionIds.join(', ')}</p>}
                <label>
                  Correct option ID{questionKind === 'multiple_choice' ? 's' : ''}
                  <input
                    {...questionForm.register('answer', { validate: validateAnswer })}
                    placeholder={questionKind === 'multiple_choice' ? 'For example: a,c' : 'For example: a'}
                  />
                </label>
                {questionForm.formState.errors.answer && (
                  <p className="error">{questionForm.formState.errors.answer.message}</p>
                )}
              </>
            )}
            <label>
              Explanation (optional; visible only when that feedback policy permits it)
              <textarea {...questionForm.register('explanation')} />
            </label>
            <div className="inline-actions">
              <button
                data-testid={editingQuestion ? 'save-question' : 'add-question'}
                disabled={addQuestion.isPending || updateQuestion.isPending}
                type="submit"
              >
                {editingQuestion ? 'Save question' : 'Add question'}
              </button>
              {editingQuestion && (
                <button onClick={cancelEditing} type="button">
                  Cancel edit
                </button>
              )}
            </div>
          </form>

          <aside className="publish-readiness">
            <h2>Publish readiness</h2>
            {publishBlockers.length ? (
              <ul>
                {publishBlockers.map((blocker) => (
                  <li key={blocker}>{blocker}</li>
                ))}
              </ul>
            ) : (
              <p>
                {questions.length} valid question{questions.length === 1 ? '' : 's'} ready to publish.
              </p>
            )}
            <button
              data-testid="publish-exam"
              disabled={publish.isPending || publishBlockers.length > 0}
              onClick={() => {
                if (window.confirm('Publish this exam? Students can start this immutable revision.'))
                  publish.mutate();
              }}
              type="button"
            >
              {publish.isPending ? 'Publishing...' : 'Publish exam'}
            </button>
            {publish.error && (
              <p className="error" role="alert">
                {publish.error instanceof Error ? publish.error.message : 'Unable to publish this exam.'}
              </p>
            )}
          </aside>
        </>
      ) : (
        <section>
          <p>This revision is live. Unpublish it before making changes; existing attempts remain unchanged.</p>
          <div className="inline-actions">
            <button disabled={unpublish.isPending} onClick={() => unpublish.mutate()} type="button">
              {unpublish.isPending ? 'Returning to draft...' : 'Unpublish and edit'}
            </button>
            <button type="button" onClick={() => navigate(`/teacher/exams/${examId}/results`)}>
              View results
            </button>
          </div>
          {unpublish.error && (
            <p className="error" role="alert">
              {unpublish.error instanceof Error ? unpublish.error.message : 'Unable to unpublish this exam.'}
            </p>
          )}
        </section>
      )}
    </section>
  );
}
