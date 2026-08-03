import { expect, type Page } from "@playwright/test";
import { env } from "../../config/environment";

/**
 * Represents the Oracle Fusion sign-in page.
 *
 * Provides reusable methods for opening the configured environment,
 * submitting credentials, and confirming that Fusion is ready for use.
 */
export class FusionLoginPage {
  constructor(private readonly page: Page) {}

  // Environment navigation and sign-in page readiness
  async goto(): Promise<void> {
    // Fail before browser navigation when the target environment is not configured.
    expect(env.baseUrl, "ORACLE_BASE_URL must be configured").toBeTruthy();

    await this.page.goto(env.baseUrl!);

    // Confirm the complete sign-in form is ready before credentials are entered.
    await expect(
      this.page.getByRole("textbox", { name: "Username", exact: true }),
    ).toBeVisible({ timeout: 30_000 });

    await expect(
      this.page.getByRole("textbox", { name: "Password", exact: true }),
    ).toBeVisible();

    await expect(
      this.page.getByRole("button", { name: "Next", exact: true }),
    ).toBeVisible();
  }

  // Credential submission
  async login(): Promise<void> {
    // Validate both credentials before interacting with the sign-in form.
    expect(env.username, "ORACLE_USERNAME must be configured").toBeTruthy();
    expect(env.password, "ORACLE_PASSWORD must be configured").toBeTruthy();

    await this.page
      .getByRole("textbox", { name: "Username", exact: true })
      .fill(env.username!);
    await this.page
      .getByRole("textbox", { name: "Password", exact: true })
      .fill(env.password!);
    await this.page.getByRole("button", { name: "Next", exact: true }).click();
  }

  // Authenticated application readiness
  async waitForFusionHomePage(): Promise<void> {
    // The Navigator confirms that the authenticated Fusion shell has loaded.
    await expect(
      this.page.getByRole("link", { name: "Navigator" }),
    ).toBeVisible({ timeout: 90_000 });

    // This second shell control prevents partially loaded pages from passing.
    await expect(
      this.page.getByRole("link", { name: "Settings and Actions" }),
    ).toBeVisible();
  }
}
