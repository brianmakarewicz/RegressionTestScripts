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
}




// import { test, expect } from '@playwright/test';

// test('test', async ({ page }) => {
//   await page.getByRole('textbox', { name: 'Journal Batch' }).click();
//   await page.getByRole('textbox', { name: 'Journal Batch' }).fill('TEST_11_07102026MMHH');
//   await page.locator('textarea[name="_FOpt1:_FOr1:0:_FONSr2:0:MAnt2:1:pt1:ap1:showLessBatchDescription"]').click();
//   await page.locator('textarea[name="_FOpt1:_FOr1:0:_FONSr2:0:MAnt2:1:pt1:ap1:showLessBatchDescription"]').fill('TEST_11_07102026');
//   await page.getByRole('combobox', { name: 'Accounting Period' }).click();
//   await page.getByRole('gridcell', { name: 'Oct-' }).click();
//   await page.getByRole('link', { name: 'Manage Attachments' }).click();
//   await page.getByRole('button', { name: 'File Name' }).click();
//   await page.getByRole('button', { name: 'File Name' }).setInputFiles('TestFile.txt');
//   await page.getByRole('button', { name: 'OK' }).click();
//   await page.getByTitle('Select Date').click();
//   await page.getByRole('gridcell', { name: '31' }).click();
//   await page.locator('[id="_FOpt1:_FOr1:0:_FONSr2:0:MAnt2:1:pt1:ap1:sis3:userJeCategoryNameInputSearch1::btn"]').click();
//   await page.getByRole('textbox', { name: 'Category' }).fill('Djustment');
//   await page.getByText('djustment').first().click();
// });