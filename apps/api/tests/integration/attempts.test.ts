import { randomUUID } from 'node:crypto';
import postgres from 'postgres';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../../src/app.js';

const app = buildApp();
const sql = postgres(process.env.DATABASE_URL!);
const password = 'exam-demo-2026';
const seededExamId = '30000000-0000-4000-8000-000000000001';
let adaCookie = '';
let noahCookie = '';
let teacherCookie = '';

async function signIn(email: string) {
  const response = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { email, password } });
  expect(response.statusCode).toBe(200);
  return response.cookies.find((cookie) => cookie.name === 'exam_session')!.value;
}

async function request(cookie: string, method: string, url: string, payload?: unknown) {
  return app.inject({ method, url, headers: { cookie: `exam_session=${cookie}` }, payload });
}

beforeAll(async () => {
  await app.ready();
  await sql`delete from attempts a using exam_revisions r where a.exam_revision_id = r.id and r.exam_id = ${seededExamId} and a.student_id = (select id from users where email = 'noah.student@example.test')`;
  [adaCookie, noahCookie, teacherCookie] = await Promise.all([
    signIn('ada.student@example.test'),
    signIn('noah.student@example.test'),
    signIn('teacher@example.test'),
  ]);
});
afterAll(async () => {
  await app.close();
  await sql.end();
});

describe('student attempt lifecycle', () => {
  it('starts, saves, submits idempotently, and denies another student access', async () => {
    const started = await request(noahCookie, 'POST', `/api/student/exams/${seededExamId}/start`);
    expect(started.statusCode).toBe(200);
    const attempt = started.json().attempt;
    expect((await request(noahCookie, 'POST', `/api/student/exams/${seededExamId}/start`)).json().attempt.id).toBe(attempt.id);
    expect(JSON.stringify(attempt)).not.toContain('correctOptionId');
    expect(JSON.stringify(attempt)).not.toContain('expected');

    const [choice, numeric] = attempt.questions;
    expect((await request(noahCookie, 'PUT', `/api/student/attempts/${attempt.id}/answers/not-a-question`, { answer: 'anything' })).statusCode).toBe(404);
    expect((await request(noahCookie, 'PUT', `/api/student/attempts/${attempt.id}/answers/${choice.key}`, { answer: 'c' })).statusCode).toBe(200);
    expect((await request(noahCookie, 'PUT', `/api/student/attempts/${attempt.id}/answers/${numeric.key}`, { answer: '12' })).statusCode).toBe(200);
    expect((await request(adaCookie, 'GET', `/api/student/attempts/${attempt.id}`)).statusCode).toBe(404);

    const submitted = await request(noahCookie, 'POST', `/api/student/attempts/${attempt.id}/submit`);
    expect(submitted.statusCode).toBe(200);
    expect(submitted.json()).toMatchObject({ score: 5, maxScore: 5 });
    const repeated = await request(noahCookie, 'POST', `/api/student/attempts/${attempt.id}/submit`);
    expect(repeated.statusCode).toBe(200);
    expect(repeated.json()).toEqual(submitted.json());
    expect((await request(noahCookie, 'PUT', `/api/student/attempts/${attempt.id}/answers/${choice.key}`, { answer: 'a' })).statusCode).toBe(409);
  });

  it('keeps an active attempt bound to its original published revision', async () => {
    const title = `Revision isolation ${randomUUID()}`;
    const created = await request(teacherCookie, 'POST', '/api/teacher/exams', { title });
    const examId = created.json().exam.id;
    const updated = await request(teacherCookie, 'PATCH', `/api/teacher/exams/${examId}`, {
      durationMinutes: 20,
      feedbackPolicy: 'none',
    });
    expect(updated.json().exam).toMatchObject({ durationMinutes: 20, feedbackPolicy: 'none' });
    expect((await request(teacherCookie, 'PATCH', `/api/teacher/exams/${examId}`, { durationMinutes: null })).json().exam.durationMinutes).toBeNull();
    expect((await request(teacherCookie, 'POST', `/api/teacher/exams/${examId}/publish`)).statusCode).toBe(400);

    const addQuestion = (payload: unknown) => request(teacherCookie, 'POST', `/api/teacher/exams/${examId}/questions`, payload);
    expect((await addQuestion({ kind: 'single_choice', prompt: 'One?', points: 1, config: { options: [{ id: 'a', text: 'A' }, { id: 'b', text: 'B' }] }, answer: { correctOptionId: 'a' } })).statusCode).toBe(200);
    expect((await request(teacherCookie, 'POST', `/api/teacher/exams/${examId}/publish`)).statusCode).toBe(200);
    await sql`update exams set available_until = now() - interval '1 minute' where id = ${examId}`;
    expect((await request(adaCookie, 'POST', `/api/student/exams/${examId}/start`)).statusCode).toBe(404);
    await sql`update exams set available_until = null where id = ${examId}`;
    const firstAttempt = (await request(adaCookie, 'POST', `/api/student/exams/${examId}/start`)).json().attempt;
    expect(firstAttempt.questions).toHaveLength(1);

    expect((await request(teacherCookie, 'POST', `/api/teacher/exams/${examId}/unpublish`)).statusCode).toBe(200);
    expect((await addQuestion({ kind: 'numeric', prompt: 'Two?', points: 2, config: { tolerance: 0 }, answer: { expected: 2, tolerance: 0 } })).statusCode).toBe(200);
    expect((await request(teacherCookie, 'POST', `/api/teacher/exams/${examId}/publish`)).statusCode).toBe(200);
    const secondAttempt = (await request(noahCookie, 'POST', `/api/student/exams/${examId}/start`)).json().attempt;
    expect(secondAttempt.questions).toHaveLength(2);
    const original = await request(adaCookie, 'GET', `/api/student/attempts/${firstAttempt.id}`);
    expect(original.statusCode).toBe(200);
    expect(original.json().attempt.questions).toHaveLength(1);
  });

  it('hides scores when feedback is disabled and rejects saves after expiry', async () => {
    const title = `No feedback ${randomUUID()}`;
    const created = await request(teacherCookie, 'POST', '/api/teacher/exams', {
      title,
      feedbackPolicy: 'none',
    });
    const examId = created.json().exam.id;
    expect((await request(teacherCookie, 'POST', `/api/teacher/exams/${examId}/questions`, {
      kind: 'numeric', prompt: 'One', points: 1, config: { tolerance: 0 }, answer: { expected: 1 },
    })).statusCode).toBe(200);
    expect((await request(teacherCookie, 'POST', `/api/teacher/exams/${examId}/publish`)).statusCode).toBe(200);
    const attempt = (await request(adaCookie, 'POST', `/api/student/exams/${examId}/start`)).json().attempt;
    expect((await request(adaCookie, 'PUT', `/api/student/attempts/${attempt.id}/answers/${attempt.questions[0].key}`, { answer: '1' })).statusCode).toBe(200);
    const submitted = await request(adaCookie, 'POST', `/api/student/attempts/${attempt.id}/submit`);
    expect(submitted.statusCode).toBe(200);
    expect(submitted.json()).toEqual({ feedbackPolicy: 'none' });
    const reloaded = (await request(adaCookie, 'GET', `/api/student/attempts/${attempt.id}`)).json().attempt;
    expect(reloaded.score).toBeNull();
    expect(reloaded.result).toBeUndefined();
    expect((await request(teacherCookie, 'POST', `/api/teacher/exams/${examId}/unpublish`)).statusCode).toBe(200);
    expect((await request(teacherCookie, 'PATCH', `/api/teacher/exams/${examId}`, {
      title: 'Changed after submission', feedbackPolicy: 'answers_and_explanations',
    })).statusCode).toBe(200);
    const history = (await request(adaCookie, 'GET', '/api/student/exams')).json().exams.find((exam: { id: string }) => exam.id === examId);
    expect(history).toMatchObject({
      title,
      status: 'submitted',
      feedbackPolicy: 'none',
      score: null,
      attemptId: attempt.id,
    });
    await sql`update attempts set status = 'expired' where id = ${attempt.id}`;
    expect((await request(adaCookie, 'PUT', `/api/student/attempts/${attempt.id}/answers/${attempt.questions[0].key}`, { answer: '1' })).statusCode).toBe(409);
  });
});
