import { expect, type Page } from "@playwright/test";

/**
 * Represents the Oracle Fusion Manage Journals page.
 *
 * Provides reusable methods for interacting with journal batches and
 * related controls on the page.
 */
export class ManageJournalsPage {
  constructor(private page: Page) {}

  /**
   * Closes Manage Journals and returns to the Journals workspace.
   */
  async clickDone(): Promise<void> {
    const doneButton = this.page.getByRole("button", {
      name: "Done",
      exact: true,
    });

    await expect(doneButton).toBeVisible({ timeout: 30_000 });
    await expect(doneButton).toBeEnabled();
    await doneButton.click();

    await expect(
      this.page.locator("h1", { hasText: /^Journals$/ }),
    ).toBeVisible({ timeout: 60_000 });
  }

  // Search panel preparation
  private async ensureSearchPanelExpanded(): Promise<void> {
    const journalBatchTextbox = this.page.getByRole("textbox", {
      name: "Journal Batch",
      exact: true,
    });

    // Oracle may collapse the search panel after returning from another action.
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

  // Shared journal batch search
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

    // Clear the period so a previous or default value does not restrict the search.
    await accountingPeriodCombobox.fill("");

    await expect(accountingPeriodCombobox).toHaveValue("");

    await expect(searchButton).toBeVisible({ timeout: 30_000 });
    await searchButton.click();
  }

  // Journal batch result actions
  async searchForJournalBatch(journalBatchName: string): Promise<void> {
    await this.submitJournalBatchSearch(journalBatchName);

    const journalBatchLink = this.page.getByRole("link", {
      name: journalBatchName,
      exact: true,
    });

    // Confirm the search returned the exact journal batch requested by the test.
    await expect(journalBatchLink.first()).toBeVisible({ timeout: 30_000 });
  }

  async openJournalBatch(journalBatchName: string): Promise<void> {
    const journalBatchLink = this.page.getByRole("link", {
      name: journalBatchName,
      exact: true,
    });

    await expect(journalBatchLink.first()).toBeVisible({ timeout: 30_000 });
    // Oracle can add a reporting-ledger row with the same batch name after
    // posting. The first exact match is the primary journal used by this flow.
    await journalBatchLink.first().click();
  }

  /**
   * Opens the journal result for the requested ledger.
   *
   * Oracle can return primary- and reporting-ledger journals with the same
   * batch name, so the matching row must be selected before its Journal link
   * is opened.
   */
  async openJournalForLedger(
    journalBatchName: string,
    ledgerName: string,
  ): Promise<void> {
    const searchResultsTable = this.page.getByRole("table", {
      name: "Search Results",
      exact: true,
    });

    const journalBatchLinks = searchResultsTable.getByRole("link", {
      name: journalBatchName,
      exact: true,
    });

    const matchingRow = journalBatchLinks
      .locator("xpath=ancestor::tr[1]")
      .filter({ hasText: ledgerName });

    await expect(matchingRow).toHaveCount(1, { timeout: 30_000 });
    await expect(
      matchingRow.getByText(ledgerName, { exact: true }),
    ).toBeVisible();

    const journalLink = matchingRow.locator('a[id$="commandLink3"]');

    await expect(journalLink).toBeVisible({ timeout: 30_000 });
    await journalLink.click();
  }

  /**
   * Waits for Oracle's asynchronous post-approval process to finish.
   *
   * Approval returns before posting is complete, so the search must be
   * resubmitted to refresh the grid. Oracle can return both primary-ledger and
   * reporting-ledger rows for the same exact batch name; every row currently
   * returned must show Posted before the test can continue.
   */
  async waitForJournalBatchToBePosted(
    journalBatchName: string,
  ): Promise<void> {
    await expect
      .poll(
        async () => {
          await this.submitJournalBatchSearch(journalBatchName);

          const journalBatchLinks = this.page.getByRole("link", {
            name: journalBatchName,
            exact: true,
          });
          const resultCount = await journalBatchLinks.count();

          if (resultCount === 0) {
            // A temporary empty result is treated as an incomplete refresh and
            // retried until the polling timeout is reached.
            return false;
          }

          for (let index = 0; index < resultCount; index += 1) {
            // Scope the status check to the row containing this exact batch
            // link so an unrelated Posted journal cannot satisfy the poll.
            const resultRow = journalBatchLinks
              .nth(index)
              .locator("xpath=ancestor::tr[1]");

            if (!(await resultRow.getByText("Posted", { exact: true }).count())) {
              return false;
            }
          }

          return true;
        },
        {
          message: `Expected every ${journalBatchName} search result to be posted`,
          // Posting time varies by environment; poll at bounded intervals
          // instead of introducing a fixed wait into every execution.
          timeout: 120_000,
          intervals: [5_000, 10_000],
        },
      )
      .toBe(true);
  }

  // Journal batch deletion verification
  async verifyJournalBatchWasDeleted(journalBatchName: string): Promise<void> {
    await this.submitJournalBatchSearch(journalBatchName);

    // The deleted batch must no longer be available as a search result.
    await expect(
      this.page.getByRole("link", {
        name: journalBatchName,
        exact: true,
      }),
    ).toBeHidden({ timeout: 30_000 });

    // Confirm the empty grid is a completed search result, not a loading state.
    await expect(
      this.page.getByRole("cell", {
        name: "No results found.",
        exact: true,
      }),
    ).toBeVisible({ timeout: 30_000 });
  }
}
