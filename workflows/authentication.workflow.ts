import { type Page } from '@playwright/test';
import { FusionLoginPage } from '../pages/common/fusion-login.page';
import { type OracleLoginData } from '../types/common/oracle-login-data';

/**
 * Coordinates the complete Oracle Fusion authentication sequence.
 */
export class AuthenticationWorkflow {
  private readonly loginPage: FusionLoginPage;

  constructor(page: Page) {
    this.loginPage = new FusionLoginPage(page);
  }

  /**
   * Opens the configured environment, submits credentials, and waits for Home.
   */
  async login(): Promise<void> {
    await this.loginPage.goto();
    await this.loginPage.login();
    // Login is complete only after the authenticated Fusion shell is ready.
    await this.loginPage.waitForFusionHomePage();
  }

  /** Logs in with explicitly loaded credentials without changing global env. */
  async loginWithCredentials(credentials: OracleLoginData): Promise<void> {
    await this.loginPage.goto(credentials.baseUrl);
    await this.loginPage.login(credentials);
    await this.loginPage.waitForFusionHomePage();
  }
}
