import cookie from '@fastify/cookie';
import rateLimit from '@fastify/rate-limit';
import {
  createExamRequestSchema,
  createQuestionRequestSchema,
  loginRequestSchema,
  meResponseSchema,
  registrationRequestSchema,
  reorderQuestionsRequestSchema,
  saveAnswerRequestSchema,
  studentExamsResponseSchema,
} from '@exam/contracts';
import { gradeQuestion } from '@exam/grading';
import Fastify from 'fastify';
import type { Sql } from 'postgres';
import {
  authenticateRequest,
  login,
  logout,
  registerStudent,
  sessionCookieName,
  sessionCookieOptions,
} from './auth.js';
import { createSql } from './database.js';
import { ApiError, forbidden, invalidState, notFound } from './errors.js';

type SnapshotQuestion = {
  key: string;
  kind: 'single_choice' | 'multiple_choice' | 'numeric';
  prompt: string;
  points: number;
  config: Record<string, unknown>;
  grading: Record<string, unknown>;
  explanation?: string | null;
};
type Snapshot = {
  title?: string;
  instructions?: string;
  durationMinutes?: number | null;
  feedbackPolicy: 'none' | 'score_only' | 'answers_and_explanations';
  questions: SnapshotQuestion[];
};
const presentation = (snapshot: Snapshot) =>
  snapshot.questions.map(({ key, kind, prompt, points, config }) => ({ key, kind, prompt, points, config }));

function availabilityValidationMessage(
  availableFrom: string | Date | null | undefined,
  availableUntil: string | Date | null | undefined,
) {
  if (!availableFrom || !availableUntil) return undefined;
  return new Date(availableFrom).getTime() < new Date(availableUntil).getTime()
    ? undefined
    : 'The availability end must be after the start.';
}

function questionValidationMessage(
  kind: SnapshotQuestion['kind'],
  config: Record<string, unknown>,
  answer: Record<string, unknown>,
) {
  if (kind === 'numeric') {
    if (typeof answer.expected !== 'number' || !Number.isFinite(answer.expected))
      return 'A numeric question needs a finite expected answer.';
    const tolerance = config.tolerance ?? answer.tolerance;
    if (tolerance !== undefined && (typeof tolerance !== 'number' || !Number.isFinite(tolerance) || tolerance < 0))
      return 'Numeric tolerance must be a non-negative finite number.';
    return undefined;
  }
  const options = config.options;
  if (
    !Array.isArray(options) ||
    options.length < 2 ||
    options.some(
      (option) =>
        !option ||
        typeof option !== 'object' ||
        typeof option.id !== 'string' ||
        typeof option.text !== 'string' ||
        !option.id.trim() ||
        !option.text.trim(),
    )
  )
    return 'Choice questions need at least two non-empty options.';
  const ids = new Set(options.map((option) => (option as { id: string }).id));
  if (ids.size !== options.length) return 'Choice option identifiers must be unique.';
  const optionText = new Set(
    options.map((option) => (option as { text: string }).text.trim().toLocaleLowerCase()),
  );
  if (optionText.size !== options.length) return 'Choice option text must be unique.';
  if (kind === 'single_choice')
    return typeof answer.correctOptionId === 'string' && ids.has(answer.correctOptionId)
      ? undefined
      : 'Choose one of the configured options as the correct answer.';
  return Array.isArray(answer.correctOptionIds) &&
    answer.correctOptionIds.length > 0 &&
    answer.correctOptionIds.every((id) => typeof id === 'string' && ids.has(id)) &&
    new Set(answer.correctOptionIds).size === answer.correctOptionIds.length
    ? undefined
    : 'Choose one or more configured options as the correct answers.';
}

function assertValidQuestion(
  kind: SnapshotQuestion['kind'],
  config: Record<string, unknown>,
  answer: Record<string, unknown>,
) {
  const message = questionValidationMessage(kind, config, answer);
  if (message) throw new ApiError('VALIDATION_ERROR', message, 400);
}

export function buildApp(options: { sql?: Sql } = {}) {
  const sql = options.sql ?? createSql();
  const app = Fastify({ logger: true, bodyLimit: 32 * 1024 });
  void app.register(cookie);
  void app.register(rateLimit, { global: true, max: 100, timeWindow: '1 minute' });
  app.addHook('onClose', async () => {
    if (!options.sql) await sql.end();
  });
  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ApiError)
      return reply
        .status(error.statusCode)
        .send({ error: { code: error.code, message: error.message } });
    if (typeof error === 'object' && error !== null && 'issues' in error)
      return reply
        .status(400)
        .send({ error: { code: 'VALIDATION_ERROR', message: 'Request validation failed.' } });
    app.log.error(error);
    return reply
      .status(500)
      .send({ error: { code: 'INTERNAL_ERROR', message: 'Unexpected server error.' } });
  });

  app.get('/healthz', async () => ({ status: 'ok' }));

  app.post(
    '/api/auth/login',
    { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } },
    async (request, reply) => {
      const input = loginRequestSchema.parse(request.body);
      const result = await login(sql, input.email, input.password);
      reply.setCookie(sessionCookieName, result.token, sessionCookieOptions(result.maxAge));
      return { user: result.user };
    },
  );

  app.post(
    '/api/auth/register',
    { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } },
    async (request, reply) => {
      const input = registrationRequestSchema.parse(request.body);
      const result = await registerStudent(sql, input);
      reply.setCookie(sessionCookieName, result.token, sessionCookieOptions(result.maxAge));
      return { user: result.user };
    },
  );

  app.post('/api/auth/logout', async (request, reply) => {
    await logout(sql, request);
    reply.clearCookie(sessionCookieName, sessionCookieOptions(0));
    return reply.status(204).send();
  });

  app.get('/api/me', async (request) =>
    meResponseSchema.parse({ user: await authenticateRequest(sql, request) }),
  );

  app.get('/api/student/exams', async (request) => {
    const user = await authenticateRequest(sql, request);
    if (user.role !== 'student') throw forbidden();
    const rows = await sql`
      select e.id,
        coalesce(a.snapshot ->> 'title', e.title) as title,
        coalesce(a.snapshot ->> 'instructions', e.instructions) as instructions,
        coalesce((a.snapshot ->> 'durationMinutes')::integer, e.duration_minutes) as "durationMinutes",
        coalesce(a.snapshot ->> 'feedbackPolicy', e.feedback_policy::text) as "feedbackPolicy",
        coalesce(a.status::text, 'not_started') as status,
        case when coalesce(a.snapshot ->> 'feedbackPolicy', e.feedback_policy::text) = 'none' then null else a.score end as score,
        a.id as "attemptId"
      from exams e
      left join lateral (
        select a.id, a.status, a.score, r.snapshot_json as snapshot from attempts a
        join exam_revisions r on r.id = a.exam_revision_id
        where r.exam_id = e.id and a.student_id = ${user.id}
        order by a.started_at desc limit 1
      ) a on true
      where (
        e.status = 'published'
        and (e.available_from is null or e.available_from <= now())
        and (e.available_until is null or e.available_until > now())
      ) or a.status = 'submitted'
      order by e.created_at desc
    `;
    return studentExamsResponseSchema.parse({ exams: rows });
  });

  app.get('/api/student/attempts/:id', async (request) => {
    const user = await authenticateRequest(sql, request);
    if (user.role !== 'student') throw forbidden();
    const { id } = request.params as { id: string };
    const rows =
      await sql`select a.id, a.status, a.score, a.max_score as "maxScore", r.revision_number as "revisionNumber", r.snapshot_json as snapshot from attempts a join exam_revisions r on r.id=a.exam_revision_id where a.id = ${id} and a.student_id = ${user.id}`;
    if (!rows[0]) throw notFound();
    const answers =
      await sql`select question_key as key, answer_json as answer, is_correct as "isCorrect", awarded_points as "awardedPoints" from attempt_answers where attempt_id=${id}`;
    const snapshot = rows[0].snapshot as Snapshot;
    const answersByQuestion = new Map(answers.map((answer) => [answer.key, answer]));
    const result =
      rows[0].status === 'submitted' && snapshot.feedbackPolicy !== 'none'
        ? {
            score: rows[0].score,
            maxScore: rows[0].maxScore,
            feedbackPolicy: snapshot.feedbackPolicy,
            questions:
              snapshot.feedbackPolicy === 'answers_and_explanations'
                ? snapshot.questions.map((question) => {
                    const answer = answersByQuestion.get(question.key);
                    return {
                      key: question.key,
                      isCorrect: answer?.isCorrect ?? false,
                      awardedPoints: answer?.awardedPoints ?? 0,
                      correctAnswer: question.grading,
                      explanation: question.explanation ?? null,
                    };
                  })
                : undefined,
          }
        : undefined;
    return {
      attempt: {
        ...rows[0],
        score: snapshot.feedbackPolicy === 'none' ? null : rows[0].score,
        snapshot: undefined,
        title: snapshot.title ?? 'Exam',
        instructions: snapshot.instructions ?? '',
        durationMinutes: snapshot.durationMinutes ?? null,
        questions: presentation(snapshot),
        answers: Object.fromEntries(answers.map((answer) => [answer.key, answer.answer])),
        feedbackPolicy: snapshot.feedbackPolicy,
        result,
      },
    };
  });

  app.post('/api/student/exams/:id/start', async (request) => {
    const user = await authenticateRequest(sql, request);
    if (user.role !== 'student') throw forbidden();
    const { id } = request.params as { id: string };
    const revision =
      await sql`select r.id, r.snapshot_json as snapshot from exams e join exam_revisions r on r.exam_id=e.id where e.id=${id} and e.status='published' and (e.available_from is null or e.available_from <= now()) and (e.available_until is null or e.available_until > now()) order by r.revision_number desc limit 1`;
    if (!revision[0]) throw notFound();
    const existing =
      await sql`select id, status, score, max_score as "maxScore" from attempts where student_id=${user.id} and exam_revision_id=${revision[0].id} order by started_at desc limit 1`;
    const snapshot = revision[0].snapshot as Snapshot;
    const created = existing[0]
      ? undefined
      : (
          await sql`insert into attempts (student_id, exam_revision_id, max_score) values (${user.id}, ${revision[0].id}, ${snapshot.questions.reduce((sum, question) => sum + question.points, 0)}) on conflict do nothing returning id, status, score, max_score as "maxScore"`
        )[0];
    const attempt =
      existing[0] ??
      created ??
      (
        await sql`select id, status, score, max_score as "maxScore" from attempts where student_id=${user.id} and exam_revision_id=${revision[0].id} order by started_at desc limit 1`
      )[0];
    return {
      attempt: {
        ...attempt,
        questions: presentation(snapshot),
        answers: {},
        feedbackPolicy: snapshot.feedbackPolicy,
      },
    };
  });

  app.put('/api/student/attempts/:id/answers/:key', async (request) => {
    const user = await authenticateRequest(sql, request);
    if (user.role !== 'student') throw forbidden();
    const { id, key } = request.params as { id: string; key: string };
    const { answer } = saveAnswerRequestSchema.parse(request.body);
    const rows =
      await sql`select a.status, r.snapshot_json as snapshot from attempts a join exam_revisions r on r.id=a.exam_revision_id where a.id=${id} and a.student_id=${user.id}`;
    if (!rows[0]) throw notFound();
    if (rows[0].status !== 'in_progress')
      throw new ApiError('INVALID_STATE', 'This attempt is no longer editable.', 409);
    if (!(rows[0].snapshot as Snapshot).questions.some((question) => question.key === key))
      throw notFound();
    await sql`insert into attempt_answers (attempt_id, question_key, answer_json) values (${id}, ${key}, ${sql.json(answer as Parameters<typeof sql.json>[0])}) on conflict (attempt_id, question_key) do update set answer_json=excluded.answer_json`;
    return { saved: true };
  });

  app.post('/api/student/attempts/:id/submit', async (request) => {
    const user = await authenticateRequest(sql, request);
    if (user.role !== 'student') throw forbidden();
    const { id } = request.params as { id: string };
    return sql.begin(async (tx) => {
      const rows =
        await tx`select a.status, a.score, a.max_score as "maxScore", r.snapshot_json as snapshot from attempts a join exam_revisions r on r.id=a.exam_revision_id where a.id=${id} and a.student_id=${user.id} for update`;
      if (!rows[0]) throw notFound();
      const snapshot = rows[0].snapshot as Snapshot;
      if (rows[0].status === 'submitted')
        return snapshot.feedbackPolicy === 'none'
          ? { feedbackPolicy: snapshot.feedbackPolicy }
          : {
              score: rows[0].score,
              maxScore: rows[0].maxScore,
              feedbackPolicy: snapshot.feedbackPolicy,
            };
      if (rows[0].status !== 'in_progress')
        throw new ApiError('INVALID_STATE', 'This attempt cannot be submitted.', 409);
      const stored =
        await tx`select question_key as key, answer_json as answer from attempt_answers where attempt_id=${id}`;
      const answers = new Map(stored.map((item) => [item.key, item.answer]));
      let score = 0;
      for (const question of snapshot.questions) {
        const result = gradeQuestion(
          { kind: question.kind, points: question.points, config: question.grading as never },
          answers.get(question.key),
        );
        score += result.awardedPoints;
        await tx`insert into attempt_answers (attempt_id, question_key, answer_json, is_correct, awarded_points) values (${id}, ${question.key}, ${sql.json(answers.get(question.key) ?? null)}, ${result.isCorrect}, ${result.awardedPoints}) on conflict (attempt_id, question_key) do update set is_correct=excluded.is_correct, awarded_points=excluded.awarded_points`;
      }
      await tx`update attempts set status='submitted', submitted_at=now(), score=${score} where id=${id}`;
      return snapshot.feedbackPolicy === 'none'
        ? { feedbackPolicy: snapshot.feedbackPolicy }
        : { score, maxScore: rows[0].maxScore, feedbackPolicy: snapshot.feedbackPolicy };
    });
  });

  app.get('/api/teacher/exams/:id/results', async (request) => {
    const user = await authenticateRequest(sql, request);
    if (user.role !== 'teacher' && user.role !== 'admin') throw forbidden();
    const { id } = request.params as { id: string };
    const owned = await sql`select id from exams where id = ${id} and owner_id = ${user.id}`;
    if (!owned[0]) throw notFound();
    const results = await sql`
      select a.id, a.status, a.score, a.max_score as "maxScore", a.started_at as "startedAt", a.submitted_at as "submittedAt", r.revision_number as "revisionNumber",
        u.display_name as "studentName"
      from attempts a join exam_revisions r on r.id = a.exam_revision_id
      join users u on u.id = a.student_id where r.exam_id = ${id} order by a.submitted_at desc nulls last
    `;
    return { results };
  });

  app.get('/api/teacher/attempts/:id', async (request) => {
    const user = await authenticateRequest(sql, request);
    if (user.role !== 'teacher' && user.role !== 'admin') throw forbidden();
    const { id } = request.params as { id: string };
    const attempt = (await sql`select a.id, a.status, a.score, a.max_score as "maxScore", a.started_at as "startedAt", a.submitted_at as "submittedAt", r.revision_number as "revisionNumber", u.display_name as "studentName", r.snapshot_json as snapshot from attempts a join exam_revisions r on r.id=a.exam_revision_id join exams e on e.id=r.exam_id join users u on u.id=a.student_id where a.id=${id} and e.owner_id=${user.id}`)[0];
    if (!attempt) throw notFound();
    const answers = await sql`select question_key as key, answer_json as answer, is_correct as "isCorrect", awarded_points as "awardedPoints" from attempt_answers where attempt_id=${id} order by created_at`;
    const answersByQuestion = new Map(answers.map((answer) => [answer.key, answer]));
    const snapshot = attempt.snapshot as Snapshot;
    return {
      attempt: {
        ...attempt,
        snapshot: undefined,
        title: snapshot.title ?? 'Exam',
        questions: snapshot.questions.map((question) => {
          const answer = answersByQuestion.get(question.key);
          return {
            key: question.key,
            prompt: question.prompt,
            points: question.points,
            answer: answer?.answer ?? null,
            isCorrect: answer?.isCorrect ?? null,
            awardedPoints: answer?.awardedPoints ?? null,
          };
        }),
      },
    };
  });

  app.get('/api/teacher/exams', async (request) => {
    const user = await authenticateRequest(sql, request);
    if (user.role !== 'teacher' && user.role !== 'admin') throw forbidden();
    return {
      exams:
        await sql`select id, title, instructions, status, duration_minutes as "durationMinutes", feedback_policy as "feedbackPolicy", available_from as "availableFrom", available_until as "availableUntil" from exams where owner_id=${user.id} order by updated_at desc`,
    };
  });
  app.post('/api/teacher/exams', async (request) => {
    const user = await authenticateRequest(sql, request);
    if (user.role !== 'teacher' && user.role !== 'admin') throw forbidden();
    const input = createExamRequestSchema.parse(request.body);
    const availabilityError = availabilityValidationMessage(input.availableFrom, input.availableUntil);
    if (availabilityError) throw new ApiError('VALIDATION_ERROR', availabilityError, 400);
    const exam = (
      await sql`insert into exams (owner_id,title,instructions,duration_minutes,feedback_policy,available_from,available_until) values (${user.id},${input.title},${input.instructions},${input.durationMinutes ?? null},${input.feedbackPolicy},${input.availableFrom ?? null},${input.availableUntil ?? null}) returning id,title,instructions,status,duration_minutes as "durationMinutes",feedback_policy as "feedbackPolicy",available_from as "availableFrom",available_until as "availableUntil"`
    )[0];
    return { exam };
  });
  app.get('/api/teacher/exams/:id', async (request) => {
    const user = await authenticateRequest(sql, request);
    if (user.role !== 'teacher' && user.role !== 'admin') throw forbidden();
    const { id } = request.params as { id: string };
    const exam = (await sql`select id,title,instructions,status,duration_minutes as "durationMinutes",feedback_policy as "feedbackPolicy",available_from as "availableFrom",available_until as "availableUntil" from exams where id=${id} and owner_id=${user.id}`)[0];
    if (!exam) throw notFound();
    const questions = await sql`select q.id,q.position,q.kind,q.prompt,q.points,q.config_json as config,a.answer_json as answer,a.explanation from questions q join question_answers a on a.question_id=q.id where q.exam_id=${id} order by q.position`;
    return { exam, questions };
  });
  app.patch('/api/teacher/exams/:id', async (request) => {
    const user = await authenticateRequest(sql, request);
    if (user.role !== 'teacher' && user.role !== 'admin') throw forbidden();
    const { id } = request.params as { id: string };
    const input = createExamRequestSchema.partial().parse(request.body);
    return sql.begin(async (tx) => {
      const current = (await tx`select available_from as "availableFrom", available_until as "availableUntil" from exams where id=${id} and owner_id=${user.id} and status='draft' for update`)[0];
      if (!current) throw notFound();
      const availableFrom = input.availableFrom === undefined ? current.availableFrom : input.availableFrom;
      const availableUntil = input.availableUntil === undefined ? current.availableUntil : input.availableUntil;
      const availabilityError = availabilityValidationMessage(availableFrom, availableUntil);
      if (availabilityError) throw new ApiError('VALIDATION_ERROR', availabilityError, 400);
      const exam = (
        await tx`update exams set title=case when ${input.title !== undefined} then ${input.title ?? null} else title end, instructions=case when ${input.instructions !== undefined} then ${input.instructions ?? null} else instructions end, duration_minutes=case when ${input.durationMinutes !== undefined} then ${input.durationMinutes ?? null} else duration_minutes end, feedback_policy=case when ${input.feedbackPolicy !== undefined} then ${input.feedbackPolicy ?? null} else feedback_policy end, available_from=case when ${input.availableFrom !== undefined} then ${input.availableFrom ?? null} else available_from end, available_until=case when ${input.availableUntil !== undefined} then ${input.availableUntil ?? null} else available_until end where id=${id} and owner_id=${user.id} and status='draft' returning id,title,instructions,status,duration_minutes as "durationMinutes",feedback_policy as "feedbackPolicy",available_from as "availableFrom",available_until as "availableUntil"`
      )[0];
      return { exam };
    });
  });
  app.post('/api/teacher/exams/:id/questions', async (request) => {
    const user = await authenticateRequest(sql, request);
    if (user.role !== 'teacher' && user.role !== 'admin') throw forbidden();
    const { id } = request.params as { id: string };
    const input = createQuestionRequestSchema.parse(request.body);
    assertValidQuestion(input.kind, input.config, input.answer);
    const owned =
      await sql`select id from exams where id=${id} and owner_id=${user.id} and status='draft'`;
    if (!owned[0]) throw notFound();
    const position = Number(
      (
        await sql`select coalesce(max(position),0)+1 as position from questions where exam_id=${id}`
      )[0].position,
    );
    const question = (
      await sql`insert into questions (exam_id,position,kind,prompt,points,config_json) values (${id},${position},${input.kind},${input.prompt},${input.points},${sql.json(input.config as Parameters<typeof sql.json>[0])}) returning id,position,kind,prompt,points`
    )[0];
    await sql`insert into question_answers (question_id,answer_json,explanation) values (${question.id},${sql.json(input.answer as Parameters<typeof sql.json>[0])},${input.explanation ?? null})`;
    return { question };
  });

  app.patch('/api/teacher/exams/:examId/questions/:questionId', async (request) => {
    const user = await authenticateRequest(sql, request);
    if (user.role !== 'teacher' && user.role !== 'admin') throw forbidden();
    const { examId, questionId } = request.params as { examId: string; questionId: string };
    const input = createQuestionRequestSchema.parse(request.body);
    assertValidQuestion(input.kind, input.config, input.answer);
    return sql.begin(async (tx) => {
      const owned =
        await tx`select id from exams where id=${examId} and owner_id=${user.id} and status='draft' for update`;
      if (!owned[0]) throw notFound();
      const question = (
        await tx`update questions set kind=${input.kind}, prompt=${input.prompt}, points=${input.points}, config_json=${tx.json(input.config as Parameters<typeof tx.json>[0])} where id=${questionId} and exam_id=${examId} returning id,position,kind,prompt,points,config_json as config`
      )[0];
      if (!question) throw notFound();
      await tx`update question_answers set answer_json=${tx.json(input.answer as Parameters<typeof tx.json>[0])}, explanation=${input.explanation ?? null} where question_id=${questionId}`;
      return { question: { ...question, answer: input.answer, explanation: input.explanation ?? null } };
    });
  });

  app.post('/api/teacher/exams/:examId/questions/:questionId/duplicate', async (request) => {
    const user = await authenticateRequest(sql, request);
    if (user.role !== 'teacher' && user.role !== 'admin') throw forbidden();
    const { examId, questionId } = request.params as { examId: string; questionId: string };
    return sql.begin(async (tx) => {
      const owned =
        await tx`select id from exams where id=${examId} and owner_id=${user.id} and status='draft' for update`;
      if (!owned[0]) throw notFound();
      const source = (
        await tx`select q.kind,q.prompt,q.points,q.config_json as config,a.answer_json as answer,a.explanation from questions q join question_answers a on a.question_id=q.id where q.id=${questionId} and q.exam_id=${examId}`
      )[0];
      if (!source) throw notFound();
      const position = Number(
        (await tx`select coalesce(max(position),0)+1 as position from questions where exam_id=${examId}`)[0]
          .position,
      );
      const question = (
        await tx`insert into questions (exam_id,position,kind,prompt,points,config_json) values (${examId},${position},${source.kind},${source.prompt},${source.points},${tx.json(source.config as Parameters<typeof tx.json>[0])}) returning id,position,kind,prompt,points,config_json as config`
      )[0];
      await tx`insert into question_answers (question_id,answer_json,explanation) values (${question.id},${tx.json(source.answer as Parameters<typeof tx.json>[0])},${source.explanation})`;
      return { question: { ...question, answer: source.answer, explanation: source.explanation } };
    });
  });

  app.put('/api/teacher/exams/:id/questions/order', async (request) => {
    const user = await authenticateRequest(sql, request);
    if (user.role !== 'teacher' && user.role !== 'admin') throw forbidden();
    const { id } = request.params as { id: string };
    const { questionIds } = reorderQuestionsRequestSchema.parse(request.body);
    if (new Set(questionIds).size !== questionIds.length)
      throw new ApiError('VALIDATION_ERROR', 'Question order cannot contain duplicates.', 400);
    return sql.begin(async (tx) => {
      const owned =
        await tx`select id from exams where id=${id} and owner_id=${user.id} and status='draft' for update`;
      if (!owned[0]) throw notFound();
      const questions = await tx`select id from questions where exam_id=${id} order by position`;
      if (
        questions.length !== questionIds.length ||
        questions.some((question) => !questionIds.includes(question.id))
      )
        throw new ApiError('VALIDATION_ERROR', 'Question order must include every question exactly once.', 400);
      const offset = questions.length + 1;
      await tx`update questions set position=position+${offset} where exam_id=${id}`;
      for (const [index, questionId] of questionIds.entries())
        await tx`update questions set position=${index + 1} where id=${questionId} and exam_id=${id}`;
      return { questionIds };
    });
  });

  app.delete('/api/teacher/exams/:examId/questions/:questionId', async (request) => {
    const user = await authenticateRequest(sql, request);
    if (user.role !== 'teacher' && user.role !== 'admin') throw forbidden();
    const { examId, questionId } = request.params as { examId: string; questionId: string };
    return sql.begin(async (tx) => {
      const owned =
        await tx`select id from exams where id=${examId} and owner_id=${user.id} and status='draft' for update`;
      if (!owned[0]) throw notFound();
      const deleted =
        await tx`delete from questions where id=${questionId} and exam_id=${examId} returning id`;
      if (!deleted[0]) throw notFound();
      const remaining = await tx`select id from questions where exam_id=${examId} order by position`;
      const offset = remaining.length + 1;
      await tx`update questions set position=position+${offset} where exam_id=${examId}`;
      for (const [index, question] of remaining.entries())
        await tx`update questions set position=${index + 1} where id=${question.id} and exam_id=${examId}`;
      return { deletedId: questionId };
    });
  });

  app.post('/api/teacher/exams/:id/publish', async (request) => {
    const user = await authenticateRequest(sql, request);
    if (user.role !== 'teacher' && user.role !== 'admin') throw forbidden();
    const { id } = request.params as { id: string };
    return sql.begin(async (tx) => {
      const exam = (await tx`select id, status, title, instructions, duration_minutes as "durationMinutes", feedback_policy as "feedbackPolicy", available_from as "availableFrom", available_until as "availableUntil" from exams where id=${id} and owner_id=${user.id} for update`)[0];
      if (!exam) throw notFound();
      if (exam.status !== 'draft') throw invalidState('This exam is already published. Unpublish it before publishing a new revision.');
      const availabilityError = availabilityValidationMessage(exam.availableFrom, exam.availableUntil);
      if (availabilityError) throw new ApiError('VALIDATION_ERROR', availabilityError, 400);
      const questions = await tx`select q.id, q.position, q.kind, q.prompt, q.points, q.config_json as config, a.answer_json as answer, a.explanation from questions q join question_answers a on a.question_id=q.id where q.exam_id=${id} order by q.position`;
      const blockers = !questions.length
        ? ['Add at least one auto-gradable question before publishing.']
        : questions.flatMap((question, index) => {
            const message = questionValidationMessage(question.kind, question.config, question.answer);
            return message ? [`Question ${index + 1}: ${message}`] : [];
          });
      if (blockers.length)
        throw new ApiError('VALIDATION_ERROR', blockers.join(' '), 400);
      const revisionNumber = Number((await tx`select coalesce(max(revision_number), 0) + 1 as revision from exam_revisions where exam_id=${id}`)[0].revision);
      const snapshot: Snapshot = {
        title: exam.title,
        instructions: exam.instructions,
        durationMinutes: exam.durationMinutes,
        feedbackPolicy: exam.feedbackPolicy,
        questions: questions.map((question) => ({
          key: question.id,
          kind: question.kind,
          prompt: question.prompt,
          points: question.points,
          config: question.config,
          grading: question.answer,
          explanation: question.explanation,
        })),
      };
      const revision = (await tx`insert into exam_revisions (exam_id, revision_number, snapshot_json, published_at) values (${id}, ${revisionNumber}, ${tx.json(snapshot as Parameters<typeof tx.json>[0])}, now()) returning id, revision_number as "revisionNumber"`)[0];
      await tx`update exams set status='published' where id=${id}`;
      await tx`insert into audit_events (actor_id, event_type, entity_type, entity_id, metadata) values (${user.id}, 'exam.published', 'exam_revision', ${revision.id}, ${tx.json({ revisionNumber } as Parameters<typeof tx.json>[0])})`;
      return { revision };
    });
  });

  app.post('/api/teacher/exams/:id/unpublish', async (request) => {
    const user = await authenticateRequest(sql, request);
    if (user.role !== 'teacher' && user.role !== 'admin') throw forbidden();
    const { id } = request.params as { id: string };
    return sql.begin(async (tx) => {
      const current = (await tx`select id, status from exams where id=${id} and owner_id=${user.id} for update`)[0];
      if (!current) throw notFound();
      if (current.status !== 'published') throw invalidState('Only a published exam can be returned to draft.');
      const exam = (await tx`update exams set status='draft' where id=${id} returning id, status`)[0];
      await tx`insert into audit_events (actor_id, event_type, entity_type, entity_id, metadata) values (${user.id}, 'exam.unpublished', 'exam', ${exam.id}, ${tx.json({} as Parameters<typeof tx.json>[0])})`;
      return { exam };
    });
  });

  return app;
}
