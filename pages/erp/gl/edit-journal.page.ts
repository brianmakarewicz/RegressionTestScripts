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

  private async verifyReadOnlyStatusRow(
    rowIdSuffix: string,
    label: string,
    expectedValue: string,
  ): Promise<void> {
    const statusRow = this.page.locator(`tr[id$="${rowIdSuffix}"]`);

    await expect(statusRow).toBeVisible({ timeout: 30_000 });
    await expect(
      statusRow.getByText(label, { exact: true }),
    ).toBeVisible();
    await expect(
      statusRow.getByText(expectedValue, { exact: true }),
    ).toBeVisible();
  }

  /**
   * Confirms the imported journal is complete and eligible for posting in an
   * environment where approval is not required.
   */
  async verifyImportedJournalPrePostState(): Promise<void> {
    await this.verifyReadOnlyStatusRow("ap1:plam1", "Source", "Spreadsheet");
    await this.verifyReadOnlyStatusRow(
      "ap1:plam3",
      "Approval Status",
      "Not required",
    );
    await this.verifyReadOnlyStatusRow(
      "ap1:plam34",
      "Funds Status",
      "Not attempted",
    );
    await this.verifyReadOnlyStatusRow(
      "ap1:plam4",
      "Batch Status",
      "Unposted",
    );
    await this.verifyReadOnlyStatusRow(
      "ap1:plam5",
      "Completion Status",
      "Complete",
    );
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

  /** Selects the tester-configured period from Oracle's searchable LOV. */
  async selectReversalPeriod(reversalPeriod: string): Promise<void> {
    const reversalPeriodTextbox = this.page.getByRole("textbox", {
      name: "Reversal Period",
      exact: true,
    });

    await expect(reversalPeriodTextbox).toBeVisible({ timeout: 30_000 });
    await reversalPeriodTextbox.click();
    await reversalPeriodTextbox.fill(reversalPeriod);

    // Select the exact filtered result. ArrowDown can highlight Oracle's
    // current or recently used period instead of the value just entered.
    const reversalPeriodOption = this.page.getByRole("gridcell", {
      name: reversalPeriod,
      exact: true,
    });

    await expect(reversalPeriodOption.first()).toBeVisible({
      timeout: 30_000,
    });
    await reversalPeriodOption.first().click();

    await expect(reversalPeriodTextbox).toHaveValue(reversalPeriod);
  }

  /** Selects how Oracle should construct the reversing debit/credit lines. */
  async selectReversalMethod(reversalMethod: string): Promise<void> {
    const reversalMethodSelect = this.page.locator('[id$="soc1::content"]');

    await expect(reversalMethodSelect).toBeVisible({ timeout: 30_000 });
    await expect(reversalMethodSelect).toHaveJSProperty("tagName", "SELECT");
    await reversalMethodSelect.selectOption({ label: reversalMethod });
    await expect(reversalMethodSelect.locator("option:checked")).toHaveText(
      reversalMethod,
    );
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

  /** Saves reversal configuration without closing or reversing the journal. */
  async saveJournal(): Promise<void> {
    const saveButton = this.page.getByRole("button", {
      name: "Save",
      exact: true,
    });

    await expect(saveButton).toBeVisible({ timeout: 30_000 });
    await expect(saveButton).toBeEnabled();
    await saveButton.click();
    await expect(saveButton).toBeEnabled({ timeout: 30_000 });
  }

  /**
   * Creates the configured reversal journal and returns Oracle's process ID.
   */
  async reverseJournal(): Promise<string> {
    const journalActionsLink = this.page.getByRole("link", {
      name: "Journal Actions",
      exact: true,
    });

    await expect(journalActionsLink).toBeVisible({ timeout: 30_000 });
    await journalActionsLink.click();

    const reverseMenuItem = this.page.getByRole("menuitem", {
      name: "Reverse",
      exact: true,
    });

    await expect(reverseMenuItem).toBeVisible({ timeout: 30_000 });
    await reverseMenuItem.click();

    const confirmationMessage = this.page.locator('div[id$="userRes"]');

    await expect(confirmationMessage).toBeVisible({ timeout: 60_000 });
    await expect(confirmationMessage).toHaveText(
      /^Your process \d+ has been submitted\.$/,
    );

    const confirmationText = (await confirmationMessage.textContent())?.trim();
    const processId = confirmationText?.match(
      /^Your process (\d+) has been submitted\.$/,
    )?.[1];

    if (!processId) {
      throw new Error(
        `Reverse confirmation did not contain a process ID: ${confirmationText}`,
      );
    }

    const okButton = this.page.locator(
      'button[id$="userResponsePopupDialogButtonOk"]',
    );

    await expect(okButton).toBeVisible({ timeout: 30_000 });
    await okButton.click();
    await expect(confirmationMessage).toBeHidden({ timeout: 30_000 });

    return processId;
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

  /**
   * Posts a journal whose approval status is Not required and returns the
   * exact posting process ID from Oracle's confirmation.
   */
  async postAutoApprovedJournal(): Promise<string> {
    const postButton = this.page.getByRole("button", {
      name: "Post",
      exact: true,
    });

    await expect(postButton).toBeVisible({ timeout: 30_000 });
    await expect(postButton).toBeEnabled();
    await postButton.click();

    const confirmationMessage = this.page.locator('div[id$="ap1:userRes"]');

    await expect(confirmationMessage).toBeVisible({ timeout: 60_000 });
    await expect(confirmationMessage).toHaveText(
      /^Your process \d+ has been submitted\.$/,
    );

    const messageText = (await confirmationMessage.textContent())?.trim();
    const postingProcessId = messageText?.match(
      /^Your process (\d+) has been submitted\.$/,
    )?.[1];

    if (!postingProcessId) {
      throw new Error(
        "Post confirmation did not contain the submitted process ID",
      );
    }

    const okButton = this.page.locator(
      'button[id$="userResponsePopupDialogButtonOk"]',
    );

    await expect(okButton).toBeVisible({ timeout: 30_000 });
    await expect(okButton).toHaveText("OK");
    await okButton.click();
    await expect(confirmationMessage).toBeHidden({ timeout: 30_000 });

    return postingProcessId;
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
