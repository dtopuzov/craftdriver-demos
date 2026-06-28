import { http, HttpResponse } from 'msw';
import { screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { DraftEditor } from '../../../src/features/teacher/DraftEditor.js';
import { TeacherDashboard } from '../../../src/features/teacher/TeacherDashboard.js';
import { renderWithProviders } from '../../support/renderWithProviders.js';
import { server } from '../../support/server.js';

const examId = '30000000-0000-4000-8000-000000000099';
const questionId = '50000000-0000-4000-8000-000000000099';
const teacher = {
  id: '10000000-0000-4000-8000-000000000001',
  email: 'teacher@example.test',
  displayName: 'Taylor Teacher',
  role: 'teacher',
};

const examDetail = {
  exam: {
    id: examId,
    title: 'Sets and Factors - Draft',
    instructions: 'Choose every factor of 12.',
    status: 'draft',
    durationMinutes: 10,
    feedbackPolicy: 'score_only',
    availableFrom: null,
    availableUntil: null,
  },
  questions: [
    {
      id: questionId,
      position: 1,
      kind: 'multiple_choice',
      prompt: 'Which of these are factors of 12?',
      points: 3,
      config: {
        options: [
          { id: 'a', text: '2' },
          { id: 'b', text: '3' },
          { id: 'c', text: '5' },
        ],
      },
      answer: { correctOptionIds: ['a', 'b'] },
      explanation: '2 and 3 divide 12 without a remainder.',
    },
  ],
};

describe('teacher workflow UI', () => {
  it('uses route links for editing and results from the teacher dashboard', async () => {
    server.use(
      http.get('/api/me', () => HttpResponse.json({ user: teacher })),
      http.get('/api/teacher/exams', () =>
        HttpResponse.json({
          exams: [examDetail.exam],
        }),
      ),
    );

    renderWithProviders(<TeacherDashboard />);

    expect(await screen.findByRole('link', { name: 'Sets and Factors - Draft - draft' })).toHaveAttribute(
      'href',
      `/teacher/exams/${examId}`,
    );
    expect(screen.getByRole('link', { name: 'Results' })).toHaveAttribute(
      'href',
      `/teacher/exams/${examId}/results`,
    );
  });

  it('creates a draft and routes to its editor', async () => {
    const user = userEvent.setup();
    server.use(
      http.get('/api/me', () => HttpResponse.json({ user: teacher })),
      http.get('/api/teacher/exams', () => HttpResponse.json({ exams: [] })),
      http.post('/api/teacher/exams', async ({ request }) => {
        expect(await request.json()).toEqual({ title: 'Smoke numeric exam' });
        return HttpResponse.json({ exam: { ...examDetail.exam, title: 'Smoke numeric exam' } });
      }),
    );

    renderWithProviders(
      <Routes>
        <Route path="/teacher" element={<TeacherDashboard />} />
        <Route path="/teacher/exams/:examId" element={<p>Editor route reached</p>} />
      </Routes>,
      { router: { initialEntries: ['/teacher'] } },
    );

    await user.type(await screen.findByLabelText('New draft title'), 'Smoke numeric exam');
    await user.click(screen.getByRole('button', { name: 'Create draft' }));

    expect(await screen.findByText('Editor route reached')).toBeInTheDocument();
  });

  it('validates draft question options before calling the API', async () => {
    const user = userEvent.setup();
    let posted = false;
    server.use(
      http.get(`/api/teacher/exams/${examId}`, () => HttpResponse.json(examDetail)),
      http.post(`/api/teacher/exams/${examId}/questions`, () => {
        posted = true;
        return HttpResponse.json({});
      }),
    );

    renderWithProviders(<DraftEditor examId={examId} />);

    await user.clear(await screen.findByLabelText('Prompt'));
    await user.type(screen.getByLabelText('Prompt'), 'Only one option question');
    await user.clear(screen.getByLabelText('Options (one per line)'));
    await user.type(screen.getByLabelText('Options (one per line)'), 'Only option');
    await user.click(screen.getByRole('button', { name: 'Add question' }));

    expect(await screen.findByText('Add at least two non-empty options.')).toBeInTheDocument();
    await waitFor(() => expect(posted).toBe(false));
  });
});
