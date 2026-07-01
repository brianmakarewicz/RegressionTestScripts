import { expect, type Page } from '@playwright/test';
import { env } from '../config/environment';

export class FusionLoginPage {
  constructor(private readonly page: Page) {}

  async goto(): Promise<void> {
    expect(env.baseUrl, 'ORACLE_BASE_URL must be configured').toBeTruthy();

    await this.page.goto(env.baseUrl!);
    await expect(this.page).toHaveTitle(/Cloud Sign In/);
  }

  async login(): Promise<void> {
    expect(env.username, 'ORACLE_USERNAME must be configured').toBeTruthy();
    expect(env.password, 'ORACLE_PASSWORD must be configured').toBeTruthy();

    await this.page.getByRole('textbox', { name: 'Username', exact: true }).fill(env.username!);
    await this.page.getByRole('textbox', { name: 'Password', exact: true }).fill(env.password!);
    await this.page.getByRole('button', { name: 'Next', exact: true }).click();
  }

  async verifySuccessfulLogin(): Promise<void> {
    const settingsAndActions = this.page.getByRole('link', {
      name: 'Settings and Actions',
    });

    await expect(settingsAndActions).toBeVisible({ timeout: 90_000 });
    await settingsAndActions.click();

    await expect(
      this.page.getByRole('heading', { name: 'Settings and Actions' })
    ).toBeVisible();
  }
}