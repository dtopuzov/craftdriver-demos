import { Link, Navigate, Outlet, useNavigate } from 'react-router-dom';
import { ApiClientError, api } from '../api.js';
import { useMe } from '../hooks/useMe.js';
import { queryClient } from '../queryClient.js';

export function Shell() {
  const { data, isLoading, error } = useMe();
  const navigate = useNavigate();

  if (isLoading) return <p className="centered">Loading your workspace...</p>;
  if (error instanceof ApiClientError && error.status === 401)
    return <Navigate to="/login" replace />;
  if (error) return <p className="centered error">Unable to load your session.</p>;

  const user = data!.user;
  const signOut = async () => {
    await api('/api/auth/logout', { method: 'POST' });
    queryClient.clear();
    navigate('/login');
  };

  return (
    <div className="app-shell">
      <header>
        <Link to="/" className="brand">
          EasyMath
        </Link>
        <nav>
          {user.role === 'student' ? (
            <Link to="/student">My exams</Link>
          ) : (
            <Link to="/teacher">Teacher area</Link>
          )}
          <button id="sign-out" onClick={signOut}>
            Sign out
          </button>
        </nav>
      </header>
      <main>
        <p className="identity" id="user-identity">
          {user.displayName} - {user.role}
        </p>
        <Outlet />
      </main>
    </div>
  );
}
