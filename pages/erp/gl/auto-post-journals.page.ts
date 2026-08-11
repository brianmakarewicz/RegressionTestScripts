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
}
