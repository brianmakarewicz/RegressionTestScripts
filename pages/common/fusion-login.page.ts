import { expect, type Page } from "@playwright/test";
import { env } from "../../config/environment";
import { type OracleLoginData } from "../../types/common/oracle-login-data";

/**
 * Represents the Oracle Fusion sign-in page.
 *
 * Provides reusable methods for opening the configured environment,
 * submitting credentials, and confirming that Fusion is ready for use.
 */
export class FusionLoginPage {
  constructor(private readonly page: Page) {}

  // Environment navigation and sign-in page readiness
  async goto(baseUrl = env.baseUrl): Promise<void> {
    // Fail before browser navigation when the target environment is not configured.
    expect(baseUrl, "ORACLE_BASE_URL must be configured").toBeTruthy();

    const usernameTextbox = this.page.getByRole("textbox", {
      name: "Username",
      exact: true,
    });

    await this.page.goto(baseUrl!, { waitUntil: "domcontentloaded" });

    // OCI occasionally completes the redirect without rendering the sign-in
    // form. Retry the configured entry URL once instead of continuing against
    // an incomplete identity page.
    try {
      await expect(usernameTextbox).toBeVisible({ timeout: 30_000 });
    } catch {
      await this.page.goto(baseUrl!, { waitUntil: "domcontentloaded" });
      await expect(usernameTextbox).toBeVisible({ timeout: 30_000 });
    }

    await expect(
      this.page.getByRole("textbox", { name: "Password", exact: true }),
    ).toBeVisible();

    await expect(
      this.page.getByRole("button", { name: "Next", exact: true }),
    ).toBeVisible();
  }

  // Credential submission
  async login(
    credentials?: Pick<OracleLoginData, "username" | "password">,
  ): Promise<void> {
    const username = credentials?.username ?? env.username;
    const password = credentials?.password ?? env.password;

    // Validate both credentials before interacting with the sign-in form.
    expect(username, "ORACLE_USERNAME must be configured").toBeTruthy();
    expect(password, "ORACLE_PASSWORD must be configured").toBeTruthy();

    await this.page
      .getByRole("textbox", { name: "Username", exact: true })
      .fill(username!);
    await this.page
      .getByRole("textbox", { name: "Password", exact: true })
      .fill(password!);
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
