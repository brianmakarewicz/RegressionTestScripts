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

    // Saved journals render the batch name as an editable input, while
    // approval-state journals can render the same control as read-only text.
    const isEditableControl = await journalBatchName.evaluate((element) =>
      element.matches("input, textarea"),
    );

    if (isEditableControl) {
      await expect(journalBatchName).toHaveValue(expectedBatchName);
      return;
    }

    await expect(journalBatchName).toHaveText(expectedBatchName);
  }

  async verifyJournalBatchNamePrefix(
    expectedBatchNamePrefix: string,
  ): Promise<void> {
    const journalBatchName = this.page.locator(
      '[id$="showLessBatchName::content"]',
    );
    const escapedPrefix = expectedBatchNamePrefix.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&",
    );

    await expect(journalBatchName).toBeVisible({ timeout: 30_000 });
    await expect(journalBatchName).toHaveText(
      new RegExp(`^${escapedPrefix}(?:$|\\s)`),
    );
  }

  async verifyBalanceType(expectedBalanceType: string): Promise<void> {
    const balanceType = this.page.locator(
      '[id$="ShowLessBalanceType::content"]',
    );

    await expect(balanceType).toBeVisible({ timeout: 30_000 });
    await expect(balanceType).toHaveText(expectedBalanceType);
  }

  async verifyLedger(expectedLedger: string): Promise<void> {
    const ledger = this.page.locator(
      '[id$="showLessLedgerCLOV:sis1:is1::content"]',
    );

    await expect(ledger).toBeVisible({ timeout: 30_000 });
    await expect(ledger).toHaveText(expectedLedger);
  }

  async verifyBatchStatus(expectedBatchStatus: string): Promise<void> {
    const batchStatusRow = this.page.locator('tr[id$="ap1:plam4"]');

    await expect(batchStatusRow).toBeVisible({ timeout: 30_000 });
    await expect(
      batchStatusRow.getByText("Batch Status", { exact: true }),
    ).toBeVisible();
    await expect(
      batchStatusRow.getByText(expectedBatchStatus, { exact: true }),
    ).toBeVisible();
  }

  async verifyCategory(expectedCategory: string): Promise<void> {
    const category = this.page.locator(
      '[id$="sis3:userJeCategoryNameInputSearch1::content"]',
    );

    await expect(category).toBeVisible({ timeout: 30_000 });
    await expect(category).toHaveText(expectedCategory);
  }

  // Journal reversal details
  async showJournalDetails(): Promise<void> {
    const showMoreLink = this.page.locator('a[id$="ap1:showMoreHeader"]');

    await expect(showMoreLink).toBeVisible({ timeout: 30_000 });
    await showMoreLink.click();

    await expect(
      this.page.getByRole("link", { name: "Reversal", exact: true }),
    ).toBeVisible({ timeout: 30_000 });
  }

  async openReversalTab(): Promise<void> {
    const reversalLink = this.page.getByRole("link", {
      name: "Reversal",
      exact: true,
    });

    await expect(reversalLink).toBeVisible({ timeout: 30_000 });
    await reversalLink.click();

    await expect(
      this.page.locator('tr[id$="plam28"]'),
    ).toBeVisible({ timeout: 30_000 });
  }

  async verifyReversalPeriod(expectedPeriod: string): Promise<void> {
    const reversalPeriod = this.page.locator(
      '[id$="ReversePeriodCLOV:sis1:is1::content"]',
    );

    await expect(reversalPeriod).toBeVisible({ timeout: 30_000 });

    const isEditableControl = await reversalPeriod.evaluate((element) =>
      element.matches("input"),
    );

    if (isEditableControl) {
      await expect(reversalPeriod).toHaveValue(expectedPeriod);
      return;
    }

    await expect(reversalPeriod).toHaveText(expectedPeriod);
  }

  async verifyReversalMethod(expectedMethod: string): Promise<void> {
    const reversalMethod = this.page.locator('[id$="soc1::content"]');

    await expect(reversalMethod).toBeVisible({ timeout: 30_000 });

    const isEditableControl = await reversalMethod.evaluate((element) =>
      element.matches("select"),
    );

    if (isEditableControl) {
      await expect(reversalMethod.locator("option:checked")).toHaveText(
        expectedMethod,
      );
      return;
    }

    await expect(reversalMethod).toHaveText(expectedMethod);
  }

  async verifyReversalStatus(expectedStatus: string): Promise<void> {
    const reversalStatusRow = this.page.locator('tr[id$="plam28"]');

    await expect(reversalStatusRow).toBeVisible({ timeout: 30_000 });
    await expect(reversalStatusRow).toContainText(expectedStatus);
  }

  /**
   * Saves the open journal and closes the Edit Journal page.
   */
  async saveAndClose(): Promise<void> {
    const saveDropdown = this.page.locator('a[id$="saveBatch::popEl"]');

    await expect(saveDropdown).toBeVisible({ timeout: 30_000 });
    await saveDropdown.click();

    const saveAndCloseOption = this.page.getByRole("menuitem", {
      name: "Save and Close",
      exact: true,
    });

    await expect(saveAndCloseOption).toBeVisible({ timeout: 30_000 });
    await saveAndCloseOption.click();
  }

  // Journal completion and approval submission
  async completeJournal(): Promise<void> {
    const completeButton = this.page.getByRole("button", {
      name: "Complete",
      exact: true,
    });

    await expect(completeButton).toBeVisible({ timeout: 30_000 });
    await expect(completeButton).toBeEnabled();
    await completeButton.click();

    // The Complete button disappears after Oracle finishes the transition.
    await expect(completeButton).toBeHidden({ timeout: 60_000 });
  }

  async postJournal(): Promise<void> {
    const postButton = this.page.getByRole("button", {
      name: "Post",
      exact: true,
    });

    await expect(postButton).toBeVisible({ timeout: 30_000 });
    await expect(postButton).toBeEnabled();
    await postButton.click();

    const approvalRequiredMessage = this.page.getByText(
      "The journal requires approval before it can be posted, and has been forwarded to the approver.",
      { exact: true },
    );

    await expect(approvalRequiredMessage).toBeVisible({ timeout: 60_000 });

    const okButton = this.page.locator(
      '[id*="userResponsePopupDialogButtonOk"]',
    );

    await expect(okButton).toBeVisible({ timeout: 30_000 });
    await okButton.click();
    await expect(approvalRequiredMessage).toBeHidden({ timeout: 30_000 });
  }

  // Journal approval history
  async showJournalBatchDetails(): Promise<void> {
    // The ID suffix targets the batch-level Show More link, not the journal one.
    const showMoreLink = this.page.locator('a[id$="ap1:showMore"]');

    await expect(showMoreLink).toBeVisible({ timeout: 30_000 });
    await showMoreLink.click();
  }

  async openActionLog(): Promise<void> {
    const actionLogLink = this.page.getByRole("link", {
      name: "Action Log",
      exact: true,
    });

    await expect(actionLogLink).toBeVisible({ timeout: 30_000 });
    await actionLogLink.click();

    await expect(
      this.page.getByRole("table", { name: "Action Log" }),
    ).toBeVisible({ timeout: 30_000 });
  }

  async verifyActionLogContainsAction(expectedAction: string): Promise<void> {
    const actionLogTable = this.page.getByRole("table", {
      name: "Action Log",
    });

    await expect(
      actionLogTable.getByText(expectedAction, { exact: true }),
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

  /**
   * Approves the open batch and confirms Oracle accepted the request.
   * This confirmation starts asynchronous processing; posted status is
   * verified separately from Manage Journals.
   */
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

    // After approval, Cancel closes the journal without undoing the submitted
    // approval action and returns the user to the search results.
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
