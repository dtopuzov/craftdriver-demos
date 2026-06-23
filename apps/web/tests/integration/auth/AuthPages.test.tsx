import { http, HttpResponse } from 'msw';
import { screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { LoginPage, RegistrationPage } from '../../../src/features/auth/AuthPages.js';
import { renderWithProviders } from '../../support/renderWithProviders.js';
import { server } from '../../support/server.js';

const student = {
  id: '20000000-0000-4000-8000-000000000099',
  displayName: 'Jamie Learner',
  email: 'jamie@example.test',
  role: 'student' as const,
};

describe('authentication pages', () => {
  it('submits the login form through the REST boundary and returns the authenticated user', async () => {
    const user = userEvent.setup();
    const onAuthenticated = vi.fn();
    server.use(
      http.post('/api/auth/login', async ({ request }) => {
        expect(await request.json()).toEqual({ email: student.email, password: 'learning-2026' });
        return HttpResponse.json({ user: student });
      }),
    );
    renderWithProviders(<LoginPage onAuthenticated={onAuthenticated} />);

    await user.type(screen.getByLabelText('Email'), student.email);
    await user.type(screen.getByLabelText('Password'), 'learning-2026');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => expect(onAuthenticated).toHaveBeenCalledWith(student));
  });

  it('renders an API registration error in the accessible form error region', async () => {
    const user = userEvent.setup();
    server.use(
      http.post('/api/auth/register', () =>
        HttpResponse.json(
          { error: { code: 'VALIDATION_ERROR', message: 'An account with this email already exists.' } },
          { status: 400 },
        ),
      ),
    );
    renderWithProviders(<RegistrationPage onAuthenticated={vi.fn()} />);

    await user.type(screen.getByLabelText('Learner’s name'), student.displayName);
    await user.type(screen.getByLabelText('Email'), student.email);
    await user.type(screen.getByLabelText('Password'), 'learning-2026');
    await user.type(screen.getByLabelText('Confirm password'), 'learning-2026');
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('An account with this email already exists.');
  });
});
