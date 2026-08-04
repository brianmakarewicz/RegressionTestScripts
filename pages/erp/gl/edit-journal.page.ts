import { expect, type Page } from "@playwright/test";

/**
 * Represents an existing journal batch opened from Manage Journals.
 *
 * This page object validates journal details and performs controlled
 * actions against the selected journal batch.
 */
export class EditJournalPage {
  constructor(private page: Page) {}

  // Page readiness and journal detail validation
  async waitForEditJournalPage(): Promise<void> {
    await expect(
      this.page.locator("h1", {
        hasText: /^Edit Journal$/,
      }),
    ).toBeVisible({ timeout: 30_000 });
  }

  async verifyJournalBatchName(expectedBatchName: string): Promise<void> {
    const journalBatchName = this.page.locator(
      '[id$="showLessBatchName::content"]',
    );

    await expect(journalBatchName).toBeVisible({ timeout: 30_000 });
    await expect(journalBatchName).toHaveText(expectedBatchName);
  }

  async verifyBalanceType(expectedBalanceType: string): Promise<void> {
    const balanceType = this.page.locator(
      '[id$="ShowLessBalanceType::content"]',
    );

    await expect(balanceType).toBeVisible({ timeout: 30_000 });
    await expect(balanceType).toHaveText(expectedBalanceType);
  }

  async verifyCategory(expectedCategory: string): Promise<void> {
    const category = this.page.locator(
      '[id$="sis3:userJeCategoryNameInputSearch1::content"]',
    );

    await expect(category).toBeVisible({ timeout: 30_000 });
    await expect(category).toHaveText(expectedCategory);
  }

  private async verifyApprovalStatusIsRequired(): Promise<void> {
    const approvalStatusLabel = this.page.getByText("Approval Status", {
      exact: true,
    });

    await expect(approvalStatusLabel).toBeVisible({ timeout: 30_000 });

    const approvalStatusRow = approvalStatusLabel.locator(
      "xpath=ancestor::tr[1]",
    );

    await expect(approvalStatusRow).toContainText("Required");
  }

  // Journal batch approval
  async approveJournalBatch(): Promise<void> {
    const approveButton = this.page.getByRole("button", {
      name: "Approve",
      exact: true,
    });

    await expect(approveButton).toBeVisible({ timeout: 30_000 });
    await expect(approveButton).toBeEnabled();
    await approveButton.click();

    const confirmationMessage = this.page.getByText(
      "Your approval action for the journal batch is being processed.",
      { exact: true },
    );

    await expect(confirmationMessage).toBeVisible({ timeout: 30_000 });

    const okButton = this.page.getByRole("button", {
      name: "OK",
      exact: true,
    });

    await expect(okButton).toBeVisible({ timeout: 30_000 });
    await okButton.click();
    await expect(confirmationMessage).toBeHidden({ timeout: 30_000 });
  }

  async returnToManageJournals(): Promise<void> {
    const cancelButton = this.page.getByRole("button", {
      name: "Cancel",
      exact: true,
    });

    await expect(cancelButton).toBeVisible({ timeout: 30_000 });
    await cancelButton.click();

    await expect(
      this.page.locator("h1", { hasText: /^Manage Journals$/ }),
    ).toBeVisible({ timeout: 60_000 });
  }

  // Journal batch deletion
  async deleteJournalBatch(): Promise<void> {
    // Only journals requiring approval are eligible for this deletion flow.
    await this.verifyApprovalStatusIsRequired();

    const batchActionsLink = this.page.getByRole("link", {
      name: "Batch Actions",
      exact: true,
    });

    await expect(batchActionsLink).toBeVisible({ timeout: 30_000 });
    await batchActionsLink.click();

    const deleteMenuItem = this.page.getByRole("menuitem", {
      name: "Delete",
      exact: true,
    });

    await expect(deleteMenuItem).toBeVisible({ timeout: 30_000 });
    await deleteMenuItem.click();

    const confirmationMessage = this.page.getByText(
      "The journal batch will be deleted. Do you want to continue?",
      {
        exact: true,
      },
    );

    // Oracle requires final confirmation before deleting the journal batch.
    await expect(confirmationMessage).toBeVisible({ timeout: 30_000 });

    const yesButton = this.page.getByRole("button", {
      name: "Yes",
      exact: true,
    });

    await expect(yesButton).toBeVisible({ timeout: 30_000 });
    await yesButton.click();

    // Successful deletion returns the user to Manage Journals.
    await expect(
      this.page.locator("h1", {
        hasText: /^Manage Journals$/,
      }),
    ).toBeVisible({ timeout: 60_000 });
  }
}
