import { expect, type Page } from "@playwright/test";

/**
 * Represents the Oracle Fusion Manage Approvals for Journals page.
 *
 * Provides reusable methods for interacting with journal approvals and
 * related controls on the page.
 */
export class JournalApprovalsPage {
  constructor(private page: Page) {}

  // Approval queue selection and search
  async selectPendingApprovalFromOthersTab(): Promise<void> {
    const pendingApprovalTab = this.page.locator(
      'a[id$="sentForApprovalTab::disAcr"]',
    );

    await expect(pendingApprovalTab).toBeVisible({ timeout: 30_000 });
    await pendingApprovalTab.click();

    const pendingApprovalTabContainer = this.page.locator(
      'div[id$="sentForApprovalTab::ti"]',
    );

    // Oracle applies this class after the approval tab becomes active.
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

    // Oracle ADF applies the table filter when Enter is pressed.
    await journalBatchFilter.press("Enter");

    const journalBatchLink = this.page.getByRole("link", {
      name: journalBatchName,
      exact: true,
    });

    await expect(journalBatchLink).toBeVisible({ timeout: 30_000 });
  }

  // Journal batch row selection
  async selectJournalBatch(journalBatchName: string): Promise<void> {
    const journalBatchLink = this.page.getByRole("link", {
      name: journalBatchName,
      exact: true,
    });

    await expect(journalBatchLink).toBeVisible({ timeout: 30_000 });

    // Locate the ADF result row containing the journal batch link.
    const journalRow = journalBatchLink.locator(
      "xpath=ancestor::tr[@_afrrk][1]",
    );

    await expect(journalRow).toBeVisible({ timeout: 30_000 });

    // Select the row through its selector cell without opening the journal link.
    const rowSelectorCell = journalRow.locator('td[_afrrh="true"]').first();

    await expect(rowSelectorCell).toBeVisible({ timeout: 30_000 });
    await rowSelectorCell.click();

    // Confirm Oracle marked the intended row as selected before withdrawal.
    await expect(journalRow).toHaveClass(/(?:^|\s)p_AFSelected(?:\s|$)/, {
      timeout: 30_000,
    });
  }

  // Approval withdrawal
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

    // A successful withdrawal removes the batch from the pending-approval list.
    await expect(journalBatchLink).toBeHidden({ timeout: 30_000 });
  }

  // Return from the approval workspace after the withdrawal is complete.
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
