import { By, type Page } from 'craftdriver';
import { expect } from 'vitest';
import type { RegistrationStudent } from '../data/student.factory.js';
import { routes } from '../support/routes.js';

export type RegistrationFields = RegistrationStudent & {
  confirmPassword: string;
};

const fieldErrors = {
  displayName: '#registration-display-name-error',
  email: '#registration-email-error',
  password: '#registration-password-error',
  confirmPassword: '#registration-confirm-password-error',
} as const;

export type RegistrationErrorField = keyof typeof fieldErrors;

export class RegistrationPage {
  constructor(private readonly page: Page) { }

  async goto() {
      await this.page.navigateTo(routes.register);
  }

  async expectOpen() {
    expect(await this.page.url()).toContain(routes.register);
  }

  async fillForm(fields: RegistrationFields) {
    await this.page.locator(By.labelText('Learner’s name')).fill(fields.displayName);
    await this.page.locator(By.labelText('Email')).fill(fields.email);
    await this.passwordInput().fill(fields.password);
    await this.page.locator(By.labelText('Confirm password')).fill(fields.confirmPassword);
  }

  passwordInput() {
    return this.page.locator(By.css('#registration-password'));
  }

  async submit() {
    await this.page.locator(By.css('#registration-submit')).click();
  }

  async submitWith(fields: RegistrationFields) {
    await this.fillForm(fields);
    await this.submit();
  }

  async register(user: RegistrationStudent) {
    await this.submitWith({ ...user, confirmPassword: user.password });
  }

  fieldError(field: RegistrationErrorField) {
    return this.page.locator(By.css(fieldErrors[field]));
  }

  async expectFieldErrors(expectedErrors: Partial<Record<RegistrationErrorField, string>>) {
    for (const [field, message] of Object.entries(expectedErrors) as [
      RegistrationErrorField,
      string,
    ][]) {
      await this.fieldError(field).expect().toHaveText(message);
    }
  }

  formError() {
    return this.page.locator(By.css('#registration-form-error'));
  }

  async expectFormError(message: string) {
    await this.formError().expect().toHaveText(message);
  }
}
