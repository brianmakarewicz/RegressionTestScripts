import { expect, type Locator, type Page } from "@playwright/test";

/**
 * Represents the Oracle Fusion Run AutoReverse parameter page.
 */
export class AutoReverseJournalsPage {
  private readonly dataAccessSetSelect: Locator;
  private readonly ledgerSelect: Locator;
  private readonly reversalPeriodSelect: Locator;

  constructor(private page: Page) {
    this.dataAccessSetSelect = page.locator(
      '[id$="paramDynForm_Attribute3_ATTRIBUTE3::content"]',
    );

    this.ledgerSelect = page.locator(
      '[id$="paramDynForm_Attribute1_ATTRIBUTE1::content"]',
    );

    this.reversalPeriodSelect = page.locator(
      '[id$="paramDynForm_Attribute2_ATTRIBUTE2::content"]',
    );
  }

  /**
   * Confirms the AutoReverse process form is ready for parameter entry.
   */
  async waitForParameterForm(): Promise<void> {
    await expect(this.dataAccessSetSelect).toBeVisible({ timeout: 60_000 });

    await expect(this.ledgerSelect).toBeVisible({ timeout: 30_000 });

    await expect(this.reversalPeriodSelect).toBeVisible({ timeout: 30_000 });
  }

  /**
   * Submits AutoReverse with the requested ledger parameters and returns the
   * Oracle process ID for diagnostics.
   */
  async submitAutoReverse(parameters: {
    dataAccessSet: string;
    ledger: string;
    reversalPeriod: string;
  }): Promise<string> {
    await this.dataAccessSetSelect.selectOption({
      label: parameters.dataAccessSet,
    });
    await expect(this.dataAccessSetSelect.locator("option:checked")).toHaveText(
      parameters.dataAccessSet,
    );

    await this.ledgerSelect.selectOption({ label: parameters.ledger });
    await expect(this.ledgerSelect.locator("option:checked")).toHaveText(
      parameters.ledger,
    );

    await this.reversalPeriodSelect.selectOption({
      label: parameters.reversalPeriod,
    });
    await expect(
      this.reversalPeriodSelect.locator("option:checked"),
    ).toHaveText(parameters.reversalPeriod);

    const submitButton = this.page
      .locator('[id$="requestBtns:submitButton"]')
      .getByRole("button", { name: "Submit", exact: true });

    await expect(submitButton).toBeVisible({ timeout: 30_000 });
    await expect(submitButton).toBeEnabled();
    await submitButton.click();

    const confirmationMessage = this.page.getByText(
      /^Process \d+ was submitted\.$/,
    );

    await expect(confirmationMessage).toBeVisible({ timeout: 60_000 });

    const confirmationText = await confirmationMessage.textContent();
    const processId = confirmationText?.match(
      /^Process (\d+) was submitted\.$/,
    )?.[1];

    if (!processId) {
      throw new Error(
        `Unable to extract the AutoReverse process ID from: ${confirmationText}`,
      );
    }

    const okButton = this.page.locator(
      '[id$="confirmationPopup:confirmSubmitDialog::ok"]',
    );

    await expect(okButton).toBeVisible({ timeout: 30_000 });
    await okButton.click();
    await expect(confirmationMessage).toBeHidden({ timeout: 30_000 });

    return processId;
  }
}
