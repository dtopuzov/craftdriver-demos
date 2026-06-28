import { randomUUID } from 'node:crypto';
import postgres from 'postgres';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../../src/app.js';

const app = buildApp();
const sql = postgres(process.env.DATABASE_URL!);
const password = 'exam-demo-2026';
let teacherCookie = '';
let otherTeacherCookie = '';

async function signIn(email: string) {
  const response = await app.inject({
    method: 'POST',
    url: '/api/auth/login',
    payload: { email, password },
  });
  expect(response.statusCode).toBe(200);
  return response.cookies.find((cookie) => cookie.name === 'exam_session')!.value;
}

async function request(cookie: string, method: string, url: string, payload?: unknown) {
  return app.inject({ method, url, headers: { cookie: `exam_session=${cookie}` }, payload });
}

beforeAll(async () => {
  await app.ready();
  [teacherCookie, otherTeacherCookie] = await Promise.all([
    signIn('teacher@example.test'),
    signIn('morgan.teacher@example.test'),
  ]);
});

afterAll(async () => {
  await app.close();
  await sql.end();
});

describe('teacher question authoring', () => {
  it('validates scheduling and records immutable publish and unpublish revisions', async () => {
    const availableFrom = '2030-05-01T09:00:00.000Z';
    const availableUntil = '2030-05-01T10:00:00.000Z';
    const created = await request(teacherCookie, 'POST', '/api/teacher/exams', {
      title: `Scheduled revisions ${randomUUID()}`,
      durationMinutes: 25,
      feedbackPolicy: 'answers_and_explanations',
      availableFrom,
      availableUntil,
    });
    expect(created.statusCode).toBe(200);
    const examId = created.json().exam.id;
    expect(created.json().exam).toMatchObject({ durationMinutes: 25, feedbackPolicy: 'answers_and_explanations' });

    const invalidSchedule = await request(teacherCookie, 'PATCH', `/api/teacher/exams/${examId}`, {
      availableUntil: '2030-05-01T08:00:00.000Z',
    });
    expect(invalidSchedule.statusCode).toBe(400);
    expect(invalidSchedule.json().error.message).toContain('end must be after');
    expect(
      (
        await request(teacherCookie, 'POST', `/api/teacher/exams/${examId}/questions`, {
          kind: 'numeric',
          prompt: 'What is 4 + 4?',
          points: 2,
          config: { tolerance: 0 },
          answer: { expected: 8 },
        })
      ).statusCode,
    ).toBe(200);

    const firstPublish = await request(teacherCookie, 'POST', `/api/teacher/exams/${examId}/publish`);
    expect(firstPublish.statusCode).toBe(200);
    expect(firstPublish.json().revision.revisionNumber).toBe(1);
    const duplicatePublish = await request(teacherCookie, 'POST', `/api/teacher/exams/${examId}/publish`);
    expect(duplicatePublish.statusCode).toBe(409);
    expect(duplicatePublish.json().error.code).toBe('INVALID_STATE');

    expect((await request(teacherCookie, 'POST', `/api/teacher/exams/${examId}/unpublish`)).statusCode).toBe(200);
    expect((await request(teacherCookie, 'POST', `/api/teacher/exams/${examId}/unpublish`)).statusCode).toBe(409);
    expect(
      (
        await request(teacherCookie, 'PATCH', `/api/teacher/exams/${examId}`, {
          durationMinutes: 30,
          feedbackPolicy: 'score_only',
          availableFrom: null,
          availableUntil: null,
        })
      ).statusCode,
    ).toBe(200);
    const secondPublish = await request(teacherCookie, 'POST', `/api/teacher/exams/${examId}/publish`);
    expect(secondPublish.statusCode).toBe(200);
    expect(secondPublish.json().revision.revisionNumber).toBe(2);

    const revisions = await sql`select revision_number as "revisionNumber", snapshot_json as snapshot from exam_revisions where exam_id=${examId} order by revision_number`;
    expect(revisions).toHaveLength(2);
    expect(revisions[0].snapshot).toMatchObject({ durationMinutes: 25, feedbackPolicy: 'answers_and_explanations' });
    expect(revisions[1].snapshot).toMatchObject({ durationMinutes: 30, feedbackPolicy: 'score_only' });
    const auditEvents = await sql`select event_type as "eventType", metadata from audit_events where entity_id in (${firstPublish.json().revision.id}, ${secondPublish.json().revision.id}, ${examId}) order by created_at`;
    expect(auditEvents.map((event) => event.eventType)).toEqual(
      expect.arrayContaining(['exam.published', 'exam.unpublished', 'exam.published']),
    );
  });

  it('edits, duplicates, reorders, and deletes draft questions without changing ownership or order integrity', async () => {
    const created = await request(teacherCookie, 'POST', '/api/teacher/exams', {
      title: `Question editor ${randomUUID()}`,
    });
    expect(created.statusCode).toBe(200);
    const examId = created.json().exam.id;

    const firstCreated = await request(teacherCookie, 'POST', `/api/teacher/exams/${examId}/questions`, {
      kind: 'single_choice',
      prompt: 'Original choice',
      points: 2,
      config: { options: [{ id: 'a', text: 'A' }, { id: 'b', text: 'B' }] },
      answer: { correctOptionId: 'a' },
      explanation: 'Original explanation.',
    });
    const secondCreated = await request(teacherCookie, 'POST', `/api/teacher/exams/${examId}/questions`, {
      kind: 'numeric',
      prompt: 'Original numeric',
      points: 3,
      config: { tolerance: 0 },
      answer: { expected: 12, tolerance: 0 },
    });
    expect(firstCreated.statusCode).toBe(200);
    expect(secondCreated.statusCode).toBe(200);
    const firstQuestionId = firstCreated.json().question.id;
    const secondQuestionId = secondCreated.json().question.id;

    const invalidUpdate = await request(
      teacherCookie,
      'PATCH',
      `/api/teacher/exams/${examId}/questions/${firstQuestionId}`,
      {
        kind: 'single_choice',
        prompt: 'Invalid choice',
        points: 2,
        config: { options: [{ id: 'a', text: 'Only one option' }] },
        answer: { correctOptionId: 'a' },
      },
    );
    expect(invalidUpdate.statusCode).toBe(400);
    expect(invalidUpdate.json().error.message).toContain('at least two');

    const updated = await request(
      teacherCookie,
      'PATCH',
      `/api/teacher/exams/${examId}/questions/${firstQuestionId}`,
      {
        kind: 'single_choice',
        prompt: 'Updated choice',
        points: 4,
        config: { options: [{ id: 'a', text: 'Alpha' }, { id: 'b', text: 'Beta' }] },
        answer: { correctOptionId: 'b' },
        explanation: 'Updated explanation.',
      },
    );
    expect(updated.statusCode).toBe(200);
    expect(updated.json().question).toMatchObject({
      id: firstQuestionId,
      prompt: 'Updated choice',
      points: 4,
      answer: { correctOptionId: 'b' },
      explanation: 'Updated explanation.',
    });

    const duplicated = await request(
      teacherCookie,
      'POST',
      `/api/teacher/exams/${examId}/questions/${firstQuestionId}/duplicate`,
    );
    expect(duplicated.statusCode).toBe(200);
    const duplicateId = duplicated.json().question.id;
    expect(duplicated.json().question).toMatchObject({
      prompt: 'Updated choice',
      points: 4,
      position: 3,
      answer: { correctOptionId: 'b' },
    });

    const foreignUpdate = await request(
      otherTeacherCookie,
      'PATCH',
      `/api/teacher/exams/${examId}/questions/${firstQuestionId}`,
      {
        kind: 'single_choice',
        prompt: 'Not allowed',
        points: 1,
        config: { options: [{ id: 'a', text: 'A' }, { id: 'b', text: 'B' }] },
        answer: { correctOptionId: 'a' },
      },
    );
    expect(foreignUpdate.statusCode).toBe(404);
    expect(
      (
        await request(otherTeacherCookie, 'PUT', `/api/teacher/exams/${examId}/questions/order`, {
          questionIds: [duplicateId, secondQuestionId, firstQuestionId],
        })
      ).statusCode,
    ).toBe(404);
    expect(
      (await request(otherTeacherCookie, 'DELETE', `/api/teacher/exams/${examId}/questions/${firstQuestionId}`))
        .statusCode,
    ).toBe(404);

    expect(
      (
        await request(teacherCookie, 'PUT', `/api/teacher/exams/${examId}/questions/order`, {
          questionIds: [firstQuestionId],
        })
      ).statusCode,
    ).toBe(400);
    const reordered = await request(teacherCookie, 'PUT', `/api/teacher/exams/${examId}/questions/order`, {
      questionIds: [duplicateId, secondQuestionId, firstQuestionId],
    });
    expect(reordered.statusCode).toBe(200);

    const afterReorder = await request(teacherCookie, 'GET', `/api/teacher/exams/${examId}`);
    expect(afterReorder.json().questions.map((question: { id: string; position: number }) => question.id)).toEqual([
      duplicateId,
      secondQuestionId,
      firstQuestionId,
    ]);
    expect(afterReorder.json().questions.map((question: { position: number }) => question.position)).toEqual([
      1,
      2,
      3,
    ]);

    const deleted = await request(
      teacherCookie,
      'DELETE',
      `/api/teacher/exams/${examId}/questions/${secondQuestionId}`,
    );
    expect(deleted.statusCode).toBe(200);
    const afterDelete = await request(teacherCookie, 'GET', `/api/teacher/exams/${examId}`);
    expect(afterDelete.json().questions.map((question: { id: string; position: number }) => question.id)).toEqual([
      duplicateId,
      firstQuestionId,
    ]);
    expect(afterDelete.json().questions.map((question: { position: number }) => question.position)).toEqual([
      1,
      2,
    ]);

    expect((await request(teacherCookie, 'POST', `/api/teacher/exams/${examId}/publish`)).statusCode).toBe(200);
    expect(
      (
        await request(teacherCookie, 'POST', `/api/teacher/exams/${examId}/questions/${firstQuestionId}/duplicate`)
      ).statusCode,
    ).toBe(404);
    expect(
      (await request(teacherCookie, 'DELETE', `/api/teacher/exams/${examId}/questions/${firstQuestionId}`))
        .statusCode,
    ).toBe(404);
  });
});
