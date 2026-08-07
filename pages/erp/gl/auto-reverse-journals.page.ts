import { expect, type Page } from "@playwright/test";

/**
 * Represents the Oracle Fusion Run AutoReverse parameter page.
 */
export class AutoReverseJournalsPage {
  constructor(private page: Page) {}

  /**
   * Confirms the AutoReverse process form is ready for parameter entry.
   */
  async waitForParameterForm(): Promise<void> {
    await expect(
      this.page.locator(
        '[id$="paramDynForm_Attribute3_ATTRIBUTE3::content"]',
      ),
    ).toBeVisible({ timeout: 60_000 });

    await expect(
      this.page.locator(
        '[id$="paramDynForm_Attribute1_ATTRIBUTE1::content"]',
      ),
    ).toBeVisible({ timeout: 30_000 });

    await expect(
      this.page.locator(
        '[id$="paramDynForm_Attribute2_ATTRIBUTE2::content"]',
      ),
    ).toBeVisible({ timeout: 30_000 });
  }
}
