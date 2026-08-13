import { expect, type Locator, type Page } from "@playwright/test";
import { type InquireOnDetailBalancesData } from "../../../types/erp/gl/inquire-on-detail-balances-data";

export type JournalLineSide = "Debit" | "Credit";

/** Models the search criteria on Inquire on Detail Balances. */
export class InquireOnDetailBalancesPage {
  constructor(private page: Page) {}

  private criteriaCombobox(name: string): Locator {
    return this.page.getByRole("combobox", { name, exact: true });
  }

  private async useDefaultOrSetAutocompleteValue(
    name: string,
    fallbackValue: string,
  ): Promise<void> {
    const combobox = this.criteriaCombobox(name);

    await expect(combobox).toBeVisible({ timeout: 30_000 });
    const defaultValue = (await combobox.inputValue()).trim();

    if (defaultValue) {
      // Preserve client- and user-specific defaults supplied by Fusion.
      await expect(combobox).toHaveValue(defaultValue);
      return;
    }

    await combobox.fill(fallbackValue);
    await combobox.press("Tab");
    await expect(combobox).toHaveValue(fallbackValue);
  }

  private async sortPeriodActivity(
    direction: "Ascending" | "Descending",
  ): Promise<void> {
    const previousFirstActivity =
      await this.firstPeriodActivityLink().elementHandle();
    const viewMenuItem = this.page.getByRole("menuitem", {
      name: "View",
      exact: true,
    });

    await expect(viewMenuItem).toBeVisible({ timeout: 30_000 });
    await viewMenuItem.click();

    const sortMenuItem = this.page.getByRole("menuitem", {
      name: "Sort",
      exact: true,
    });

    await expect(sortMenuItem).toBeVisible({ timeout: 30_000 });
    await sortMenuItem.click();

    const advancedSortMenuItem = this.page.getByRole("menuitem", {
      name: "Advanced...",
      exact: true,
    });

    await expect(advancedSortMenuItem).toBeVisible({ timeout: 30_000 });
    await advancedSortMenuItem.click();

    const sortBySelect = this.page.locator(
      'select[id$="_srtDlgC0::content"]',
    );
    const directionRadio = this.page.locator(
      `input[id$="_srtDlgR0:${direction === "Ascending" ? "_0" : "_1"}"]`,
    );
    const directionLabel = directionRadio.locator(
      "xpath=following-sibling::label",
    );
    const okButton = this.page.getByRole("button", {
      name: "OK",
      exact: true,
    });

    await expect(sortBySelect).toBeVisible({ timeout: 30_000 });
    await sortBySelect.selectOption("Period_Activity");
    await expect(directionRadio).toBeVisible();
    // Oracle renders the associated label over the radio input. Activate the
    // confirmed label instead of forcing a pointer event through the overlay.
    if (!(await directionRadio.isChecked())) {
      await directionLabel.click();
    }
    await expect(directionRadio).toBeChecked();
    await expect(okButton).toBeEnabled();
    await okButton.click();

    await expect(sortBySelect).toBeHidden({ timeout: 30_000 });

    // Closing Advanced Sort happens before ADF replaces the result rows. Wait
    // for the previous first link to leave the DOM so its stale value cannot be
    // mistaken for the completed sort result.
    if (previousFirstActivity) {
      await this.page.waitForFunction(
        (element) => !element.isConnected,
        previousFirstActivity,
        { timeout: 60_000 },
      );
    }

    await expect(this.firstPeriodActivityLink()).toBeVisible({
      timeout: 60_000,
    });
  }

  private firstPeriodActivityLink(): Locator {
    return this.page
      .locator('table[summary="Detail Balances"]')
      .locator('a[id$="cl1j_id_17"]')
      .first();
  }

  private async firstPeriodActivityValue(): Promise<number> {
    const periodActivityLink = this.firstPeriodActivityLink();

    await expect(periodActivityLink).toBeVisible({ timeout: 30_000 });
    const displayedValue = (await periodActivityLink.innerText()).trim();
    const isParenthesized =
      displayedValue.startsWith("(") && displayedValue.endsWith(")");
    const normalizedValue = displayedValue.replace(/[$,()\s]/g, "");
    const numericValue = Number(normalizedValue);

    if (!Number.isFinite(numericValue)) {
      throw new Error(
        `Unable to parse Period Activity value: ${displayedValue}`,
      );
    }

    return isParenthesized ? -numericValue : numericValue;
  }

  async search(criteria: InquireOnDetailBalancesData): Promise<void> {
    const configuredFields: Array<[string, string | undefined]> = [
      ["Ledger or Ledger Set", criteria.ledgerOrLedgerSet],
      ["From Accounting Period", criteria.fromAccountingPeriod],
      ["To Accounting Period", criteria.toAccountingPeriod],
      ["Currency", criteria.currency],
      ["Currency Type", criteria.currencyType],
      ["Scenario", criteria.scenario],
      ["Legal Entity", criteria.legalEntity],
      ["SBU", criteria.sbu],
      ["Region", criteria.region],
      ["Cost Center", criteria.costCenter],
      ["Natural Account", criteria.naturalAccount],
      ["Intercompany", criteria.intercompany],
      ["Future1", criteria.future1],
    ];

    for (const [name, fallbackValue] of configuredFields) {
      if (fallbackValue !== undefined) {
        await this.useDefaultOrSetAutocompleteValue(name, fallbackValue);
      }
    }

    const searchButton = this.page.getByRole("button", {
      name: "Search",
      exact: true,
    });

    await expect(searchButton).toBeVisible({ timeout: 30_000 });
    await expect(searchButton).toBeEnabled();
    await searchButton.click();

    // The Search Results toolbar can appear before Oracle finishes populating
    // its virtualized data table. Wait for an actual drill-down link rather
    // than using a fixed delay or treating the toolbar as search completion.
    await expect(this.firstPeriodActivityLink()).toBeVisible({
      timeout: 60_000,
    });
  }

  /**
   * Opens a Period Activity with actual activity without relying on a specific
   * client account or amount.
   */
  async openNonZeroPeriodActivity(): Promise<JournalLineSide> {
    // Avoid sorting when the first row returned by the original search already
    // provides a usable drill-down amount.
    const initialActivity = await this.firstPeriodActivityValue();

    if (initialActivity !== 0) {
      await this.firstPeriodActivityLink().click();
      return initialActivity > 0 ? "Debit" : "Credit";
    }

    // Oracle defaults Advanced Sort to Ascending, so use that direction first
    // and avoid changing the radio unless the descending fallback is needed.
    await this.sortPeriodActivity("Ascending");

    const ascendingActivity = await this.firstPeriodActivityValue();

    if (ascendingActivity !== 0) {
      await this.firstPeriodActivityLink().click();
      return ascendingActivity > 0 ? "Debit" : "Credit";
    }

    await this.sortPeriodActivity("Descending");

    const descendingActivity = await this.firstPeriodActivityValue();

    if (descendingActivity !== 0) {
      await this.firstPeriodActivityLink().click();
      return descendingActivity > 0 ? "Debit" : "Credit";
    }

    throw new Error(
      "The configured search returned no non-zero Period Activity values",
    );
  }
}
