import { QueryClientProvider } from '@tanstack/react-query';
import { Component, type ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { queryClient } from './queryClient.js';
import { LoginPage, RegistrationPage } from './features/auth/AuthPages.js';
import { AttemptPage } from './features/student/AttemptPage.js';
import { StudentDashboard } from './features/student/StudentDashboard.js';
import { TeacherExamPage } from './features/teacher/DraftEditor.js';
import { TeacherDashboard } from './features/teacher/TeacherDashboard.js';
import { TeacherResultsPage } from './features/teacher/TeacherResults.js';
import { LandingPage } from './routes/LandingPage.js';
import { RoleHome } from './routes/RoleHome.js';
import { Shell } from './routes/Shell.js';

function LoginRoute() {
  const navigate = useNavigate();
  return (
    <LoginPage
      onAuthenticated={(user) => {
        queryClient.setQueryData(['me'], { user });
        navigate(user.role === 'student' ? '/student' : '/teacher', { replace: true });
      }}
    />
  );
}

function RegistrationRoute() {
  const navigate = useNavigate();
  return (
    <RegistrationPage
      onAuthenticated={(user) => {
        queryClient.setQueryData(['me'], { user });
        navigate('/student', { replace: true });
      }}
    />
  );
}

class AppErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {
    // A future observability adapter belongs here; do not send browser data by default.
  }

  render() {
    if (this.state.failed)
      return (
        <main className="centered">
          <h1>Something went wrong</h1>
          <p>Refresh the page to try again.</p>
        </main>
      );
    return this.props.children;
  }
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppErrorBoundary>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginRoute />} />
            <Route path="/register" element={<RegistrationRoute />} />
            <Route element={<Shell />}>
              <Route path="home" element={<RoleHome />} />
              <Route path="student" element={<StudentDashboard />} />
              <Route path="student/attempts/:id" element={<AttemptPage />} />
              <Route path="teacher" element={<TeacherDashboard />} />
              <Route path="teacher/exams/:examId" element={<TeacherExamPage />} />
              <Route path="teacher/exams/:examId/results" element={<TeacherResultsPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AppErrorBoundary>
    </QueryClientProvider>
  );
}
