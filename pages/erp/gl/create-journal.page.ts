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

  async selectBalanceType(
    balanceType: "Actual" | "Encumbrance",
  ): Promise<void> {
    const balanceTypeSelect = this.page.getByLabel("Balance Type");

    const balanceTypeValue = balanceType === "Actual" ? "0" : "1";

    await balanceTypeSelect.selectOption(balanceTypeValue);
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

  async enterJournalLineAccount(
    lineNumber: number,
    account: string,
  ): Promise<void> {
    const lineRow = this.page.getByRole("row", {
      name: new RegExp(`^Expand ${lineNumber}\\b`),
    });

    await lineRow.locator("td").nth(3).click();

    const accountTextbox = lineRow.getByRole("textbox", {
      name: "Account",
      exact: true,
    });

    await expect(accountTextbox).toBeVisible({ timeout: 30_000 });
    await accountTextbox.fill(account);
    await expect(accountTextbox).toHaveValue(account);

    // await accountTextbox.press("Tab");
  }

  async enterJournalLineDebit(
    lineNumber: number,
    debitAmount: string,
  ): Promise<void> {
    const lineRow = this.page.getByRole("row", {
      name: new RegExp(`^Expand ${lineNumber}\\b`),
    });

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
  }

  async saveAndClose(): Promise<void> {
    await this.page.locator('[id*="saveBatch"][id$="::popEl"]').click();

    const saveAndCloseOption = this.page.getByRole("menuitem", {
      name: "Save and Close",
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

    await expect(completeButton).toBeHidden({ timeout: 60_000 });
  }

  async postJournal(): Promise<void> {
    await this.page.getByRole("button", { name: "Post" }).click();

    await expect(
      this.page.getByText(
        "The journal requires approval before it can be posted, and has been forwarded to the approver.",
      ),
    ).toBeVisible({ timeout: 60_000 });

    await this.page.locator('[id*="userResponsePopupDialogButtonOk"]').click();
  }

  //SAVED FOR FUTURE REFERENCE: This method is currently not used in the test, but it can be useful for future scenarios where we want to save the journal and create another one immediately after.
  // async saveAndCreateAnother(): Promise<void> {
  //   await this.page.locator('[id*="saveBatch"][id$="::popEl"]').click();

  //   const saveAndCreateAnotherOption = this.page.getByRole("menuitem", {
  //     name: "Save and Create Another",
  //   });

  //   await expect(saveAndCreateAnotherOption).toBeVisible({ timeout: 30_000 });
  //   await saveAndCreateAnotherOption.click();

  //   await this.waitForCreateJournalPage();
  // }
}
