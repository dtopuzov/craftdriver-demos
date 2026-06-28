import type { CurrentUser } from '@exam/contracts';
import { Link, useLocation } from 'react-router-dom';
import { api } from '../../api.js';
import { LoginForm, RegistrationForm } from './AuthForms.js';

type Authenticated = (user: CurrentUser) => void;

export function LoginPage({ onAuthenticated }: { onAuthenticated: Authenticated }) {
  const location = useLocation();
  return (
    <main className="auth-card">
      <h1>Welcome back to EasyMath</h1>
      <p>Sign in to continue learning.</p>
      <LoginForm
        onAuthenticate={async (input) =>
          (await api<{ user: CurrentUser }>('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify(input),
          })).user
        }
        onSuccess={onAuthenticated}
      />
      {location.state?.message && <p>{location.state.message}</p>}
      <p className="auth-switch">New to EasyMath? <Link to="/register">Create a learner account</Link></p>
    </main>
  );
}

export function RegistrationPage({ onAuthenticated }: { onAuthenticated: Authenticated }) {
  return (
    <main className="auth-card">
      <p className="eyebrow">Start learning</p>
      <h1>Create an EasyMath account</h1>
      <p>Set up a learner account to access lessons, practice tests, and exams.</p>
      <RegistrationForm
        onRegister={async (input) =>
          (await api<{ user: CurrentUser }>('/api/auth/register', {
            method: 'POST',
            body: JSON.stringify(input),
          })).user
        }
        onSuccess={onAuthenticated}
      />
      <p className="auth-switch">Already have an account? <Link to="/login">Sign in</Link></p>
    </main>
  );
}
