import { By, type Browser, type Page } from 'craftdriver';
import { expect } from 'vitest';
import type { RegistrationStudent } from '../data/student.factory.js';
import { routes } from '../support/routes.js';

export type LoginCredentials = Pick<RegistrationStudent, 'email' | 'password'>;

export class LoginPage {
  constructor(
    private readonly page: Page,
    private readonly browser: Browser,
  ) {}

  async goto() {
    await this.page.navigateTo(routes.login);
  }

  heading() {
    return this.page.locator(By.css('.auth-card h1'));
  }

  async expectOpen() {
    await this.heading().expect().toHaveText('Welcome back to EasyMath');
    expect(await this.page.url()).toContain(routes.login);
  }

  async fillForm(credentials: LoginCredentials) {
    await this.page.locator(By.labelText('Email')).fill(credentials.email);
    await this.page.locator(By.labelText('Password')).fill(credentials.password);
  }

  async submit() {
    await this.page.locator(By.css('#login-submit')).click();
  }

  async signInAs(credentials: LoginCredentials) {
    await this.fillForm(credentials);
    await Promise.all([
      this.browser.waitForResponse(
        (response) => response.url.endsWith('/api/auth/login') && response.status === 200,
      ),
      this.submit(),
    ]);
  }
}
