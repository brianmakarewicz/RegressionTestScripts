import { type Page } from '@playwright/test';
import { FusionLoginPage } from '../pages/common/fusion-login.page';

export class AuthenticationWorkflow {
  private readonly loginPage: FusionLoginPage;

  constructor(page: Page) {
    this.loginPage = new FusionLoginPage(page);
  }

  async login(): Promise<void> {
    await this.loginPage.goto();
    await this.loginPage.login();
    await this.loginPage.waitForFusionHomePage();
  }
}