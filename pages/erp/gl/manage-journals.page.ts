import { expect, type Page } from "@playwright/test";

/**
 * Represents the Oracle Fusion Manage Journals page.
 *
 * Provides reusable methods for interacting with journal batches and
 * related controls on the page.
 */
export class ManageJournalsPage {
  constructor(private page: Page) {}

  private journalBatchResultLinksByNameOrPrefix(
    journalNameOrPrefix: string,
  ) {
    const searchResultsTable = this.page.getByRole("table", {
      name: "Search Results",
      exact: true,
    });
    const escapedNameOrPrefix = journalNameOrPrefix.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&",
    );

    return searchResultsTable
      .locator('a[id$="commandLink4"]')
      .filter({
        hasText: new RegExp(`^${escapedNameOrPrefix}(?:$|\\s)`),
      });
  }

  private journalRowForLedgerByNameOrPrefix(
    journalNameOrPrefix: string,
    ledgerName: string,
  ) {
    return this.journalBatchResultLinksByNameOrPrefix(journalNameOrPrefix)
      .locator("xpath=ancestor::tr[1]")
      .filter({ hasText: ledgerName });
  }

  private journalRowsForBatch(journalBatchName: string) {
    const searchResultsTable = this.page.getByRole("table", {
      name: "Search Results",
      exact: true,
    });

    return searchResultsTable
      .getByRole("link", {
        name: journalBatchName,
        exact: true,
      })
      .locator("xpath=ancestor::tr[1]");
  }

  private journalRowForLedger(
    journalBatchName: string,
    ledgerName: string,
  ) {
    const searchResultsTable = this.page.getByRole("table", {
      name: "Search Results",
      exact: true,
    });

    return searchResultsTable
      .getByRole("link", {
        name: journalBatchName,
        exact: true,
      })
      .locator("xpath=ancestor::tr[1]")
      .filter({ hasText: ledgerName });
  }

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

  /** Searches for the unposted reversal created from a Manual journal ID. */
  private async submitReversalJournalSearch(
    sourceJournalId: string,
    reversalPeriod: string,
  ): Promise<void> {
    await this.ensureSearchPanelExpanded();

    const journalBatchTextbox = this.page.getByRole("textbox", {
      name: "Journal Batch",
      exact: true,
    });
    const journalBatchOperator = this.page.getByRole("combobox", {
      name: "Journal Batch Operator",
      exact: true,
    });

    await expect(journalBatchOperator).toBeVisible({ timeout: 30_000 });
    await journalBatchOperator.selectOption({ label: "Contains" });
    await expect(
      journalBatchOperator.locator("option:checked"),
    ).toHaveText("Contains");
    await journalBatchTextbox.fill(sourceJournalId);
    await expect(journalBatchTextbox).toHaveValue(sourceJournalId);

    const accountingPeriodCombobox = this.page.getByRole("combobox", {
      name: "Accounting Period",
      exact: true,
    });

    await accountingPeriodCombobox.fill(reversalPeriod);
    // This Manage Journals search field commits its typed value on Tab. It
    // does not expose the gridcell suggestions used by the Edit Journal LOV.
    await accountingPeriodCombobox.press("Tab");
    await expect(accountingPeriodCombobox).toHaveValue(reversalPeriod);

    const batchStatusSelect = this.page.getByRole("combobox", {
      name: "Batch Status",
      exact: true,
    });

    await expect(batchStatusSelect).toBeVisible({ timeout: 30_000 });
    await batchStatusSelect.selectOption({ label: "Unposted" });
    await expect(batchStatusSelect.locator("option:checked")).toHaveText(
      "Unposted",
    );

    const searchButton = this.page.getByRole("button", {
      name: "Search",
      exact: true,
    });

    await expect(searchButton).toBeEnabled();
    await searchButton.click();
  }

  private reversalJournalRow(
    sourceJournalId: string,
    ledgerName: string,
  ) {
    const escapedJournalId = sourceJournalId.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&",
    );
    const searchResultsTable = this.page.getByRole("table", {
      name: "Search Results",
      exact: true,
    });

    return searchResultsTable
      .locator('a[id$="commandLink3"]')
      .filter({
        hasText: new RegExp(`^Reverses Manual ${escapedJournalId}\\b`),
      })
      .locator("xpath=ancestor::tr[1]")
      .filter({ hasText: ledgerName });
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

  /**
   * Verifies that the configured GL-08 source journal is still eligible for
   * reversal. Once this state changes, the test data must name a new journal.
   */
  async verifySourceJournalIsReversible(
    journalBatchName: string,
    ledgerName: string,
  ): Promise<void> {
    const matchingRow = this.journalRowForLedger(
      journalBatchName,
      ledgerName,
    );
    const staleDataMessage =
      `${journalBatchName} in ${ledgerName} must be Posted, Approved, and ` +
      "Reversible. If this journal was already reversed, update " +
      "journal-reversal.json with another eligible source journal.";

    await expect(matchingRow, staleDataMessage).toHaveCount(1, {
      timeout: 30_000,
    });
    await expect(
      matchingRow.getByText("Posted", { exact: true }),
      staleDataMessage,
    ).toBeVisible();
    await expect(
      matchingRow.getByText("Approved", { exact: true }),
      staleDataMessage,
    ).toBeVisible();
    await expect(
      matchingRow.getByText("Reversible", { exact: true }),
      staleDataMessage,
    ).toBeVisible();
  }

  /**
   * Returns the Journal value from the exact batch-and-ledger result row.
   * This is intentionally scoped away from reporting-ledger rows.
   */
  async getJournalNameForLedger(
    journalBatchName: string,
    ledgerName: string,
  ): Promise<string> {
    const matchingRow = this.journalRowForLedger(
      journalBatchName,
      ledgerName,
    );

    await expect(matchingRow).toHaveCount(1, { timeout: 30_000 });

    const journalLink = matchingRow.locator('a[id$="commandLink3"]');

    await expect(journalLink).toHaveCount(1);
    await expect(journalLink).toBeVisible();

    const journalName = (await journalLink.textContent())?.trim();

    if (!journalName) {
      throw new Error(
        `Journal name was empty for ${journalBatchName} in ${ledgerName}`,
      );
    }

    return journalName;
  }

  /**
   * Polls until Oracle exposes the unposted primary-ledger reversal and then
   * validates the business state that distinguishes a generated reversal.
   */
  async waitForUnpostedReversalJournal(parameters: {
    sourceJournalId: string;
    ledger: string;
    reversalPeriod: string;
    processId: string;
  }): Promise<string> {
    await expect
      .poll(
        async () => {
          await this.submitReversalJournalSearch(
            parameters.sourceJournalId,
            parameters.reversalPeriod,
          );

          return this.reversalJournalRow(
            parameters.sourceJournalId,
            parameters.ledger,
          ).count();
        },
        {
          message:
            `Expected an unposted reversal containing Manual ` +
            `${parameters.sourceJournalId} in ${parameters.ledger} after ` +
            `reversal process ${parameters.processId}`,
          timeout: 120_000,
          intervals: [5_000, 10_000],
        },
      )
      .toBe(1);

    const reversalRow = this.reversalJournalRow(
      parameters.sourceJournalId,
      parameters.ledger,
    );
    const escapedJournalId = parameters.sourceJournalId.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&",
    );
    const reversalBatchLink = reversalRow.locator(
      'a[id$="commandLink4"]',
    );

    await expect(reversalRow).toHaveCount(1);
    await expect(reversalBatchLink).toHaveText(
      new RegExp(
        `^Reverses Manual ${escapedJournalId}\\b.*\\s${parameters.processId}$`,
      ),
    );
    await expect(
      reversalRow.getByText("Unposted", { exact: true }),
    ).toBeVisible();
    await expect(
      reversalRow.getByText("Required", { exact: true }),
    ).toBeVisible();
    await expect(
      reversalRow.getByText(parameters.reversalPeriod, { exact: true }),
    ).toBeVisible();
    await expect(
      reversalRow.getByText(
        "Not Reversible - Batch not posted",
        { exact: true },
      ),
    ).toBeVisible();

    const reversalBatchName = (await reversalBatchLink.textContent())?.trim();

    if (!reversalBatchName) {
      throw new Error(
        `Reversal batch name was empty for process ${parameters.processId}`,
      );
    }

    return reversalBatchName;
  }

  /** Selects the exact primary-ledger reversal row for Post Batch. */
  async selectReversalJournalForPosting(
    sourceJournalId: string,
    ledgerName: string,
  ): Promise<void> {
    const reversalRow = this.reversalJournalRow(
      sourceJournalId,
      ledgerName,
    );

    await expect(reversalRow).toHaveCount(1, { timeout: 30_000 });
    await expect(
      reversalRow.getByText("Unposted", { exact: true }),
    ).toBeVisible();

    // Select through the blank leading cell so neither journal hyperlink is
    // activated while preparing the row for the toolbar action.
    const selectionCell = reversalRow.locator("td").first();

    await expect(selectionCell).toBeVisible();
    await selectionCell.click();
    await expect(reversalRow).toHaveClass(/p_AFSelected/);
  }

  /**
   * Finds a journal result whose visible name is either the exact supplied
   * text or begins with it. This supports both user-assigned names and names
   * that Oracle extends during import.
   */
  async findJournalBatchByNameOrPrefix(
    journalNameOrPrefix: string,
  ): Promise<void> {
    await this.submitJournalBatchSearch(journalNameOrPrefix);

    const matchingLink = this.journalBatchResultLinksByNameOrPrefix(
      journalNameOrPrefix,
    );

    await expect(matchingLink.first()).toBeVisible({ timeout: 30_000 });
  }

  /**
   * Verifies the Batch Status in the same result row matched by the supplied
   * exact name or prefix.
   */
  async verifyJournalBatchStatusByNameOrPrefix(
    journalNameOrPrefix: string,
    expectedBatchStatus: string,
  ): Promise<void> {
    const matchingLink = this.journalBatchResultLinksByNameOrPrefix(
      journalNameOrPrefix,
    ).first();

    await expect(matchingLink).toBeVisible({ timeout: 30_000 });

    const matchingRow = matchingLink.locator("xpath=ancestor::tr[1]");
    const batchStatus = matchingRow.getByText(expectedBatchStatus, {
      exact: true,
    });

    await expect(batchStatus).toHaveCount(1);
    await expect(batchStatus).toBeVisible();
  }

  /**
   * Refreshes Manage Journals until the requested ledger row reaches the
   * expected Batch Status. This validates business state without checking the
   * scheduled-process status.
   */
  async waitForJournalStatusByNameOrPrefixAndLedger(
    journalNameOrPrefix: string,
    ledgerName: string,
    expectedBatchStatus: string,
    processId: string,
  ): Promise<void> {
    await expect
      .poll(
        async () => {
          await this.submitJournalBatchSearch(journalNameOrPrefix);

          const matchingRow = this.journalRowForLedgerByNameOrPrefix(
            journalNameOrPrefix,
            ledgerName,
          );

          if ((await matchingRow.count()) !== 1) {
            return false;
          }

          return matchingRow
            .getByText(expectedBatchStatus, { exact: true })
            .isVisible();
        },
        {
          message:
            `Expected ${journalNameOrPrefix} in ${ledgerName} to reach ` +
            `${expectedBatchStatus} after process ${processId}`,
          timeout: 180_000,
          intervals: [5_000, 10_000],
        },
      )
      .toBe(true);
  }

  /**
   * Refreshes Manage Journals until both final values appear in the same
   * batch-name-prefix and ledger result row.
   */
  async waitForJournalFinalStateByNameOrPrefixAndLedger(
    journalNameOrPrefix: string,
    ledgerName: string,
    expectedBatchStatus: string,
    expectedReversibleDetail: string,
    postingProcessId: string,
  ): Promise<void> {
    await expect
      .poll(
        async () => {
          await this.submitJournalBatchSearch(journalNameOrPrefix);

          const matchingRow = this.journalRowForLedgerByNameOrPrefix(
            journalNameOrPrefix,
            ledgerName,
          );

          if ((await matchingRow.count()) !== 1) {
            return false;
          }

          const batchIsPosted = await matchingRow
            .getByText(expectedBatchStatus, { exact: true })
            .isVisible();
          const reversibleDetailMatches = await matchingRow
            .getByText(expectedReversibleDetail, { exact: true })
            .isVisible();

          return batchIsPosted && reversibleDetailMatches;
        },
        {
          message:
            `Expected ${journalNameOrPrefix} in ${ledgerName} to reach ` +
            `${expectedBatchStatus} with ${expectedReversibleDetail} after ` +
            `process ${postingProcessId}`,
          timeout: 180_000,
          intervals: [5_000, 10_000],
        },
      )
      .toBe(true);

    const matchingRow = this.journalRowForLedgerByNameOrPrefix(
      journalNameOrPrefix,
      ledgerName,
    );

    await expect(matchingRow).toHaveCount(1);
    await expect(
      matchingRow.getByText(expectedBatchStatus, { exact: true }),
    ).toBeVisible();
    await expect(
      matchingRow.getByText(expectedReversibleDetail, { exact: true }),
    ).toBeVisible();
  }

  /**
   * Opens the Journal link in the result row matched by name prefix and ledger.
   */
  async openJournalForLedgerByNameOrPrefix(
    journalNameOrPrefix: string,
    ledgerName: string,
  ): Promise<void> {
    const matchingRow = this.journalRowForLedgerByNameOrPrefix(
      journalNameOrPrefix,
      ledgerName,
    );

    await expect(matchingRow).toHaveCount(1, { timeout: 30_000 });
    await expect(
      matchingRow.getByText(ledgerName, { exact: true }),
    ).toBeVisible();

    const journalLink = matchingRow.locator('a[id$="commandLink3"]');

    await expect(journalLink).toHaveCount(1);
    await expect(journalLink).toBeVisible({ timeout: 30_000 });
    await journalLink.click();
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
   * Confirms that the search returned one row for the exact requested batch.
   */
  async verifyExactJournalBatchResult(
    journalBatchName: string,
  ): Promise<void> {
    const matchingRow = this.journalRowsForBatch(journalBatchName);

    await expect(matchingRow).toHaveCount(1, { timeout: 30_000 });

    const exactBatchLink = matchingRow.getByRole("link", {
      name: journalBatchName,
      exact: true,
    });

    await expect(exactBatchLink).toHaveCount(1);
    await expect(exactBatchLink).toBeVisible();
  }

  /**
   * Selects the exact batch row that will be submitted for posting.
   */
  async selectJournalBatch(journalBatchName: string): Promise<void> {
    const matchingRow = this.journalRowsForBatch(journalBatchName);

    await expect(matchingRow).toHaveCount(1, { timeout: 30_000 });

    // Click the blank selection cell so a Journal or Journal Batch hyperlink
    // inside the row cannot be activated accidentally.
    const selectionCell = matchingRow.locator("td").first();

    await expect(selectionCell).toBeVisible();
    await selectionCell.click();
    await expect(matchingRow).toHaveClass(/p_AFSelected/);
  }

  /**
   * Submits the selected batch for approval with posting requested.
   */
  async postSelectedJournalBatch(): Promise<void> {
    const postBatchButton = this.page.getByRole("button", {
      name: "Post Batch",
      exact: true,
    });

    await expect(postBatchButton).toBeVisible({ timeout: 30_000 });
    await expect(postBatchButton).toBeEnabled();
    await postBatchButton.click();

    const confirmationMessage = this.page.getByText(
      "Your journal approval request has been submitted.",
      { exact: true },
    );

    await expect(confirmationMessage).toBeVisible({ timeout: 60_000 });

    const okButton = this.page.locator(
      '[id*="userResponsePopupDialogButtonOk"]',
    );

    await expect(okButton).toBeVisible({ timeout: 30_000 });
    await okButton.click();
    await expect(confirmationMessage).toBeHidden({ timeout: 30_000 });
  }

  /**
   * Opens the Journal hyperlink from the exact batch result row.
   */
  async openJournalForBatch(journalBatchName: string): Promise<void> {
    const matchingRow = this.journalRowsForBatch(journalBatchName);

    await expect(matchingRow).toHaveCount(1, { timeout: 30_000 });

    const journalLink = matchingRow.locator('a[id$="commandLink3"]');

    await expect(journalLink).toBeVisible({ timeout: 30_000 });
    await journalLink.click();
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
    const matchingRow = this.journalRowForLedger(
      journalBatchName,
      ledgerName,
    );

    await expect(matchingRow).toHaveCount(1, { timeout: 30_000 });
    await expect(
      matchingRow.getByText(ledgerName, { exact: true }),
    ).toBeVisible();

    const journalLink = matchingRow.locator('a[id$="commandLink3"]');

    await expect(journalLink).toBeVisible({ timeout: 30_000 });
    await journalLink.click();
  }

  /**
   * Verifies the business state of one exact batch-and-ledger result row.
   */
  async verifyJournalRowState(
    journalBatchName: string,
    ledgerName: string,
    expectedState: {
      batchStatus: string;
      approvalStatus: string;
      reversibleDetail: string;
    },
  ): Promise<void> {
    const matchingRow = this.journalRowForLedger(
      journalBatchName,
      ledgerName,
    );

    await expect(matchingRow).toHaveCount(1, { timeout: 30_000 });
    await expect(
      matchingRow.getByText(expectedState.batchStatus, { exact: true }),
    ).toBeVisible();
    await expect(
      matchingRow.getByText(expectedState.approvalStatus, { exact: true }),
    ).toBeVisible();
    await expect(
      matchingRow.getByText(expectedState.reversibleDetail, { exact: true }),
    ).toBeVisible();
  }

  /**
   * Refreshes the search until Oracle marks the primary journal as already
   * reversed. Any intermediate value remains eligible for another retry.
   */
  async waitForJournalRowToShowReversed(
    journalBatchName: string,
    ledgerName: string,
    processId: string,
  ): Promise<void> {
    const reversedDetail = "Not Reversible - Journal is already reversed";

    await expect
      .poll(
        async () => {
          await this.submitJournalBatchSearch(journalBatchName);

          const matchingRow = this.journalRowForLedger(
            journalBatchName,
            ledgerName,
          );

          if ((await matchingRow.count()) !== 1) {
            return false;
          }

          return matchingRow
            .getByText(reversedDetail, { exact: true })
            .isVisible();
        },
        {
          message:
            `Expected ${journalBatchName} in ${ledgerName} to be reversed by ` +
            `AutoReverse process ${processId}`,
          timeout: 180_000,
          intervals: [5_000, 10_000],
        },
      )
      .toBe(true);

    await this.verifyJournalRowState(journalBatchName, ledgerName, {
      batchStatus: "Posted",
      approvalStatus: "Approved",
      reversibleDetail: reversedDetail,
    });
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
