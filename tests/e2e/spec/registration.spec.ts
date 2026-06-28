import { afterAll, afterEach, beforeAll, beforeEach, describe, it } from 'vitest';
import { Browser, type Page } from 'craftdriver';
import { AppShellComponent } from '../components/app-shell.component.js';
import { makeRegistrationStudent } from '../data/student.factory.js';
import { seededUsers } from '../data/seeded-users.js';
import { LoginPage } from '../pages/login.page.js';
import { RegistrationPage } from '../pages/registration.page.js';
import { StudentDashboardPage } from '../pages/student-dashboard.page.js';
import { baseUrl, routes } from '../support/routes.js';

async function timeStep<T>(label: string, action: () => Promise<T>) {
  const start = performance.now();
  try {
    return await action();
  } finally {
    const duration = performance.now() - start;
    console.log(`[e2e timing] ${label}: ${duration.toFixed(1)}ms`);
  }
}

describe('registration', () => {
  let browser: Browser;
  let page: Page;
  let loginPage: LoginPage;
  let registrationPage: RegistrationPage;
  let shell: AppShellComponent;
  let studentDashboardPage: StudentDashboardPage;

  beforeAll(async () => {
    await timeStep('browser.launch', async () => {
      browser = await Browser.launch({ enableBiDi: false });
    });
  });

  beforeEach(async () => {
    await browser.navigateTo(`${baseUrl}${routes.register}`);

    await timeStep('browser.navigate', async () => {
      // browser.logs.clearLogs();
      // await browser.defaultContext.clearCookies();
      page = await browser.activePage();
    });
    loginPage = new LoginPage(page, browser);
    registrationPage = new RegistrationPage(page);
    shell = new AppShellComponent(page, browser);
    studentDashboardPage = new StudentDashboardPage(page);
  });

  afterEach(async () => {
    // browser.logs.assertNoErrors();
  });

  afterAll(async () => {
    await browser.quit();
  });

  it('should register user with valid registration details', async () => {
    const learner = makeRegistrationStudent();

    await registrationPage.register(learner);
    await studentDashboardPage.expectOpen();
    await shell.expectSignedInAs(learner.displayName, 'student');

    await shell.signOut();
    await loginPage.expectOpen();

    await loginPage.signInAs(learner);
    await studentDashboardPage.expectOpen();
    await shell.expectSignedInAs(learner.displayName, 'student');
  });

  describe.only('validation', () => {
    it('should show errors without leaving registration', async () => {
      await registrationPage.submitWith({
        displayName: 'A',
        email: 'not-an-email',
        password: 'short',
        confirmPassword: 'short',
      });

      await registrationPage.expectFieldErrors({
        displayName: 'Enter a name with at least 2 characters.',
        email: 'Enter a valid email address.',
        password: 'Use at least 8 characters for your password.',
      });
      await registrationPage.expectOpen();
      await studentDashboardPage.expectNotOpen();
    });

    it('should show an account-level error for an existing email', async () => {
      await registrationPage.register({
        displayName: 'Ada Duplicate',
        email: seededUsers.studentAda.email,
        password: 'learning-2026',
      });

      const expectedError = 'An account with this email already exists. Please sign in instead.';
      await registrationPage.expectFormError(expectedError);
      await registrationPage.expectOpen();
    });
  });

  describe.only('accessibility', () => {
    it('should not violate a11y standards', async () => {
      await browser.a11y.check();
    });

    it('should submit form via keyboard', async () => {
      const learner = makeRegistrationStudent();

      await browser.keyboard.press('Tab');
      await browser.keyboard.type(learner.displayName);
      await browser.keyboard.press('Tab');
      await browser.keyboard.type(learner.email);
      await browser.keyboard.press('Tab');
      await browser.keyboard.type(learner.password);
      await browser.keyboard.press('Tab');
      await browser.keyboard.type(learner.password);
      await browser.keyboard.press('Enter');

      await studentDashboardPage.expectOpen();
      await shell.expectSignedInAs(learner.displayName, 'student');
    });
  });
});
