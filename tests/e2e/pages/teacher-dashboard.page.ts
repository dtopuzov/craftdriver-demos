import { By, type Page } from 'craftdriver';
import { expect } from 'vitest';
import { routes } from '../support/routes.js';

export class TeacherDashboardPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.navigateTo(routes.teacherDashboard);
  }

  title() {
    return this.page.locator(By.css('section h1'));
  }

  draftTitleInput() {
    return this.page.locator(By.labelText('New draft title'));
  }

  createDraftButton() {
    return this.page.locator(By.testId('create-draft'));
  }

  examLink(title: string, status: string) {
    return this.page.locator(By.text(`${title} - ${status}`, { exact: true }));
  }

  async createDraft(title: string) {
    await this.draftTitleInput().fill(title);
    await this.createDraftButton().click();
  }

  async expectOpen() {
    await this.title().expect().toHaveText('Teacher area');
    expect(await this.page.url()).toContain(routes.teacherDashboard);
  }
}
