import { expect, type Page } from "@playwright/test";

/** Models the Subledger Journal Lines page and its review destinations. */
export class SubledgerJournalLinesPage {
  constructor(private readonly page: Page) {}

  async expectLoaded(): Promise<void> {
    await expect(
      this.page.getByRole("heading", {
        name: "Subledger Journal Lines",
        exact: true,
      }),
    ).toBeVisible({ timeout: 60_000 });
  }

  async openJournalEntryAndReturn(): Promise<void> {
    await this.page
      .getByRole("button", { name: "View Journal Entry", exact: true })
      .click();

    // The journal name after the colon varies by selected transaction.
    await expect(
      this.page.getByRole("heading", {
        name: /^Journal Entry(?:\s*:|$)/,
      }),
    ).toBeVisible({ timeout: 60_000 });

    await this.page
      .getByRole("button", { name: "Done", exact: true })
      .click();
    await this.expectLoaded();
  }

  async openTransactionAndReturn(): Promise<void> {
    const subledgerHeading = this.page.getByRole("heading", {
      name: "Subledger Journal Lines",
      exact: true,
    });

    await expect(subledgerHeading).toBeVisible({ timeout: 30_000 });

    await this.page
      .getByRole("button", { name: "View Transaction", exact: true })
      .click();

    await expect(subledgerHeading).toBeHidden({ timeout: 60_000 });

    const doneButton = this.page.getByRole("button", {
      name: "Done",
      exact: true,
    });

    await expect(doneButton).toBeVisible({ timeout: 60_000 });
    await expect(doneButton).toBeEnabled();
    await doneButton.click();
    await this.expectLoaded();
  }
}
