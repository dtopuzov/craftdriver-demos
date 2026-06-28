import { buildApp } from '../../src/app.js';
import { beforeAll, afterAll, describe, expect, it } from 'vitest';

const student = { email: 'ada.student@example.test', password: 'exam-demo-2026' };
const secondStudent = { email: 'noah.student@example.test', password: 'exam-demo-2026' };
const teacher = { email: 'teacher@example.test', password: 'exam-demo-2026' };
const otherTeacher = { email: 'morgan.teacher@example.test', password: 'exam-demo-2026' };
const publishedExamId = '30000000-0000-4000-8000-000000000001';
const sampleAttemptId = '60000000-0000-4000-8000-000000000001';

const app = buildApp();
let studentCookie = '';
let secondStudentCookie = '';
let teacherCookie = '';
let otherTeacherCookie = '';

async function signIn(credentials: { email: string; password: string }) {
  const response = await app.inject({
    method: 'POST',
    url: '/api/auth/login',
    payload: credentials,
  });
  expect(response.statusCode).toBe(200);
  return response.cookies.find((cookie) => cookie.name === 'exam_session')!.value;
}

beforeAll(async () => {
  await app.ready();
  studentCookie = await signIn(student);
  secondStudentCookie = await signIn(secondStudent);
  teacherCookie = await signIn(teacher);
  otherTeacherCookie = await signIn(otherTeacher);
});
afterAll(async () => app.close());

describe('authentication and authorization', () => {
  it('registers a student, starts a session, and supports later sign-in', async () => {
    const credentials = {
      displayName: 'New Learner',
      email: `new.learner.${Date.now()}@example.test`,
      password: 'learning-2026',
    };
    const registration = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: credentials,
    });
    expect(registration.statusCode).toBe(200);
    expect(registration.json().user).toMatchObject({
      displayName: credentials.displayName,
      email: credentials.email,
      role: 'student',
    });
    const registrationCookie = registration.cookies.find((cookie) => cookie.name === 'exam_session')!.value;
    expect(
      (
        await app.inject({
          method: 'GET',
          url: '/api/me',
          headers: { cookie: `exam_session=${registrationCookie}` },
        })
      ).json().user,
    ).toMatchObject({ email: credentials.email, role: 'student' });

    const duplicate = await app.inject({ method: 'POST', url: '/api/auth/register', payload: credentials });
    expect(duplicate.statusCode).toBe(400);
    expect(duplicate.json().error.code).toBe('VALIDATION_ERROR');

    expect(await signIn({ email: credentials.email, password: credentials.password })).toBeTruthy();
  });

  it('validates public registration input', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { displayName: 'A', email: 'not-an-email', password: 'short' },
    });
    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects incorrect credentials without leaking account details', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { ...student, password: 'wrong' },
    });
    expect(response.statusCode).toBe(401);
    expect(response.json().error.code).toBe('UNAUTHENTICATED');
  });

  it('returns only the safe current-user profile', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/me',
      headers: { cookie: `exam_session=${studentCookie}` },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().user).toMatchObject({ email: student.email, role: 'student' });
    expect(JSON.stringify(response.json())).not.toContain('password');
  });

  it('does not expose answer keys in the student exam list', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/student/exams',
      headers: { cookie: `exam_session=${studentCookie}` },
    });
    expect(response.statusCode).toBe(200);
    expect(JSON.stringify(response.json())).not.toContain('correctOptionId');
    expect(JSON.stringify(response.json())).not.toContain('expected');
  });

  it('prevents a student from reading another student attempt', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/student/attempts/${sampleAttemptId}`,
      headers: { cookie: `exam_session=${secondStudentCookie}` },
    });
    expect(response.statusCode).toBe(404);
  });

  it('returns revision-based answers and explanations only when the feedback policy allows them', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/student/attempts/${sampleAttemptId}`,
      headers: { cookie: `exam_session=${studentCookie}` },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().attempt).toMatchObject({
      title: 'Foundations of Arithmetic',
      instructions: 'Answer both questions. You may use scratch paper.',
      durationMinutes: 15,
      revisionNumber: 1,
    });
    expect(response.json().attempt.result).toMatchObject({
      feedbackPolicy: 'answers_and_explanations',
      score: 2,
      maxScore: 5,
    });
    expect(response.json().attempt.result.questions[0]).toMatchObject({
      correctAnswer: { correctOptionId: 'c' },
      explanation: 'Seven plus five equals twelve.',
    });
  });

  it('prevents students from reading teacher results while allowing the owner', async () => {
    const denied = await app.inject({
      method: 'GET',
      url: `/api/teacher/exams/${publishedExamId}/results`,
      headers: { cookie: `exam_session=${studentCookie}` },
    });
    expect(denied.statusCode).toBe(403);
    const allowed = await app.inject({
      method: 'GET',
      url: `/api/teacher/exams/${publishedExamId}/results`,
      headers: { cookie: `exam_session=${teacherCookie}` },
    });
    expect(allowed.statusCode).toBe(200);
    expect(allowed.json().results.find((result: { id: string }) => result.id === sampleAttemptId)).toMatchObject({
      id: sampleAttemptId,
      studentName: 'Ada Student',
      revisionNumber: 1,
    });
    const detail = await app.inject({
      method: 'GET',
      url: `/api/teacher/attempts/${sampleAttemptId}`,
      headers: { cookie: `exam_session=${teacherCookie}` },
    });
    expect(detail.statusCode).toBe(200);
    expect(detail.json().attempt).toMatchObject({
      title: 'Foundations of Arithmetic',
      studentName: 'Ada Student',
      revisionNumber: 1,
    });
    expect(detail.json().attempt.questions[0]).toMatchObject({
      prompt: 'What is 7 + 5?',
      points: 2,
      answer: { selectedOptionId: 'c' },
      isCorrect: true,
      awardedPoints: 2,
    });
  });

  it('prevents a teacher from accessing another teacher’s exam, results, and attempt', async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/api/teacher/exams',
      headers: { cookie: `exam_session=${otherTeacherCookie}` },
      payload: { title: `Private exam ${Date.now()}` },
    });
    expect(created.statusCode).toBe(200);
    const examId = created.json().exam.id;
    const otherTeacherHeaders = { cookie: `exam_session=${otherTeacherCookie}` };
    const teacherHeaders = { cookie: `exam_session=${teacherCookie}` };
    expect((await app.inject({ method: 'POST', url: `/api/teacher/exams/${examId}/questions`, headers: otherTeacherHeaders, payload: { kind: 'single_choice', prompt: 'Private question', points: 1, config: { options: [{ id: 'a', text: 'A' }, { id: 'b', text: 'B' }] }, answer: { correctOptionId: 'a' } } })).statusCode).toBe(200);
    expect((await app.inject({ method: 'POST', url: `/api/teacher/exams/${examId}/publish`, headers: otherTeacherHeaders })).statusCode).toBe(200);
    const started = await app.inject({ method: 'POST', url: `/api/student/exams/${examId}/start`, headers: { cookie: `exam_session=${secondStudentCookie}` } });
    expect(started.statusCode).toBe(200);
    const attemptId = started.json().attempt.id;

    expect((await app.inject({ method: 'GET', url: `/api/teacher/exams/${examId}`, headers: teacherHeaders })).statusCode).toBe(404);
    expect((await app.inject({ method: 'PATCH', url: `/api/teacher/exams/${examId}`, headers: teacherHeaders, payload: { title: 'Changed' } })).statusCode).toBe(404);
    expect((await app.inject({ method: 'POST', url: `/api/teacher/exams/${examId}/questions`, headers: teacherHeaders, payload: { kind: 'numeric', prompt: 'Blocked', points: 1, config: {}, answer: { expected: 1 } } })).statusCode).toBe(404);
    expect((await app.inject({ method: 'POST', url: `/api/teacher/exams/${examId}/publish`, headers: teacherHeaders })).statusCode).toBe(404);
    expect((await app.inject({ method: 'POST', url: `/api/teacher/exams/${examId}/unpublish`, headers: teacherHeaders })).statusCode).toBe(404);
    expect((await app.inject({ method: 'GET', url: `/api/teacher/exams/${examId}/results`, headers: teacherHeaders })).statusCode).toBe(404);
    expect((await app.inject({ method: 'GET', url: `/api/teacher/attempts/${attemptId}`, headers: teacherHeaders })).statusCode).toBe(404);
  });
});
