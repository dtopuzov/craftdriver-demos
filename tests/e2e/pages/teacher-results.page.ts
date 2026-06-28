import { By, type Page } from 'craftdriver';
import { expect } from 'vitest';
import { routes } from '../support/routes.js';

export class TeacherResultsPage {
  constructor(private readonly page: Page) {}

  async goto(examId: string) {
    await this.page.navigateTo(routes.teacherResults(examId));
  }

  title() {
    return this.page.locator(By.css('section h1'));
  }

  resultRow(attemptId: string) {
    return this.page.locator(By.testId(`result-row-${attemptId}`));
  }

  viewAttemptButton(studentName: string) {
    return this.page.locator(By.css(`button[aria-label="View attempt for ${studentName}"]`));
  }

  async expectOpen() {
    await this.title().expect().toHaveText('Exam results');
    expect(await this.page.url()).toContain('/results');
  }
}
