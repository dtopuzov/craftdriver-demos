export const baseUrl = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:5173';

export const routes = {
  home: '/',
  login: '/login',
  register: '/register',
  roleHome: '/home',
  studentDashboard: '/student',
  studentAttempt: (attemptId: string) => `/student/attempts/${attemptId}`,
  teacherDashboard: '/teacher',
  teacherExam: (examId: string) => `/teacher/exams/${examId}`,
  teacherResults: (examId: string) => `/teacher/exams/${examId}/results`,
} as const;
