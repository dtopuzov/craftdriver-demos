import type { QuestionPresentation } from '@exam/contracts';

type ChoiceOption = { id: string; text: string };

export function choiceOptions(question: QuestionPresentation): ChoiceOption[] {
  const options = question.config.options;
  if (!Array.isArray(options)) return [];
  return options.flatMap((option) =>
    option &&
    typeof option === 'object' &&
    'id' in option &&
    'text' in option &&
    typeof option.id === 'string' &&
    typeof option.text === 'string'
      ? [{ id: option.id, text: option.text }]
      : [],
  );
}

function optionText(question: QuestionPresentation, id: string) {
  return choiceOptions(question).find((option) => option.id === id)?.text ?? id;
}

export function singleChoiceValue(answer: unknown): string {
  if (typeof answer === 'string') return answer;
  if (
    answer &&
    typeof answer === 'object' &&
    'selectedOptionId' in answer &&
    typeof answer.selectedOptionId === 'string'
  )
    return answer.selectedOptionId;
  if (
    answer &&
    typeof answer === 'object' &&
    'correctOptionId' in answer &&
    typeof answer.correctOptionId === 'string'
  )
    return answer.correctOptionId;
  return '';
}

export function multipleChoiceValues(answer: unknown): string[] {
  if (Array.isArray(answer)) return answer.filter((id): id is string => typeof id === 'string');
  if (
    answer &&
    typeof answer === 'object' &&
    'selectedOptionIds' in answer &&
    Array.isArray(answer.selectedOptionIds)
  )
    return answer.selectedOptionIds.filter((id): id is string => typeof id === 'string');
  if (
    answer &&
    typeof answer === 'object' &&
    'correctOptionIds' in answer &&
    Array.isArray(answer.correctOptionIds)
  )
    return answer.correctOptionIds.filter((id): id is string => typeof id === 'string');
  return [];
}

export function numericAnswerValue(answer: unknown): string {
  if (typeof answer === 'number' || typeof answer === 'string') return String(answer);
  if (answer && typeof answer === 'object' && 'value' in answer) return String(answer.value ?? '');
  if (answer && typeof answer === 'object' && 'expected' in answer) return String(answer.expected ?? '');
  return '';
}

export function formatAnswer(question: QuestionPresentation, answer: unknown): string {
  if (answer === undefined || answer === null || answer === '') return 'No answer';
  if (question.kind === 'numeric') return numericAnswerValue(answer) || 'No answer';
  if (question.kind === 'multiple_choice') {
    const selected = multipleChoiceValues(answer);
    return selected.length ? selected.map((id) => optionText(question, id)).join(', ') : 'No answer';
  }
  const selected = singleChoiceValue(answer);
  return selected ? optionText(question, selected) : 'No answer';
}

export function formatCorrectAnswer(question: QuestionPresentation, answer: Record<string, unknown>): string {
  if (question.kind === 'numeric') {
    const expected = numericAnswerValue(answer);
    const tolerance = answer.tolerance;
    if (!expected) return 'Not available';
    return typeof tolerance === 'number' && tolerance > 0 ? `${expected} (+/- ${tolerance})` : expected;
  }
  return formatAnswer(question, answer);
}
