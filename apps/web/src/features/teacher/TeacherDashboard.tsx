import { useMutation, useQuery } from '@tanstack/react-query';
import type { TeacherExamResponse, TeacherExamsResponse } from '@exam/contracts';
import { useForm } from 'react-hook-form';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { api } from '../../api.js';
import { useMe } from '../../hooks/useMe.js';

export function TeacherDashboard() {
  const { data } = useMe();
  const navigate = useNavigate();
  const exams = useQuery({
    queryKey: ['teacher-exams'],
    queryFn: () => api<TeacherExamsResponse>('/api/teacher/exams'),
    enabled: data?.user.role !== 'student',
  });
  const form = useForm<{ title: string }>({ defaultValues: { title: '' } });
  const create = useMutation({
    mutationFn: (title: string) =>
      api<TeacherExamResponse>('/api/teacher/exams', {
        method: 'POST',
        body: JSON.stringify({ title }),
      }),
    onSuccess: ({ exam }) => {
      form.reset();
      void exams.refetch();
      navigate(`/teacher/exams/${exam.id}`);
    },
  });

  if (data?.user.role === 'student') return <Navigate to="/student" replace />;

  return (
    <section>
      <h1>Teacher area</h1>
      <form onSubmit={form.handleSubmit(({ title }) => create.mutate(title))}>
        <label>
          New draft title
          <input {...form.register('title', { required: 'Enter a title for the draft.' })} />
        </label>
        {form.formState.errors.title && <p className="error">{form.formState.errors.title.message}</p>}
        <button data-testid="create-draft" disabled={create.isPending}>
          {create.isPending ? 'Creating draft...' : 'Create draft'}
        </button>
        {create.error && (
          <p className="error" role="alert">
            {create.error instanceof Error ? create.error.message : 'Unable to create this draft.'}
          </p>
        )}
      </form>

      <h2>Your exams</h2>
      {exams.isLoading ? (
        <p>Loading...</p>
      ) : exams.error ? (
        <p className="error">Unable to load your exams.</p>
      ) : exams.data?.exams.length ? (
        <ul>
          {exams.data.exams.map((exam) => (
            <li key={exam.id}>
              <Link to={`/teacher/exams/${exam.id}`}>
                {exam.title} - {exam.status}
              </Link>{' '}
              <Link to={`/teacher/exams/${exam.id}/results`}>Results</Link>
            </li>
          ))}
        </ul>
      ) : (
        <p>No exams yet. Create a draft to get started.</p>
      )}
    </section>
  );
}
