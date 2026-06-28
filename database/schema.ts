import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
};

export const userRole = pgEnum('user_role', ['student', 'teacher', 'admin']);
export const examStatus = pgEnum('exam_status', ['draft', 'published', 'unpublished']);
export const feedbackPolicy = pgEnum('feedback_policy', [
  'none',
  'score_only',
  'answers_and_explanations',
]);
export const questionKind = pgEnum('question_kind', [
  'single_choice',
  'multiple_choice',
  'numeric',
]);
export const attemptStatus = pgEnum('attempt_status', ['in_progress', 'submitted', 'expired']);

export const users = pgTable(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    email: text('email').notNull(),
    passwordHash: text('password_hash').notNull(),
    displayName: text('display_name').notNull(),
    role: userRole('role').notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('users_email_unique').on(table.email),
    check('users_email_normalized', sql`${table.email} = lower(${table.email})`),
  ],
);

export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('sessions_token_hash_unique').on(table.tokenHash),
    index('sessions_user_id_idx').on(table.userId),
  ],
);

export const exams = pgTable(
  'exams',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    title: text('title').notNull(),
    instructions: text('instructions').notNull().default(''),
    status: examStatus('status').notNull().default('draft'),
    durationMinutes: integer('duration_minutes'),
    availableFrom: timestamp('available_from', { withTimezone: true }),
    availableUntil: timestamp('available_until', { withTimezone: true }),
    feedbackPolicy: feedbackPolicy('feedback_policy').notNull().default('score_only'),
    ...timestamps,
  },
  (table) => [
    index('exams_owner_id_idx').on(table.ownerId),
    index('exams_published_availability_idx').on(
      table.status,
      table.availableFrom,
      table.availableUntil,
    ),
    check(
      'exams_duration_non_negative',
      sql`${table.durationMinutes} is null or ${table.durationMinutes} > 0`,
    ),
    check(
      'exams_availability_order',
      sql`${table.availableUntil} is null or ${table.availableFrom} is null or ${table.availableFrom} < ${table.availableUntil}`,
    ),
  ],
);

export const examRevisions = pgTable(
  'exam_revisions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    examId: uuid('exam_id')
      .notNull()
      .references(() => exams.id, { onDelete: 'cascade' }),
    revisionNumber: integer('revision_number').notNull(),
    snapshotJson: jsonb('snapshot_json').notNull(),
    publishedAt: timestamp('published_at', { withTimezone: true }).notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('exam_revisions_exam_revision_unique').on(table.examId, table.revisionNumber),
    index('exam_revisions_exam_id_idx').on(table.examId),
    check('exam_revisions_revision_positive', sql`${table.revisionNumber} > 0`),
  ],
);

export const questions = pgTable(
  'questions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    examId: uuid('exam_id')
      .notNull()
      .references(() => exams.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
    kind: questionKind('kind').notNull(),
    prompt: text('prompt').notNull(),
    points: integer('points').notNull(),
    configJson: jsonb('config_json').notNull().default({}),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('questions_exam_position_unique').on(table.examId, table.position),
    check('questions_position_positive', sql`${table.position} > 0`),
    check('questions_points_non_negative', sql`${table.points} >= 0`),
  ],
);

export const questionAnswers = pgTable(
  'question_answers',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    questionId: uuid('question_id')
      .notNull()
      .references(() => questions.id, { onDelete: 'cascade' }),
    answerJson: jsonb('answer_json').notNull(),
    explanation: text('explanation'),
    ...timestamps,
  },
  (table) => [uniqueIndex('question_answers_question_id_unique').on(table.questionId)],
);

export const attempts = pgTable(
  'attempts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    studentId: uuid('student_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    examRevisionId: uuid('exam_revision_id')
      .notNull()
      .references(() => examRevisions.id, { onDelete: 'restrict' }),
    status: attemptStatus('status').notNull().default('in_progress'),
    startedAt: timestamp('started_at', { withTimezone: true }).defaultNow().notNull(),
    submittedAt: timestamp('submitted_at', { withTimezone: true }),
    score: integer('score'),
    maxScore: integer('max_score').notNull(),
    ...timestamps,
  },
  (table) => [
    index('attempts_student_id_idx').on(table.studentId),
    index('attempts_revision_id_idx').on(table.examRevisionId),
    uniqueIndex('attempts_one_active_per_student_revision')
      .on(table.studentId, table.examRevisionId)
      .where(sql`${table.status} = 'in_progress'`),
    check(
      'attempts_scores_non_negative',
      sql`(${table.score} is null or ${table.score} >= 0) and ${table.maxScore} >= 0`,
    ),
  ],
);

export const attemptAnswers = pgTable(
  'attempt_answers',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    attemptId: uuid('attempt_id')
      .notNull()
      .references(() => attempts.id, { onDelete: 'cascade' }),
    questionKey: text('question_key').notNull(),
    answerJson: jsonb('answer_json').notNull(),
    isCorrect: boolean('is_correct'),
    awardedPoints: integer('awarded_points'),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('attempt_answers_attempt_question_unique').on(table.attemptId, table.questionKey),
    check(
      'attempt_answers_points_non_negative',
      sql`${table.awardedPoints} is null or ${table.awardedPoints} >= 0`,
    ),
  ],
);

export const auditEvents = pgTable(
  'audit_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    actorId: uuid('actor_id').references(() => users.id, { onDelete: 'set null' }),
    eventType: text('event_type').notNull(),
    entityType: text('entity_type').notNull(),
    entityId: uuid('entity_id').notNull(),
    metadata: jsonb('metadata').notNull().default({}),
    ...timestamps,
  },
  (table) => [
    index('audit_events_entity_idx').on(table.entityType, table.entityId),
    index('audit_events_actor_idx').on(table.actorId),
  ],
);
