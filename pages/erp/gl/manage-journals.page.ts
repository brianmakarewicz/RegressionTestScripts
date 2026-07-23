import { expect, type Page } from "@playwright/test";

export class ManageJournalsPage {
  constructor(private page: Page) {}

  private async ensureSearchPanelExpanded(): Promise<void> {
    const journalBatchTextbox = this.page.getByRole("textbox", {
      name: "Journal Batch",
      exact: true,
    });

    if (await journalBatchTextbox.isVisible()) {
      return;
    }

    const expandSearchButton = this.page.getByRole("button", {
      name: "Expand Search",
      exact: true,
    });

    await expect(expandSearchButton).toBeVisible({ timeout: 30_000 });
    await expandSearchButton.click();

    await expect(journalBatchTextbox).toBeVisible({ timeout: 30_000 });
  }

  private async submitJournalBatchSearch(
    journalBatchName: string,
  ): Promise<void> {
    await this.ensureSearchPanelExpanded();

    const journalBatchTextbox = this.page.getByRole("textbox", {
      name: "Journal Batch",
      exact: true,
    });

    const accountingPeriodCombobox = this.page.getByRole("combobox", {
      name: "Accounting Period",
      exact: true,
    });

    const searchButton = this.page.getByRole("button", {
      name: "Search",
      exact: true,
    });

    await expect(journalBatchTextbox).toBeVisible({ timeout: 30_000 });
    await journalBatchTextbox.fill(journalBatchName);

    await expect(journalBatchTextbox).toHaveValue(journalBatchName);

    await expect(accountingPeriodCombobox).toBeVisible({
      timeout: 30_000,
    });

    await accountingPeriodCombobox.fill("");

    await expect(accountingPeriodCombobox).toHaveValue("");

    await expect(searchButton).toBeVisible({ timeout: 30_000 });
    await searchButton.click();
  }

  async searchForJournalBatch(journalBatchName: string): Promise<void> {
    await this.submitJournalBatchSearch(journalBatchName);

    const journalBatchLink = this.page.getByRole("link", {
      name: journalBatchName,
      exact: true,
    });

    await expect(journalBatchLink).toBeVisible({ timeout: 30_000 });
  }

  async openJournalBatch(journalBatchName: string): Promise<void> {
    const journalBatchLink = this.page.getByRole("link", {
      name: journalBatchName,
      exact: true,
    });

    await expect(journalBatchLink).toBeVisible({ timeout: 30_000 });
    await journalBatchLink.click();
  }

  async verifyJournalBatchWasDeleted(journalBatchName: string): Promise<void> {
    await this.submitJournalBatchSearch(journalBatchName);

    await expect(
      this.page.getByRole("link", {
        name: journalBatchName,
        exact: true,
      }),
    ).toBeHidden({ timeout: 30_000 });

    await expect(
      this.page.getByRole("cell", {
        name: "No results found.",
        exact: true,
      }),
    ).toBeVisible({ timeout: 30_000 });
  }
}
