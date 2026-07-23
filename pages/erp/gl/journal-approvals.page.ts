import { expect, type Page } from "@playwright/test";

export class JournalApprovalsPage {
  constructor(private page: Page) {}

  async selectPendingApprovalFromOthersTab(): Promise<void> {
    const pendingApprovalTab = this.page.locator(
      'a[id$="sentForApprovalTab::disAcr"]',
    );

    await expect(pendingApprovalTab).toBeVisible({ timeout: 30_000 });
    await pendingApprovalTab.click();

    const pendingApprovalTabContainer = this.page.locator(
      'div[id$="sentForApprovalTab::ti"]',
    );

    await expect(pendingApprovalTabContainer).toHaveClass(/p_AFSelected/, {
      timeout: 30_000,
    });
  }

  async searchForJournalBatch(journalBatchName: string): Promise<void> {
    const journalBatchFilter = this.page.locator(
      'input[id$="pendingtab_journalBatch::content"]',
    );

    await expect(journalBatchFilter).toBeVisible({ timeout: 30_000 });

    await journalBatchFilter.fill(journalBatchName);

    await expect(journalBatchFilter).toHaveValue(journalBatchName);

    await journalBatchFilter.press("Enter");

    const journalBatchLink = this.page.getByRole("link", {
      name: journalBatchName,
      exact: true,
    });

    await expect(journalBatchLink).toBeVisible({ timeout: 30_000 });
  }

  async selectJournalBatch(journalBatchName: string): Promise<void> {
    const journalBatchLink = this.page.getByRole("link", {
      name: journalBatchName,
      exact: true,
    });

    await expect(journalBatchLink).toBeVisible({ timeout: 30_000 });

    const journalRow = journalBatchLink.locator(
      "xpath=ancestor::tr[@_afrrk][1]",
    );

    await expect(journalRow).toBeVisible({ timeout: 30_000 });

    const rowSelectorCell = journalRow.locator('td[_afrrh="true"]').first();

    await expect(rowSelectorCell).toBeVisible({ timeout: 30_000 });
    await rowSelectorCell.click();

    await expect(journalRow).toHaveClass(/(?:^|\s)p_AFSelected(?:\s|$)/, {
      timeout: 30_000,
    });
  }

  async withdrawSelectedJournalBatch(journalBatchName: string): Promise<void> {
    const journalBatchLink = this.page.getByRole("link", {
      name: journalBatchName,
      exact: true,
    });

    await expect(journalBatchLink).toBeVisible({ timeout: 30_000 });

    const withdrawButton = this.page.getByRole("button", {
      name: "Withdraw",
      exact: true,
    });

    await expect(withdrawButton).toBeVisible({ timeout: 30_000 });
    await expect(withdrawButton).toBeEnabled();

    await withdrawButton.click();

    await expect(journalBatchLink).toBeHidden({ timeout: 30_000 });
  }

  async clickDone(): Promise<void> {
    const doneButton = this.page.getByRole("button", {
      name: "Done",
      exact: true,
    });

    await expect(doneButton).toBeVisible({ timeout: 30_000 });
    await expect(doneButton).toBeEnabled();

    await doneButton.click();
  }
}
