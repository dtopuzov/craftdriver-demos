import { zodResolver } from '@hookform/resolvers/zod';
import {
  loginRequestSchema,
  registrationRequestSchema,
  type CurrentUser,
  type LoginRequest,
  type RegistrationRequest,
} from '@exam/contracts';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

type LoginFormProps = {
  onAuthenticate: (input: LoginRequest) => Promise<CurrentUser>;
  onSuccess: (user: CurrentUser) => void;
};

export function LoginForm({ onAuthenticate, onSuccess }: LoginFormProps) {
  const form = useForm<LoginRequest>({
    resolver: zodResolver(loginRequestSchema),
    defaultValues: { email: '', password: '' },
  });
  const onSubmit = form.handleSubmit(async (input) => {
    form.clearErrors('root');
    try {
      onSuccess(await onAuthenticate(input));
    } catch (error) {
      form.setError('root', {
        message: error instanceof Error ? error.message : 'Unable to sign in.',
      });
    }
  });
  return (
    <form onSubmit={onSubmit} noValidate>
      <label>
        Email
        <input autoComplete="email" inputMode="email" {...form.register('email')} />
      </label>
      {form.formState.errors.email && (
        <p className="error">{form.formState.errors.email.message}</p>
      )}
      <label>
        Password
        <input type="password" autoComplete="current-password" {...form.register('password')} />
      </label>
      {form.formState.errors.password && (
        <p className="error">{form.formState.errors.password.message}</p>
      )}
      {form.formState.errors.root && (
        <p className="error" role="alert">
          {form.formState.errors.root.message}
        </p>
      )}
      <button id="login-submit" disabled={form.formState.isSubmitting} type="submit">
        {form.formState.isSubmitting ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}

type RegistrationFormProps = {
  onRegister: (input: RegistrationRequest) => Promise<CurrentUser>;
  onSuccess: (user: CurrentUser) => void;
};

export function RegistrationForm({ onRegister, onSuccess }: RegistrationFormProps) {
  const [confirmPassword, setConfirmPassword] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const form = useForm<RegistrationRequest>({
    resolver: zodResolver(registrationRequestSchema),
    defaultValues: { displayName: '', email: '', password: '' },
    mode: 'onChange',
  });
  const errors = form.formState.errors;
  const onSubmit = form.handleSubmit(async (input) => {
    if (input.password !== confirmPassword) {
      setConfirmPasswordError('Passwords do not match.');
      return;
    }
    setConfirmPasswordError('');
    form.clearErrors('root');
    try {
      onSuccess(await onRegister(input));
    } catch (error) {
      form.setError('root', {
        message: error instanceof Error ? error.message : 'We could not create your account.',
      });
    }
  });
  return (
    <form onSubmit={onSubmit} noValidate>
      <label htmlFor="registration-display-name">
        Learner’s name
        <input
          id="registration-display-name"
          autoComplete="name"
          aria-describedby={errors.displayName ? 'registration-display-name-error' : undefined}
          aria-invalid={errors.displayName ? 'true' : undefined}
          {...form.register('displayName')}
        />
      </label>
      {errors.displayName && (
        <p className="error" id="registration-display-name-error">
          {errors.displayName.message}
        </p>
      )}
      <label htmlFor="registration-email">
        Email
        <input
          id="registration-email"
          autoComplete="email"
          inputMode="email"
          aria-describedby={errors.email ? 'registration-email-error' : undefined}
          aria-invalid={errors.email ? 'true' : undefined}
          {...form.register('email')}
        />
      </label>
      {errors.email && (
        <p className="error" id="registration-email-error">
          {errors.email.message}
        </p>
      )}
      <label htmlFor="registration-password">
        Password
        <input
          id="registration-password"
          type="password"
          autoComplete="new-password"
          aria-describedby={errors.password ? 'registration-password-error' : undefined}
          aria-invalid={errors.password ? 'true' : undefined}
          {...form.register('password')}
        />
      </label>
      {errors.password && (
        <p className="error" id="registration-password-error">
          {errors.password.message}
        </p>
      )}
      <label htmlFor="registration-confirm-password">
        Confirm password
        <input
          id="registration-confirm-password"
          type="password"
          autoComplete="new-password"
          aria-describedby={
            confirmPasswordError ? 'registration-confirm-password-error' : undefined
          }
          aria-invalid={confirmPasswordError ? 'true' : undefined}
          value={confirmPassword}
          onChange={(event) => {
            setConfirmPassword(event.target.value);
            setConfirmPasswordError('');
          }}
        />
      </label>
      {confirmPasswordError && (
        <p className="error" id="registration-confirm-password-error">
          {confirmPasswordError}
        </p>
      )}
      {errors.root && (
        <p className="error" id="registration-form-error" role="alert">
          {errors.root.message}
        </p>
      )}
      <button id="registration-submit" disabled={form.formState.isSubmitting} type="submit">
        {form.formState.isSubmitting ? 'Creating account…' : 'Create account'}
      </button>
    </form>
  );
}
