import { By, type Browser, type Page } from 'craftdriver';

export class AppShellComponent {
  constructor(
    private readonly page: Page,
    private readonly browser: Browser,
  ) {}

  identity() {
    return this.page.locator(By.css('#user-identity'));
  }

  async expectSignedInAs(displayName: string, role: 'student' | 'teacher') {
    await this.identity().expect().toHaveText(`${displayName} - ${role}`);
  }

  async signOut() {
    await Promise.all([
      this.browser.waitForResponse(
        (response) => response.url.endsWith('/api/auth/logout') && response.status === 204,
      ),
      this.page.locator(By.css('#sign-out')).click(),
    ]);
  }
}
