import { expect, type Page } from "@playwright/test";
import { type ImportJournalsData } from "../../../types/erp/gl/import-journals-data";

/**
 * Represents the Oracle Fusion Import Journals process page.
 */
export class ImportJournalsPage {
  constructor(private page: Page) {}

  /**
   * Confirms that the Import Journals process form has loaded.
   */
  async verifyProcessName(): Promise<void> {
    const nameLabel = this.page.locator(
      'label[for$="requestHeader:processName::content"]',
    );
    const processNameCell = this.page.locator(
      'td[id$="requestHeader:cf8"]',
    );

    // Oracle renders a hidden span and a visible text node with the same
    // process name. Assert the visible containing cell rather than the span.
    await expect(nameLabel).toBeVisible({ timeout: 60_000 });
    await expect(nameLabel).toHaveText("Name");
    await expect(processNameCell).toBeVisible({ timeout: 60_000 });
    await expect(processNameCell).toContainText("Import Journals");
  }

  /**
   * Sets the environment-specific import scope while retaining every other
   * parameter value supplied by Oracle.
   */
  async enterParameters(data: ImportJournalsData): Promise<void> {
    const sourceCombobox = this.page.getByRole("combobox", {
      name: "Source",
      exact: true,
    });
    const ledgerCombobox = this.page.getByRole("combobox", {
      name: "Ledger",
      exact: true,
    });

    await expect(sourceCombobox).toBeVisible({ timeout: 30_000 });
    await sourceCombobox.fill(data.source);
    // Source is an Oracle ADF autocomplete field; Tab commits the typed value
    // and allows its dependent Ledger list to refresh.
    await sourceCombobox.press("Tab");
    await expect(sourceCombobox).toHaveValue(data.source, {
      timeout: 30_000,
    });

    await expect(ledgerCombobox).toBeVisible({ timeout: 30_000 });
    await ledgerCombobox.selectOption({ label: data.ledger });
    await expect(ledgerCombobox.locator("option:checked")).toHaveText(
      data.ledger,
    );
  }

  /**
   * Submits Import Journals, acknowledges Oracle's confirmation, and returns
   * the exact scheduled-process ID for later validation and diagnostics.
   */
  async submit(): Promise<string> {
    const submitButton = this.page
      .locator('div[id$="requestBtns:submitButton"]')
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
        `Unable to extract the Import Journals process ID from: ${confirmationText}`,
      );
    }

    const okButton = this.page.locator(
      'button[id$="confirmationPopup:confirmSubmitDialog::ok"]',
    );

    await expect(okButton).toBeVisible({ timeout: 30_000 });
    await expect(okButton).toHaveText("OK");
    await okButton.click();
    await expect(confirmationMessage).toBeHidden({ timeout: 30_000 });

    return processId;
  }
}
