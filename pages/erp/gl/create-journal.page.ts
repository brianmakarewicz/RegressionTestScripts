import { expect, type Page } from "@playwright/test";

/**
 * Represents the Oracle Fusion Create Journal page.
 *
 * This page object encapsulates all UI interactions required to create,
 * process, and validate manual journals so that test scenarios remain
 * focused on business workflows rather than page implementation details.
 */
export class CreateJournalPage {
  constructor(private page: Page) {}

  // Journal batch and header fields
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

  async selectBalanceType(
    balanceType: "Actual" | "Encumbrance",
  ): Promise<void> {
    const balanceTypeRow = this.page.locator('tr[id$="ShowLessBalanceType"]');

    await expect(balanceTypeRow).toBeVisible({ timeout: 30_000 });

    const editableSelect = balanceTypeRow.locator("select");

    if (await editableSelect.isVisible()) {
      await editableSelect.selectOption({ label: balanceType });
      await expect(editableSelect).toHaveValue(
        balanceType === "Actual" ? "0" : "1",
      );
      return;
    }

    // Some Fusion environments render Balance Type as read-only.
    const readOnlyValue = balanceTypeRow.locator(
      'span[id$="ShowLessBalanceType::content"]',
    );

    await expect(readOnlyValue).toHaveText(balanceType);
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

  async selectLedger(ledgerName: string): Promise<void> {
    const ledgerTextbox = this.page.getByRole("textbox", {
      name: "Ledger",
    });

    await ledgerTextbox.click();

    const ledgerOption = this.page.getByRole("gridcell", {
      name: ledgerName,
      exact: true,
    });

    await expect(ledgerOption).toBeVisible({ timeout: 30_000 });
    await ledgerOption.click();

    await expect(ledgerTextbox).toHaveValue(ledgerName);
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

  // Journal line entry
  async enterJournalLineAccount(
    lineNumber: number,
    account: string,
  ): Promise<void> {
    const lineRow = this.page.getByRole("row", {
      name: new RegExp(`^Expand ${lineNumber}\\b`),
    });

    // Activating the account cell causes Oracle's editable textbox to appear.
    await lineRow.locator("td").nth(3).click();

    const accountTextbox = lineRow.getByRole("textbox", {
      name: "Account",
      exact: true,
    });

    await expect(accountTextbox).toBeVisible({ timeout: 30_000 });
    await accountTextbox.fill(account);
    await accountTextbox.press("Tab");

    // Confirm Oracle retained the account after validating the combination.
    await expect(accountTextbox).toHaveValue(account);

    await expect(
      this.page.getByText(
        "Attribute CodeCombinationId in JournalLineEO is required.",
        { exact: true },
      ),
    ).toBeHidden({ timeout: 30_000 });
  }

  async enterJournalLineDebit(
    lineNumber: number,
    debitAmount: string,
  ): Promise<void> {
    const lineRow = this.page.getByRole("row", {
      name: new RegExp(`^Expand ${lineNumber}\\b`),
    });

    // The debit editor is activated by selecting the debit column in the row.
    await lineRow.locator("td").nth(4).click();

    const debitTextbox = this.page.getByRole("textbox", {
      name: "Entered Debit",
    });

    await expect(debitTextbox).toBeVisible({ timeout: 30_000 });
    await debitTextbox.fill(debitAmount);
    await expect(debitTextbox).toHaveValue(debitAmount);
  }

  async enterJournalLineCredit(
    lineNumber: number,
    creditAmount: string,
  ): Promise<void> {
    const lineRow = this.page.getByRole("row", {
      name: new RegExp(`^Expand ${lineNumber}\\b`),
    });

    // The credit editor is activated by selecting the credit column in the row.
    await lineRow.locator("td").nth(5).click();

    const creditTextbox = this.page.getByRole("textbox", {
      name: "Entered Credit",
    });

    await expect(creditTextbox).toBeVisible({ timeout: 30_000 });
    await creditTextbox.fill(creditAmount);
    await expect(creditTextbox).toHaveValue(creditAmount);
  }

  async enterJournalLineDescription(
    lineNumber: number,
    description: string,
  ): Promise<void> {
    const lineRow = this.page.getByRole("row", {
      name: new RegExp(`^Expand ${lineNumber}\\b`),
    });

    const descriptionTextbox = lineRow.getByRole("textbox", {
      name: "Description",
    });

    await descriptionTextbox.scrollIntoViewIfNeeded();
    await expect(descriptionTextbox).toBeVisible({ timeout: 30_000 });
    await descriptionTextbox.fill(description);
    await expect(descriptionTextbox).toHaveValue(description);

    // Commit the final grid edit before a page-level action such as Save.
    // Oracle ADF can otherwise consume the next key while closing the editor.
    await descriptionTextbox.press("Tab");

    // ADF can replace this row's Description textbox with a read-only span
    // on Tab. Both use the it4::content field shown in the captured DOM.
    // Re-resolve it after blur instead of requiring the textbox to survive.
    // Compare raw value/text so trimming or dropping the description fails.
    const committedDescription = lineRow.locator('[id$=":it4::content"]');

    await expect(descriptionTextbox).not.toBeFocused();
    await expect
      .poll(
        () => committedDescription.evaluateAll((elements) =>
          elements.map((element) =>
            element instanceof HTMLInputElement ||
            element instanceof HTMLTextAreaElement
              ? element.value
              : element.textContent,
          ),
        ),
        {
          message: `Journal line ${lineNumber} must retain its Description after Tab commits the edit`,
          timeout: 30_000,
        },
      )
      .toEqual([description]);
  }

  // Journal processing actions
  async saveAndClose(): Promise<void> {
    // Oracle renders the Save dropdown as a separate anchor beside the Save
    // action. Clicking it directly avoids keyboard events being consumed by
    // an ADF journal-line editor that is still finishing its blur processing.
    const saveDropdown = this.page.locator(
      'a[id$="saveBatch::popEl"]',
    );

    await expect(saveDropdown).toBeVisible({ timeout: 30_000 });
    await saveDropdown.click();

    const saveAndCloseOption = this.page.getByRole("menuitem", {
      name: "Save and Close",
      exact: true,
    });

    await expect(saveAndCloseOption).toBeVisible({ timeout: 30_000 });
    await saveAndCloseOption.click();
  }

  async save(): Promise<void> {
    await this.page.getByRole("button", { name: "Save" }).click();
  }

  async completeJournal(): Promise<void> {
    const completeButton = this.page.getByRole("button", { name: "Complete" });

    await completeButton.click();

    // The Complete button disappears after Oracle finishes the transition.
    await expect(completeButton).toBeHidden({ timeout: 60_000 });
  }

  async postJournal(): Promise<void> {
    await this.page.getByRole("button", { name: "Post" }).click();

    // Posting an approval-required journal submits it for approval with posting.
    await expect(
      this.page.getByText(
        "The journal requires approval before it can be posted, and has been forwarded to the approver.",
      ),
    ).toBeVisible({ timeout: 60_000 });

    await this.page.locator('[id*="userResponsePopupDialogButtonOk"]').click();
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

    // Wait for the ADF table to render before attempting action validation.
    await expect(
      this.page.getByRole("table", { name: "Action Log" }),
    ).toBeVisible({ timeout: 30_000 });
  }

  async verifyActionLogContainsAction(expectedAction: string): Promise<void> {
    // Scope the exact action text to the Action Log to avoid unrelated matches.
    const actionLogTable = this.page.getByRole("table", {
      name: "Action Log",
    });

    await expect(
      actionLogTable.getByText(expectedAction, { exact: true }),
    ).toBeVisible({ timeout: 30_000 });
  }
}
