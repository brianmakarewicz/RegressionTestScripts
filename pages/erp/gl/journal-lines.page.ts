import { expect, type Page } from "@playwright/test";
import { type JournalLineSide } from "./inquire-on-detail-balances.page";

/** Models the Journal Lines drill-down opened from Period Activity. */
export class JournalLinesPage {
  constructor(private readonly page: Page) {}

  async expectLoaded(): Promise<void> {
    // The complete heading includes the selected account combination, which is
    // environment-specific. Assert only the stable page-name portion.
    await expect(
      this.page.getByRole("heading", { name: /Journal Lines/ }),
    ).toBeVisible({ timeout: 60_000 });
  }

  async openAmountForActivity(side: JournalLineSide): Promise<void> {
    const journalLinesTable = this.page.locator(
      'table[summary="Journal Lines"]',
    );
    const amountLink = journalLinesTable
      .locator(`a[title="${side}"]`)
      .filter({ hasText: /\S/ })
      .first();

    await expect(amountLink).toBeVisible({ timeout: 60_000 });
    await amountLink.click();
  }
}
