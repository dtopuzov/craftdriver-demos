import { z } from 'zod';

export const userRoleSchema = z.enum(['student', 'teacher', 'admin']);
export type UserRole = z.infer<typeof userRoleSchema>;
export const feedbackPolicySchema = z.enum(['none', 'score_only', 'answers_and_explanations']);
export type FeedbackPolicy = z.infer<typeof feedbackPolicySchema>;
export const questionKindSchema = z.enum(['single_choice', 'multiple_choice', 'numeric']);
export type QuestionKind = z.infer<typeof questionKindSchema>;

export const healthResponseSchema = z.object({ status: z.literal('ok') });
export type HealthResponse = z.infer<typeof healthResponseSchema>;

export const errorCodeSchema = z.enum([
  'UNAUTHENTICATED',
  'FORBIDDEN',
  'INVALID_STATE',
  'VALIDATION_ERROR',
  'NOT_FOUND',
  'RATE_LIMITED',
  'INTERNAL_ERROR',
]);
export type ErrorCode = z.infer<typeof errorCodeSchema>;
export const errorResponseSchema = z.object({
  error: z.object({ code: errorCodeSchema, message: z.string() }),
});
export type ErrorResponse = z.infer<typeof errorResponseSchema>;

export const loginRequestSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(1).max(256),
});
export type LoginRequest = z.infer<typeof loginRequestSchema>;

export const registrationRequestSchema = z.object({
  displayName: z.string().trim().min(2, 'Enter a name with at least 2 characters.').max(100),
  email: z.string().trim().toLowerCase().email('Enter a valid email address.').max(254),
  password: z.string().min(8, 'Use at least 8 characters for your password.').max(256),
});
export type RegistrationRequest = z.infer<typeof registrationRequestSchema>;

export const currentUserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  displayName: z.string(),
  role: userRoleSchema,
});
export type CurrentUser = z.infer<typeof currentUserSchema>;
export const meResponseSchema = z.object({ user: currentUserSchema });
export type MeResponse = z.infer<typeof meResponseSchema>;

export const studentExamSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  instructions: z.string(),
  durationMinutes: z.number().int().positive().nullable(),
  feedbackPolicy: feedbackPolicySchema,
  status: z.enum(['not_started', 'in_progress', 'submitted', 'expired']),
  score: z.number().int().nullable(),
  attemptId: z.string().uuid().nullable(),
});
export const studentExamsResponseSchema = z.object({ exams: z.array(studentExamSchema) });
export type StudentExamsResponse = z.infer<typeof studentExamsResponseSchema>;

export const questionPresentationSchema = z.object({
  key: z.string().uuid(),
  kind: questionKindSchema,
  prompt: z.string(),
  points: z.number().int().nonnegative().optional(),
  config: z.record(z.string(), z.unknown()),
});
export type QuestionPresentation = z.infer<typeof questionPresentationSchema>;

export const attemptResultQuestionSchema = z.object({
  key: z.string().uuid(),
  isCorrect: z.boolean(),
  awardedPoints: z.number().int().nonnegative(),
  correctAnswer: z.record(z.string(), z.unknown()),
  explanation: z.string().nullable(),
});
export type AttemptResultQuestion = z.infer<typeof attemptResultQuestionSchema>;

export const attemptResultSchema = z.object({
  score: z.number().int().nonnegative(),
  maxScore: z.number().int().nonnegative(),
  feedbackPolicy: z.enum(['score_only', 'answers_and_explanations']),
  questions: z.array(attemptResultQuestionSchema).optional(),
});
export type AttemptResult = z.infer<typeof attemptResultSchema>;

export const attemptSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(['in_progress', 'submitted', 'expired']),
  questions: z.array(questionPresentationSchema),
  answers: z.record(z.string(), z.unknown()),
  score: z.number().int().nullable(),
  maxScore: z.number().int(),
  revisionNumber: z.number().int().positive().optional(),
  title: z.string().optional(),
  instructions: z.string().optional(),
  durationMinutes: z.number().int().positive().nullable().optional(),
  feedbackPolicy: feedbackPolicySchema,
  result: attemptResultSchema.optional(),
});
export type Attempt = z.infer<typeof attemptSchema>;
export const attemptResponseSchema = z.object({ attempt: attemptSchema });
export type AttemptResponse = z.infer<typeof attemptResponseSchema>;
export const startAttemptResponseSchema = z.object({
  attempt: attemptSchema.pick({
    id: true,
    status: true,
    questions: true,
    answers: true,
    score: true,
    maxScore: true,
    feedbackPolicy: true,
  }),
});
export type StartAttemptResponse = z.infer<typeof startAttemptResponseSchema>;

export const saveAnswerRequestSchema = z.object({ answer: z.unknown() });
export const createExamRequestSchema = z.object({
  title: z.string().trim().min(1).max(200),
  instructions: z.string().max(10_000).default(''),
  durationMinutes: z.number().int().positive().nullable().optional(),
  feedbackPolicy: feedbackPolicySchema.default('score_only'),
  availableFrom: z.string().datetime({ offset: true }).nullable().optional(),
  availableUntil: z.string().datetime({ offset: true }).nullable().optional(),
});
export const createQuestionRequestSchema = z.object({
  kind: questionKindSchema,
  prompt: z.string().trim().min(1).max(10_000),
  points: z.number().int().nonnegative(),
  config: z.record(z.string(), z.unknown()),
  answer: z.record(z.string(), z.unknown()),
  explanation: z.string().max(10_000).optional(),
});
export const reorderQuestionsRequestSchema = z.object({
  questionIds: z.array(z.string().uuid()).min(1),
});

export const teacherExamSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  instructions: z.string(),
  status: z.enum(['draft', 'published', 'unpublished']),
  durationMinutes: z.number().int().positive().nullable(),
  feedbackPolicy: feedbackPolicySchema,
  availableFrom: z.string().datetime({ offset: true }).nullable().or(z.date()).optional(),
  availableUntil: z.string().datetime({ offset: true }).nullable().or(z.date()).optional(),
});
export type TeacherExam = z.infer<typeof teacherExamSchema>;
export const teacherExamsResponseSchema = z.object({ exams: z.array(teacherExamSchema) });
export type TeacherExamsResponse = z.infer<typeof teacherExamsResponseSchema>;

export const teacherQuestionSchema = z.object({
  id: z.string().uuid(),
  position: z.number().int().positive(),
  kind: questionKindSchema,
  prompt: z.string(),
  points: z.number().int().nonnegative(),
  config: z.record(z.string(), z.unknown()),
  answer: z.record(z.string(), z.unknown()),
  explanation: z.string().nullable(),
});
export type TeacherQuestion = z.infer<typeof teacherQuestionSchema>;
export const teacherExamDetailResponseSchema = z.object({
  exam: teacherExamSchema,
  questions: z.array(teacherQuestionSchema),
});
export type TeacherExamDetailResponse = z.infer<typeof teacherExamDetailResponseSchema>;
export const teacherExamResponseSchema = z.object({ exam: teacherExamSchema });
export type TeacherExamResponse = z.infer<typeof teacherExamResponseSchema>;

export const teacherResultRowSchema = z.object({
  id: z.string().uuid(),
  studentName: z.string(),
  status: z.enum(['in_progress', 'submitted', 'expired']),
  score: z.number().int().nullable(),
  maxScore: z.number().int().nonnegative(),
  startedAt: z.string().datetime({ offset: true }).or(z.date()),
  submittedAt: z.string().datetime({ offset: true }).nullable().or(z.date()),
  revisionNumber: z.number().int().positive(),
});
export type TeacherResultRow = z.infer<typeof teacherResultRowSchema>;
export const teacherResultsResponseSchema = z.object({ results: z.array(teacherResultRowSchema) });
export type TeacherResultsResponse = z.infer<typeof teacherResultsResponseSchema>;

export const teacherAttemptQuestionSchema = z.object({
  key: z.string().uuid(),
  prompt: z.string(),
  points: z.number().int().nonnegative(),
  answer: z.unknown().nullable(),
  isCorrect: z.boolean().nullable(),
  awardedPoints: z.number().int().nonnegative().nullable(),
});
export type TeacherAttemptQuestion = z.infer<typeof teacherAttemptQuestionSchema>;
export const teacherAttemptDetailSchema = z.object({
  title: z.string(),
  studentName: z.string(),
  status: z.enum(['in_progress', 'submitted', 'expired']),
  score: z.number().int().nullable(),
  maxScore: z.number().int().nonnegative(),
  startedAt: z.string().datetime({ offset: true }).or(z.date()),
  submittedAt: z.string().datetime({ offset: true }).nullable().or(z.date()),
  revisionNumber: z.number().int().positive(),
  questions: z.array(teacherAttemptQuestionSchema),
});
export type TeacherAttemptDetail = z.infer<typeof teacherAttemptDetailSchema>;
export const teacherAttemptDetailResponseSchema = z.object({ attempt: teacherAttemptDetailSchema });
export type TeacherAttemptDetailResponse = z.infer<typeof teacherAttemptDetailResponseSchema>;
