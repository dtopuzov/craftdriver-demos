import argon2 from 'argon2';
import {
  attemptAnswers,
  attempts,
  auditEvents,
  examRevisions,
  exams,
  questionAnswers,
  questions,
  users,
} from './schema.js';
import { createDatabase } from './client.js';

const ids = {
  teacher: '10000000-0000-4000-8000-000000000001',
  teacherMorgan: '10000000-0000-4000-8000-000000000002',
  studentAda: '20000000-0000-4000-8000-000000000001',
  studentNoah: '20000000-0000-4000-8000-000000000002',
  publishedExam: '30000000-0000-4000-8000-000000000001',
  draftExam: '30000000-0000-4000-8000-000000000002',
  publishedRevision: '40000000-0000-4000-8000-000000000001',
  publishedChoiceQuestion: '50000000-0000-4000-8000-000000000001',
  publishedNumericQuestion: '50000000-0000-4000-8000-000000000002',
  draftMultipleQuestion: '50000000-0000-4000-8000-000000000003',
  sampleAttempt: '60000000-0000-4000-8000-000000000001',
  sampleChoiceAnswer: '70000000-0000-4000-8000-000000000001',
  sampleNumericAnswer: '70000000-0000-4000-8000-000000000002',
  publishEvent: '80000000-0000-4000-8000-000000000001',
  submitEvent: '80000000-0000-4000-8000-000000000002',
} as const;

const demoPassword = 'exam-demo-2026';
const publishedAt = new Date('2025-01-15T09:00:00.000Z');
const startedAt = new Date('2025-01-20T10:00:00.000Z');
const submittedAt = new Date('2025-01-20T10:03:00.000Z');

const publishedSnapshot = {
  title: 'Foundations of Arithmetic',
  instructions: 'Answer both questions. You may use scratch paper.',
  durationMinutes: 15,
  feedbackPolicy: 'answers_and_explanations',
  questions: [
    {
      key: ids.publishedChoiceQuestion,
      kind: 'single_choice',
      prompt: 'What is 7 + 5?',
      points: 2,
      config: {
        options: [
          { id: 'a', text: '10' },
          { id: 'b', text: '11' },
          { id: 'c', text: '12' },
        ],
      },
      grading: { correctOptionId: 'c' },
      explanation: 'Seven plus five equals twelve.',
    },
    {
      key: ids.publishedNumericQuestion,
      kind: 'numeric',
      prompt: 'What is the value of 3 × 4?',
      points: 3,
      config: { tolerance: 0 },
      grading: { expected: 12, tolerance: 0 },
      explanation: 'Three groups of four equal twelve.',
    },
  ],
};

const { client, db } = createDatabase();

try {
  const passwordHash = await argon2.hash(demoPassword, {
    type: argon2.argon2id,
    memoryCost: 19_456,
    timeCost: 2,
    parallelism: 1,
  });
  await db.transaction(async (tx) => {
    await tx
      .insert(users)
      .values([
        {
          id: ids.teacher,
          email: 'teacher@example.test',
          displayName: 'Taylor Teacher',
          role: 'teacher',
          passwordHash,
        },
        {
          id: ids.teacherMorgan,
          email: 'morgan.teacher@example.test',
          displayName: 'Morgan Teacher',
          role: 'teacher',
          passwordHash,
        },
        {
          id: ids.studentAda,
          email: 'ada.student@example.test',
          displayName: 'Ada Student',
          role: 'student',
          passwordHash,
        },
        {
          id: ids.studentNoah,
          email: 'noah.student@example.test',
          displayName: 'Noah Student',
          role: 'student',
          passwordHash,
        },
      ])
      .onConflictDoUpdate({
        target: users.id,
        set: {
          email: users.email,
          displayName: users.displayName,
          role: users.role,
          isActive: true,
          passwordHash,
        },
      });

    await tx
      .insert(exams)
      .values([
        {
          id: ids.publishedExam,
          ownerId: ids.teacher,
          title: publishedSnapshot.title,
          instructions: publishedSnapshot.instructions,
          status: 'published',
          durationMinutes: publishedSnapshot.durationMinutes,
          feedbackPolicy: 'answers_and_explanations',
        },
        {
          id: ids.draftExam,
          ownerId: ids.teacher,
          title: 'Sets and Factors — Draft',
          instructions: 'Choose every factor of 12.',
          status: 'draft',
          durationMinutes: 10,
          feedbackPolicy: 'score_only',
        },
      ])
      .onConflictDoUpdate({
        target: exams.id,
        set: {
          title: exams.title,
          instructions: exams.instructions,
          status: exams.status,
          feedbackPolicy: exams.feedbackPolicy,
        },
      });

    await tx
      .insert(questions)
      .values([
        {
          id: ids.publishedChoiceQuestion,
          examId: ids.publishedExam,
          position: 1,
          kind: 'single_choice',
          prompt: 'What is 7 + 5?',
          points: 2,
          configJson: publishedSnapshot.questions[0].config,
        },
        {
          id: ids.publishedNumericQuestion,
          examId: ids.publishedExam,
          position: 2,
          kind: 'numeric',
          prompt: 'What is the value of 3 × 4?',
          points: 3,
          configJson: publishedSnapshot.questions[1].config,
        },
        {
          id: ids.draftMultipleQuestion,
          examId: ids.draftExam,
          position: 1,
          kind: 'multiple_choice',
          prompt: 'Which of these are factors of 12?',
          points: 3,
          configJson: {
            options: [
              { id: 'a', text: '2' },
              { id: 'b', text: '3' },
              { id: 'c', text: '5' },
              { id: 'd', text: '6' },
            ],
          },
        },
      ])
      .onConflictDoUpdate({
        target: questions.id,
        set: {
          prompt: questions.prompt,
          points: questions.points,
          configJson: questions.configJson,
        },
      });

    await tx
      .insert(questionAnswers)
      .values([
        {
          id: '90000000-0000-4000-8000-000000000001',
          questionId: ids.publishedChoiceQuestion,
          answerJson: { correctOptionId: 'c' },
          explanation: 'Seven plus five equals twelve.',
        },
        {
          id: '90000000-0000-4000-8000-000000000002',
          questionId: ids.publishedNumericQuestion,
          answerJson: { expected: 12, tolerance: 0 },
          explanation: 'Three groups of four equal twelve.',
        },
        {
          id: '90000000-0000-4000-8000-000000000003',
          questionId: ids.draftMultipleQuestion,
          answerJson: { correctOptionIds: ['a', 'b', 'd'] },
          explanation: '2, 3 and 6 divide 12 without a remainder.',
        },
      ])
      .onConflictDoUpdate({
        target: questionAnswers.id,
        set: { answerJson: questionAnswers.answerJson, explanation: questionAnswers.explanation },
      });

    await tx
      .insert(examRevisions)
      .values({
        id: ids.publishedRevision,
        examId: ids.publishedExam,
        revisionNumber: 1,
        snapshotJson: publishedSnapshot,
        publishedAt,
      })
      .onConflictDoUpdate({
        target: examRevisions.id,
        set: { snapshotJson: publishedSnapshot, publishedAt },
      });

    await tx
      .insert(attempts)
      .values({
        id: ids.sampleAttempt,
        studentId: ids.studentAda,
        examRevisionId: ids.publishedRevision,
        status: 'submitted',
        startedAt,
        submittedAt,
        score: 2,
        maxScore: 5,
      })
      .onConflictDoUpdate({
        target: attempts.id,
        set: { status: 'submitted', submittedAt, score: 2, maxScore: 5 },
      });

    await tx
      .insert(attemptAnswers)
      .values([
        {
          id: ids.sampleChoiceAnswer,
          attemptId: ids.sampleAttempt,
          questionKey: ids.publishedChoiceQuestion,
          answerJson: { selectedOptionId: 'c' },
          isCorrect: true,
          awardedPoints: 2,
        },
        {
          id: ids.sampleNumericAnswer,
          attemptId: ids.sampleAttempt,
          questionKey: ids.publishedNumericQuestion,
          answerJson: { value: 10 },
          isCorrect: false,
          awardedPoints: 0,
        },
      ])
      .onConflictDoUpdate({
        target: attemptAnswers.id,
        set: {
          answerJson: attemptAnswers.answerJson,
          isCorrect: attemptAnswers.isCorrect,
          awardedPoints: attemptAnswers.awardedPoints,
        },
      });

    await tx
      .insert(auditEvents)
      .values([
        {
          id: ids.publishEvent,
          actorId: ids.teacher,
          eventType: 'exam.published',
          entityType: 'exam_revision',
          entityId: ids.publishedRevision,
          metadata: { revisionNumber: 1 },
        },
        {
          id: ids.submitEvent,
          actorId: ids.studentAda,
          eventType: 'attempt.submitted',
          entityType: 'attempt',
          entityId: ids.sampleAttempt,
          metadata: { score: 2, maxScore: 5 },
        },
      ])
      .onConflictDoUpdate({ target: auditEvents.id, set: { metadata: auditEvents.metadata } });
  });

  console.info('Deterministic development seed applied.');
} finally {
  await client.end();
}
