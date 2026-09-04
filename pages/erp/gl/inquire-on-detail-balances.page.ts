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
    required = true,
  ): Promise<void> {
    const combobox = this.criteriaCombobox(name);

    if (!required && (await combobox.count()) === 0) {
      return;
    }

    await expect(combobox).toBeVisible({ timeout: 30_000 });
    const defaultValue = (await combobox.inputValue()).trim();

    if (defaultValue && (!required || defaultValue === fallbackValue)) {
      // Preserve populated segment defaults. Required search criteria must
      // match the environment-specific JSON so the run is deterministic.
      await expect(combobox).toHaveValue(defaultValue);
      return;
    }

    await combobox.fill(fallbackValue);
    await combobox.press("Tab");
    await expect(combobox).toHaveValue(fallbackValue);
  }

  private async periodActivityLinks(): Promise<Locator> {
    const periodActivityHeader = this.page.getByRole("columnheader", {
      // Once this column is sorted, Oracle prepends its sort controls to the
      // accessible name. Match the label anywhere so the same header is found
      // both before and after sorting.
      name: /Period Activity\b/,
    });

    await expect(periodActivityHeader).toBeVisible({ timeout: 30_000 });
    const columnIndex = await periodActivityHeader.evaluate((header) =>
      Array.from(header.parentElement?.children ?? []).indexOf(header),
    );

    if (columnIndex < 0) {
      throw new Error("Unable to determine the Period Activity column");
    }

    // Segment columns and Oracle-generated IDs vary by environment. Resolve
    // the cell position from the visible header so only Period Activity links
    // are considered, regardless of the environment's table layout.
    return this.page
      .locator('table[summary="Detail Balances"]')
      .locator(`tbody > tr > td:nth-child(${columnIndex + 1})`)
      .getByRole("link");
  }

  private async firstPeriodActivityLink(): Promise<Locator> {
    return (await this.periodActivityLinks()).first();
  }

  private async periodActivityValue(
    periodActivityLink: Locator,
  ): Promise<number> {
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

  private async findNonZeroPeriodActivity(): Promise<
    { link: Locator; value: number } | undefined
  > {
    const activityLinks = await this.periodActivityLinks();

    for (let index = 0; index < (await activityLinks.count()); index += 1) {
      const link = activityLinks.nth(index);
      const value = await this.periodActivityValue(link);

      if (value !== 0) {
        return { link, value };
      }
    }

    return undefined;
  }

  private async sortPeriodActivity(
    direction: "Ascending" | "Descending",
  ): Promise<void> {
    await this.page.getByRole("menuitem", { name: "View", exact: true }).click();
    await this.page.getByRole("menuitem", { name: "Sort", exact: true }).click();
    await this.page
      .getByRole("menuitem", { name: "Advanced...", exact: true })
      .click();

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

    if (!(await directionRadio.isChecked())) {
      await directionLabel.click();
    }

    await expect(directionRadio).toBeChecked();
    await okButton.click();
    await expect(sortBySelect).toBeHidden({ timeout: 30_000 });
  }

  async search(criteria: InquireOnDetailBalancesData): Promise<void> {
    const requiredFields: Array<[string, string]> = [
      ["Ledger or Ledger Set", criteria.ledgerOrLedgerSet],
      ["From Accounting Period", criteria.fromAccountingPeriod],
      ["To Accounting Period", criteria.toAccountingPeriod],
    ];

    for (const [name, fallbackValue] of requiredFields) {
      await this.useDefaultOrSetAutocompleteValue(name, fallbackValue);
    }

    for (const [name, fallbackValue] of Object.entries(
      criteria.segmentDefaults,
    )) {
      await this.useDefaultOrSetAutocompleteValue(name, fallbackValue, false);
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
    await expect(await this.firstPeriodActivityLink()).toBeVisible({
      timeout: 60_000,
    });
  }

  /**
   * Opens a Period Activity with actual activity without relying on a specific
   * client account or amount.
   */
  async openNonZeroPeriodActivity(): Promise<JournalLineSide> {
    let activity = await this.findNonZeroPeriodActivity();

    if (!activity) {
      for (const direction of ["Descending", "Ascending"] as const) {
        await this.sortPeriodActivity(direction);

        try {
          await expect
            .poll(
              async () => (await this.findNonZeroPeriodActivity()) !== undefined,
              { timeout: 30_000 },
            )
            .toBe(true);
          activity = await this.findNonZeroPeriodActivity();
        } catch {
          activity = undefined;
        }

        if (activity) {
          break;
        }
      }
    }

    if (activity) {
      await activity.link.click();
      return activity.value > 0 ? "Debit" : "Credit";
    }

    throw new Error(
      "The configured search returned no non-zero Period Activity values",
    );
  }
}
