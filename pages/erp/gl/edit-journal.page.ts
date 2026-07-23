import { expect, type Page } from "@playwright/test";

export class EditJournalPage {
  constructor(private page: Page) {}

  async waitForEditJournalPage(): Promise<void> {
    await expect(
      this.page.locator("h1", {
        hasText: /^Edit Journal$/,
      }),
    ).toBeVisible({ timeout: 30_000 });
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

  async deleteJournalBatch(journalBatchName: string): Promise<void> {
    if (!/^TEST_BATCH_\d+$/.test(journalBatchName)) {
      throw new Error(
        `Refusing to delete unexpected journal batch: ${journalBatchName}`,
      );
    }

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

    await expect(confirmationMessage).toBeVisible({ timeout: 30_000 });

    const yesButton = this.page.getByRole("button", {
      name: "Yes",
      exact: true,
    });

    await expect(yesButton).toBeVisible({ timeout: 30_000 });
    await yesButton.click();

    await expect(
      this.page.locator("h1", {
        hasText: /^Manage Journals$/,
      }),
    ).toBeVisible({ timeout: 60_000 });
  }
}
