import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { LoginForm, RegistrationForm } from '../../src/features/auth/AuthForms.js';

const student = {
  id: '20000000-0000-4000-8000-000000000099',
  displayName: 'Jamie Learner',
  email: 'jamie@example.test',
  role: 'student' as const,
};

describe('LoginForm', () => {
  it('validates input before calling the authentication callback', async () => {
    const user = userEvent.setup();
    const onAuthenticate = vi.fn();
    render(<LoginForm onAuthenticate={onAuthenticate} onSuccess={vi.fn()} />);

    await user.type(screen.getByLabelText('Email'), 'not-an-email');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('Invalid email')).toBeInTheDocument();
    expect(onAuthenticate).not.toHaveBeenCalled();
  });

  it('reports an authentication error accessibly', async () => {
    const user = userEvent.setup();
    const onAuthenticate = vi.fn().mockRejectedValue(new Error('Incorrect email or password.'));
    render(<LoginForm onAuthenticate={onAuthenticate} onSuccess={vi.fn()} />);

    await user.type(screen.getByLabelText('Email'), student.email);
    await user.type(screen.getByLabelText('Password'), 'incorrect-password');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Incorrect email or password.');
  });

  it('submits normalized credentials and reports a successful authentication', async () => {
    const user = userEvent.setup();
    const onAuthenticate = vi.fn().mockResolvedValue(student);
    const onSuccess = vi.fn();
    render(<LoginForm onAuthenticate={onAuthenticate} onSuccess={onSuccess} />);

    await user.type(screen.getByLabelText('Email'), '  JAMIE@EXAMPLE.TEST ');
    await user.type(screen.getByLabelText('Password'), 'correct-password');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith(student));
    expect(onAuthenticate).toHaveBeenCalledWith({ email: student.email, password: 'correct-password' });
  });
});

describe('RegistrationForm', () => {
  it('does not register when password confirmation differs', async () => {
    const user = userEvent.setup();
    const onRegister = vi.fn();
    render(<RegistrationForm onRegister={onRegister} onSuccess={vi.fn()} />);

    await user.type(screen.getByLabelText('Learner’s name'), student.displayName);
    await user.type(screen.getByLabelText('Email'), student.email);
    await user.type(screen.getByLabelText('Password'), 'learning-2026');
    await user.type(screen.getByLabelText('Confirm password'), 'different-password');
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByText('Passwords do not match.')).toBeInTheDocument();
    expect(onRegister).not.toHaveBeenCalled();
  });

  it('registers a valid learner and calls the success handler', async () => {
    const user = userEvent.setup();
    const onRegister = vi.fn().mockResolvedValue(student);
    const onSuccess = vi.fn();
    render(<RegistrationForm onRegister={onRegister} onSuccess={onSuccess} />);

    await user.type(screen.getByLabelText('Learner’s name'), student.displayName);
    await user.type(screen.getByLabelText('Email'), student.email);
    await user.type(screen.getByLabelText('Password'), 'learning-2026');
    await user.type(screen.getByLabelText('Confirm password'), 'learning-2026');
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith(student));
    expect(onRegister).toHaveBeenCalledWith({
      displayName: student.displayName,
      email: student.email,
      password: 'learning-2026',
    });
  });
});
