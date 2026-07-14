import { expect, type Page } from '@playwright/test';

export class CreateJournalPage {
  constructor(private page: Page) {}

  async waitForCreateJournalPage(): Promise<void> {
    await expect(
      this.page.getByRole('heading', { name: 'Create Journal' }),
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

  async enterAccountingPeriod(accountingPeriod: string): Promise<void> {
    await this.page
      .getByRole('textbox', { name: 'Accounting Period' })
      .fill(accountingPeriod);
  }

  async chooseAttachmentFile(filePath: string): Promise<void> {
    await this.page
      .getByRole('link', { name: 'Manage Attachments' })
      .click();

    await expect(
      this.page.locator('input[type="file"][name*="ifPopup"]'),
    ).toBeVisible({ timeout: 30_000 });

    await this.page
      .locator('input[type="file"][name*="ifPopup"]')
      .setInputFiles(filePath);

    await this.page
      .getByRole('button', { name: 'OK' })
      .click();
  }

  async enterAccountingDate(accountingDate: string): Promise<void> {
    await this.page
      .getByRole('textbox', { name: 'Accounting Date' })
      .fill(accountingDate);
  }

}
