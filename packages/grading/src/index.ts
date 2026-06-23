export type QuestionKind = 'single_choice' | 'multiple_choice' | 'numeric';

export type SingleChoiceConfig = { correctOptionId: string };
export type MultipleChoiceConfig = { correctOptionIds: readonly string[] };
export type NumericConfig = { expected: number; tolerance?: number };

export type GradeableQuestion =
  | { kind: 'single_choice'; points: number; config: SingleChoiceConfig }
  | { kind: 'multiple_choice'; points: number; config: MultipleChoiceConfig }
  | { kind: 'numeric'; points: number; config: NumericConfig };

export type GradingOutcome = {
  isCorrect: boolean;
  awardedPoints: number;
};

const incorrect: GradingOutcome = { isCorrect: false, awardedPoints: 0 };

function outcome(isCorrect: boolean, points: number): GradingOutcome {
  return isCorrect && Number.isFinite(points) && points >= 0
    ? { isCorrect: true, awardedPoints: points }
    : incorrect;
}

export function parseFiniteNumber(value: unknown): number | undefined {
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  if (typeof value !== 'string' || value.trim() === '') return undefined;
  const parsed = Number(value.trim());
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function gradeSingleChoice(
  selectedOptionId: unknown,
  config: SingleChoiceConfig,
  points: number,
): GradingOutcome {
  const isCorrect =
    typeof selectedOptionId === 'string' &&
    selectedOptionId.length > 0 &&
    selectedOptionId === config.correctOptionId;
  return outcome(isCorrect, points);
}

export function gradeMultipleChoice(
  selectedOptionIds: unknown,
  config: MultipleChoiceConfig,
  points: number,
): GradingOutcome {
  if (
    !Array.isArray(selectedOptionIds) ||
    selectedOptionIds.some((id) => typeof id !== 'string' || id.length === 0) ||
    new Set(selectedOptionIds).size !== selectedOptionIds.length ||
    config.correctOptionIds.length === 0 ||
    new Set(config.correctOptionIds).size !== config.correctOptionIds.length
  ) {
    return incorrect;
  }
  const selected = new Set(selectedOptionIds);
  const correct = new Set(config.correctOptionIds);
  return outcome(
    selected.size === correct.size && [...selected].every((id) => correct.has(id)),
    points,
  );
}

export function gradeNumeric(
  answer: unknown,
  config: NumericConfig,
  points: number,
): GradingOutcome {
  const value = parseFiniteNumber(answer);
  const tolerance = config.tolerance ?? 0;
  if (
    value === undefined ||
    !Number.isFinite(config.expected) ||
    !Number.isFinite(tolerance) ||
    tolerance < 0
  ) {
    return incorrect;
  }
  return outcome(Math.abs(value - config.expected) <= tolerance, points);
}

export function gradeQuestion(question: GradeableQuestion, answer: unknown): GradingOutcome {
  switch (question.kind) {
    case 'single_choice':
      return gradeSingleChoice(answer, question.config, question.points);
    case 'multiple_choice':
      return gradeMultipleChoice(answer, question.config, question.points);
    case 'numeric':
      return gradeNumeric(answer, question.config, question.points);
  }
}
