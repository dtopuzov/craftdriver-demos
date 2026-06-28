import { describe, expect, it } from 'vitest';
import {
  gradeMultipleChoice,
  gradeNumeric,
  gradeQuestion,
  gradeSingleChoice,
  parseFiniteNumber,
} from './index.js';

describe('single-choice grading', () => {
  it('awards all points only for the selected correct option', () => {
    expect(gradeSingleChoice('b', { correctOptionId: 'b' }, 2)).toEqual({
      isCorrect: true,
      awardedPoints: 2,
    });
    expect(gradeSingleChoice('a', { correctOptionId: 'b' }, 2)).toEqual({
      isCorrect: false,
      awardedPoints: 0,
    });
  });

  it('treats blank and malformed answers as incorrect', () => {
    expect(gradeSingleChoice('', { correctOptionId: 'b' }, 2)).toEqual({
      isCorrect: false,
      awardedPoints: 0,
    });
    expect(gradeSingleChoice(['b'], { correctOptionId: 'b' }, 2)).toEqual({
      isCorrect: false,
      awardedPoints: 0,
    });
  });
});

describe('multiple-choice grading', () => {
  const config = { correctOptionIds: ['a', 'c'] };

  it('matches sets exactly regardless of ordering', () => {
    expect(gradeMultipleChoice(['c', 'a'], config, 3)).toEqual({
      isCorrect: true,
      awardedPoints: 3,
    });
  });

  it('does not award partial credit, extra selections, or duplicate selections', () => {
    for (const answer of [['a'], ['a', 'b', 'c'], ['a', 'a', 'c'], [], 'a']) {
      expect(gradeMultipleChoice(answer, config, 3)).toEqual({
        isCorrect: false,
        awardedPoints: 0,
      });
    }
  });
});

describe('numeric grading', () => {
  it('parses normalized finite numbers and supports an inclusive tolerance', () => {
    expect(parseFiniteNumber(' 12.5 ')).toBe(12.5);
    expect(gradeNumeric('10.1', { expected: 10, tolerance: 0.1 }, 4)).toEqual({
      isCorrect: true,
      awardedPoints: 4,
    });
  });

  it('rejects blanks, non-finite values, malformed input, and invalid tolerances', () => {
    for (const answer of ['', '   ', 'ten', 'Infinity', Infinity, null]) {
      expect(gradeNumeric(answer, { expected: 10 }, 4)).toEqual({
        isCorrect: false,
        awardedPoints: 0,
      });
    }
    expect(gradeNumeric(10, { expected: 10, tolerance: -1 }, 4)).toEqual({
      isCorrect: false,
      awardedPoints: 0,
    });
  });
});

describe('question dispatcher', () => {
  it('dispatches every supported question kind and never awards negative points', () => {
    expect(gradeQuestion({ kind: 'numeric', points: 5, config: { expected: 2 } }, '2')).toEqual({
      isCorrect: true,
      awardedPoints: 5,
    });
    expect(
      gradeQuestion({ kind: 'single_choice', points: -1, config: { correctOptionId: 'a' } }, 'a'),
    ).toEqual({ isCorrect: false, awardedPoints: 0 });
  });
});
