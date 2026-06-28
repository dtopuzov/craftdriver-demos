import type { QuestionKind, TeacherQuestion } from '@exam/contracts';

export type QuestionDraft = {
  kind: QuestionKind;
  prompt: string;
  points: number;
  options: string;
  answer: string;
  tolerance: number;
  explanation: string;
};

export type ExamDetails = {
  title: string;
  instructions: string;
  durationMinutes: number | null;
  feedbackPolicy: 'none' | 'score_only' | 'answers_and_explanations';
  availableFrom: string | null;
  availableUntil: string | null;
};

export type QuestionPayload = {
  kind: QuestionKind;
  prompt: string;
  points: number;
  config: Record<string, unknown>;
  answer: Record<string, unknown>;
  explanation?: string;
};

export const emptyQuestionDraft: QuestionDraft = {
  kind: 'single_choice',
  prompt: '',
  points: 1,
  options: 'First option\nSecond option',
  answer: 'a',
  tolerance: 0,
  explanation: '',
};

export function toDateTimeLocal(value: string | Date | null | undefined) {
  return value ? new Date(value).toISOString().slice(0, 16) : '';
}

export function optionsFromText(text: string) {
  return text
    .split('\n')
    .map((option) => option.trim())
    .filter(Boolean)
    .map((text, index) => ({ id: String.fromCharCode(97 + index), text }));
}

export function optionIdsFromAnswer(answer: string) {
  return answer
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);
}

function optionText(question: TeacherQuestion) {
  const options = question.config.options;
  return Array.isArray(options)
    ? options
        .flatMap((option) =>
          option &&
          typeof option === 'object' &&
          'text' in option &&
          typeof option.text === 'string'
            ? [option.text]
            : [],
        )
        .join('\n')
    : '';
}

export function questionToDraft(question: TeacherQuestion): QuestionDraft {
  const answer =
    question.kind === 'numeric'
      ? String(question.answer.expected ?? '')
      : question.kind === 'multiple_choice'
        ? Array.isArray(question.answer.correctOptionIds)
          ? question.answer.correctOptionIds.join(',')
          : ''
        : typeof question.answer.correctOptionId === 'string'
          ? question.answer.correctOptionId
          : '';
  const tolerance =
    typeof question.config.tolerance === 'number'
      ? question.config.tolerance
      : typeof question.answer.tolerance === 'number'
        ? question.answer.tolerance
        : 0;

  return {
    kind: question.kind,
    prompt: question.prompt,
    points: question.points,
    options: optionText(question),
    answer,
    tolerance,
    explanation: question.explanation ?? '',
  };
}

export function questionPayload(value: QuestionDraft): QuestionPayload {
  const explanation = value.explanation.trim();
  if (value.kind === 'numeric')
    return {
      kind: value.kind,
      prompt: value.prompt.trim(),
      points: value.points,
      config: { tolerance: value.tolerance },
      answer: { expected: Number(value.answer), tolerance: value.tolerance },
      ...(explanation ? { explanation } : {}),
    };

  const options = optionsFromText(value.options);
  const selected = optionIdsFromAnswer(value.answer);
  return {
    kind: value.kind,
    prompt: value.prompt.trim(),
    points: value.points,
    config: { options },
    answer:
      value.kind === 'multiple_choice'
        ? { correctOptionIds: selected }
        : { correctOptionId: selected[0] },
    ...(explanation ? { explanation } : {}),
  };
}
