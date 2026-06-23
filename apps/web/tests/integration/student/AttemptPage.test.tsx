import { http, HttpResponse } from 'msw';
import { screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { AttemptPage } from '../../../src/features/student/AttemptPage.js';
import { renderWithProviders } from '../../support/renderWithProviders.js';
import { server } from '../../support/server.js';

const attemptId = '60000000-0000-4000-8000-000000000099';
const choiceKey = '50000000-0000-4000-8000-000000000091';
const numericKey = '50000000-0000-4000-8000-000000000092';

const activeAttempt = {
  attempt: {
    id: attemptId,
    status: 'in_progress',
    score: null,
    maxScore: 5,
    title: 'Foundations of Arithmetic',
    instructions: 'Answer both questions.',
    durationMinutes: 15,
    revisionNumber: 1,
    feedbackPolicy: 'answers_and_explanations',
    answers: {},
    questions: [
      {
        key: choiceKey,
        kind: 'single_choice',
        prompt: 'What is 7 + 5?',
        points: 2,
        config: { options: [{ id: 'c', text: '12' }, { id: 'd', text: '13' }] },
      },
      {
        key: numericKey,
        kind: 'numeric',
        prompt: 'What is the value of 3 x 4?',
        points: 3,
        config: { tolerance: 0 },
      },
    ],
  },
};

function renderAttemptPage() {
  renderWithProviders(
    <Routes>
      <Route path="/student/attempts/:id" element={<AttemptPage />} />
    </Routes>,
    { router: { initialEntries: [`/student/attempts/${attemptId}`] } },
  );
}

describe('AttemptPage', () => {
  it('labels numeric answers and saves the value on blur', async () => {
    const user = userEvent.setup();
    let savedBody: unknown;
    server.use(
      http.get(`/api/student/attempts/${attemptId}`, () => HttpResponse.json(activeAttempt)),
      http.put(`/api/student/attempts/${attemptId}/answers/${numericKey}`, async ({ request }) => {
        savedBody = await request.json();
        return HttpResponse.json({ saved: true });
      }),
    );

    renderAttemptPage();

    const answer = await screen.findByLabelText('Your answer');
    await user.type(answer, '12');
    await user.tab();

    await waitFor(() => expect(savedBody).toEqual({ answer: '12' }));
    expect(await screen.findByText('Answer saved.')).toBeInTheDocument();
  });

  it('keeps an answer visible and offers retry after a save failure', async () => {
    const user = userEvent.setup();
    let attempts = 0;
    server.use(
      http.get(`/api/student/attempts/${attemptId}`, () => HttpResponse.json(activeAttempt)),
      http.put(`/api/student/attempts/${attemptId}/answers/${numericKey}`, () => {
        attempts += 1;
        return attempts === 1
          ? HttpResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'Save failed.' } }, { status: 500 })
          : HttpResponse.json({ saved: true });
      }),
    );

    renderAttemptPage();

    const answer = await screen.findByLabelText('Your answer');
    await user.type(answer, '12');
    await user.tab();
    expect(await screen.findByRole('alert')).toHaveTextContent('We could not save your answer.');

    await user.click(screen.getByRole('button', { name: 'Retry save' }));

    await waitFor(() => expect(attempts).toBe(2));
    expect(await screen.findByText('Answer saved.')).toBeInTheDocument();
    expect(answer).toHaveValue('12');
  });

  it('renders submitted feedback as readable answers rather than raw JSON', async () => {
    server.use(
      http.get(`/api/student/attempts/${attemptId}`, () =>
        HttpResponse.json({
          attempt: {
            ...activeAttempt.attempt,
            status: 'submitted',
            score: 5,
            answers: { [choiceKey]: 'c', [numericKey]: '12' },
            result: {
              score: 5,
              maxScore: 5,
              feedbackPolicy: 'answers_and_explanations',
              questions: [
                {
                  key: choiceKey,
                  isCorrect: true,
                  awardedPoints: 2,
                  correctAnswer: { correctOptionId: 'c' },
                  explanation: 'Seven plus five equals twelve.',
                },
                {
                  key: numericKey,
                  isCorrect: true,
                  awardedPoints: 3,
                  correctAnswer: { expected: 12, tolerance: 0 },
                  explanation: 'Three groups of four equal twelve.',
                },
              ],
            },
          },
        }),
      ),
    );
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    renderAttemptPage();

    expect(await screen.findByText('Question feedback')).toBeInTheDocument();
    expect(
      screen.getAllByText((_content, element) =>
        Boolean(element?.tagName.toLowerCase() === 'p' && element.textContent === 'Correct answer: 12'),
      ).length,
    ).toBeGreaterThan(0);
    expect(screen.queryByText(/correctOptionId/)).not.toBeInTheDocument();
  });
});
