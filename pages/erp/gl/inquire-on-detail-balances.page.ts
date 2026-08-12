import { expect, type Locator, type Page } from "@playwright/test";
import { type InquireOnDetailBalancesData } from "../../../types/erp/gl/inquire-on-detail-balances-data";

/** Models the search criteria on Inquire on Detail Balances. */
export class InquireOnDetailBalancesPage {
  constructor(private page: Page) {}

  private criteriaCombobox(name: string): Locator {
    return this.page.getByRole("combobox", { name, exact: true });
  }

  private async setAutocompleteValue(
    combobox: Locator,
    value: string,
  ): Promise<void> {
    await expect(combobox).toBeVisible({ timeout: 30_000 });
    await combobox.fill(value);
    await combobox.press("Tab");
    await expect(combobox).toHaveValue(value);
  }

  async search(criteria: InquireOnDetailBalancesData): Promise<void> {
    await this.setAutocompleteValue(
      this.criteriaCombobox("Ledger or Ledger Set"),
      criteria.ledgerOrLedgerSet,
    );
    await this.setAutocompleteValue(
      this.criteriaCombobox("From Accounting Period"),
      criteria.fromAccountingPeriod,
    );
    await this.setAutocompleteValue(
      this.criteriaCombobox("To Accounting Period"),
      criteria.toAccountingPeriod,
    );

    const searchButton = this.page.getByRole("button", {
      name: "Search",
      exact: true,
    });

    await expect(searchButton).toBeVisible({ timeout: 30_000 });
    await expect(searchButton).toBeEnabled();
    await searchButton.click();
  }
}
