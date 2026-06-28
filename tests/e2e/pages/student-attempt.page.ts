import { By, type Page } from 'craftdriver';
import { expect } from 'vitest';
import { routes } from '../support/routes.js';

export class StudentAttemptPage {
  constructor(private readonly page: Page) {}

  async goto(attemptId: string) {
    await this.page.navigateTo(routes.studentAttempt(attemptId));
  }

  title() {
    return this.page.locator(By.css('section h1'));
  }

  question(questionKey: string) {
    return this.page.locator(By.testId(`question-${questionKey}`));
  }

  numericAnswer(questionKey: string) {
    return this.page.locator(By.css(`#answer-${questionKey}`));
  }

  reviewButton() {
    return this.page.locator(By.text('Review questions', { exact: true }));
  }

  submitButton() {
    return this.page.locator(By.text('Submit attempt', { exact: true }));
  }

  async expectOpen() {
    await this.title()
      .expect()
      .toHaveText(/Exam (attempt|result):/);
    expect(await this.page.url()).toContain('/student/attempts/');
  }
}
