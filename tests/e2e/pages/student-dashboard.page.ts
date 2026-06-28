import { By, type Page } from 'craftdriver';
import { expect } from 'vitest';
import { routes } from '../support/routes.js';

export class StudentDashboardPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.navigateTo(routes.studentDashboard);
  }

  title() {
    return this.page.locator(By.css('#student-dashboard-title'));
  }

  examCard(examId: string) {
    return this.page.locator(By.testId(`exam-card-${examId}`));
  }

  startExamButton(examTitle: string) {
    return this.page.locator(By.css(`button[aria-label="Start ${examTitle}"]`));
  }

  continueExamButton(examTitle: string) {
    return this.page.locator(By.css(`button[aria-label="Continue ${examTitle}"]`));
  }

  viewResultButton(examTitle: string) {
    return this.page.locator(By.css(`button[aria-label="View result for ${examTitle}"]`));
  }

  async expectOpen() {
    await this.title().expect().toHaveText('My exams');
    expect(await this.page.url()).toContain(routes.studentDashboard);
  }

  async expectNotOpen() {
    expect(await this.title().count()).toBe(0);
  }
}
