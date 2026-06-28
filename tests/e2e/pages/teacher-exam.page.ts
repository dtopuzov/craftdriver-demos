import { By, type Page } from 'craftdriver';
import { expect } from 'vitest';
import { routes } from '../support/routes.js';

export class TeacherExamPage {
  constructor(private readonly page: Page) {}

  async goto(examId: string) {
    await this.page.navigateTo(routes.teacherExam(examId));
  }

  title() {
    return this.page.locator(By.css('section h1'));
  }

  statusText() {
    return this.page.locator(By.css('section > p:nth-of-type(2)'));
  }

  examTitleInput() {
    return this.page.locator(By.labelText('Title'));
  }

  saveDetailsButton() {
    return this.page.locator(By.testId('save-exam-details'));
  }

  addQuestionButton() {
    return this.page.locator(By.testId('add-question'));
  }

  saveQuestionButton() {
    return this.page.locator(By.testId('save-question'));
  }

  publishButton() {
    return this.page.locator(By.testId('publish-exam'));
  }

  async expectOpen() {
    await this.title().expect().toHaveText('Edit exam');
    expect(await this.page.url()).toContain('/teacher/exams/');
  }
}
