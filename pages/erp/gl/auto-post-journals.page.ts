import { expect, type Page } from "@playwright/test";

/**
 * Represents the Oracle Fusion Run AutoPost process page.
 */
export class AutoPostJournalsPage {
  constructor(private page: Page) {}

  /**
   * Confirms that the AutoPost Journals process page has loaded.
   */
  async verifyProcessName(): Promise<void> {
    const nameLabel = this.page.locator(
      'label[for$="processName::content"]',
    );
    const processHeaderRow = nameLabel.locator("xpath=ancestor::tr[1]");

    await expect(nameLabel).toHaveText("Name");
    await expect(processHeaderRow).toBeVisible({ timeout: 60_000 });
    await expect(processHeaderRow).toContainText("AutoPost Journals");
  }

  /**
   * Selects an AutoPost criteria set, submits the process, acknowledges the
   * confirmation, and returns its process ID for diagnostics.
   */
  async submitAutoPost(criteriaSet: string): Promise<string> {
    const criteriaSetSelect = this.page.getByLabel("AutoPost Criteria Set", {
      exact: true,
    });

    await expect(criteriaSetSelect).toBeVisible({ timeout: 30_000 });
    await criteriaSetSelect.selectOption({ label: criteriaSet });
    await expect(criteriaSetSelect.locator("option:checked")).toHaveText(
      criteriaSet,
    );

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
        `Unable to extract the AutoPost process ID from: ${confirmationText}`,
      );
    }

    const okButton = this.page.locator(
      '[id$="confirmationPopup:confirmSubmitDialog::ok"]',
    );

    await expect(okButton).toBeVisible({ timeout: 30_000 });
    await okButton.click();

    await expect(
      this.page.getByRole("heading", {
        name: "Journals",
        exact: true,
        level: 1,
      }),
    ).toBeVisible({ timeout: 60_000 });

    return processId;
  }
}
