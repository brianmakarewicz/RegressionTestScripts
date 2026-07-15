import { expect, type Page } from "@playwright/test";

export class CreateJournalPage {
  constructor(private page: Page) {}

  async waitForCreateJournalPage(): Promise<void> {
    await expect(
      this.page.getByRole("heading", { name: "Create Journal" }),
    ).toBeVisible({ timeout: 30_000 });
  }

  async enterJournalBatchName(journalBatchName: string): Promise<void> {
    await this.page
      .locator('input[name*="showLessBatchName"]')
      .fill(journalBatchName);
  }

  async enterBatchDescription(description: string): Promise<void> {
    await this.page
      .locator('textarea[name*="showLessBatchDescription"]')
      .fill(description);
  }

  async selectAccountingPeriod(accountingPeriod: string): Promise<void> {
    const accountingPeriodTextbox = this.page.getByRole("textbox", {
      name: "Accounting Period",
    });

    await accountingPeriodTextbox.click();
    await accountingPeriodTextbox.fill(accountingPeriod);

    const accountingPeriodOption = this.page.getByRole("gridcell", {
      name: accountingPeriod,
      exact: true,
    });

    await expect(accountingPeriodOption).toBeVisible({ timeout: 30_000 });
    await accountingPeriodOption.click();

    await expect(accountingPeriodTextbox).toHaveValue(accountingPeriod);
  }

  async chooseAttachmentFile(filePath: string): Promise<void> {
    await this.page.getByRole("link", { name: "Manage Attachments" }).click();

    const attachmentInput = this.page.locator(
      'input[type="file"][name*="ifPopup"]',
    );

    await expect(attachmentInput).toBeVisible({ timeout: 30_000 });

    await attachmentInput.setInputFiles(filePath);

    const attachmentTitleTextbox = this.page.locator(
      'input[name*="popTitleInputText"]',
    );

    await expect(attachmentTitleTextbox).not.toHaveValue("", {
      timeout: 30_000,
    });

    await this.page.getByRole("button", { name: "OK" }).click();
  }

  async selectCategory(category: string): Promise<void> {
    const categoryTextbox = this.page.getByRole("textbox", {
      name: "Category",
    });

    await categoryTextbox.click();

    const categoryOption = this.page.getByRole("gridcell", {
      name: category,
      exact: true,
    });

    await expect(categoryOption).toBeVisible({ timeout: 30_000 });
    await categoryOption.click();

    await expect(categoryTextbox).toHaveValue(category);
  }

  async enterJournalLineAccount(
    lineNumber: number,
    account: string,
  ): Promise<void> {
    const lineRow = this.page.getByRole("row", {
      name: new RegExp(`^Expand ${lineNumber}\\b`),
    });

    await lineRow.locator("td").nth(3).click();

    const accountTextbox = this.page.getByRole("textbox", {
      name: "Account",
      exact: true,
    });

    await expect(accountTextbox).toBeVisible({ timeout: 30_000 });
    await accountTextbox.fill(account);
    await expect(accountTextbox).toHaveValue(account);
  }
}
