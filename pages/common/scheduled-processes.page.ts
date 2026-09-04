import { expect, type Locator, type Page } from "@playwright/test";

/**
 * Represents the Oracle Fusion Scheduled Processes Overview page.
 */
export class ScheduledProcessesPage {
  constructor(private page: Page) {}

  private processResultRow(processId: string): Locator {
    const resultRows = this.page.locator(
      'table[summary="List of Processes Meeting Search Criteria"]' +
        " > tbody > tr[_afrrk]",
    );

    // Match the exact Process ID inside the supplied outer Oracle result row.
    return resultRows.filter({
      has: this.page.getByText(processId, { exact: true }),
    });
  }

  async verifyOverviewPage(): Promise<void> {
    await expect(
      this.page.getByRole("heading", {
        name: "Overview",
        exact: true,
        level: 1,
      }),
    ).toBeVisible({ timeout: 60_000 });
  }

  private async ensureSearchExpanded(): Promise<void> {
    const processIdTextbox = this.page.getByRole("textbox", {
      name: "Process ID",
      exact: true,
    });

    if (await processIdTextbox.isVisible()) {
      return;
    }

    const expandSearchButton = this.page.getByRole("button", {
      name: "Expand Search",
      exact: true,
    });

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      await expect(expandSearchButton).toBeVisible({ timeout: 30_000 });
      await expandSearchButton.click();

      try {
        await processIdTextbox.waitFor({ state: "visible", timeout: 10_000 });
        return;
      } catch {
        // Oracle ADF can discard this click while refreshing process results.
      }
    }

    await expect(processIdTextbox).toBeVisible({ timeout: 30_000 });
  }

  private async searchByProcessId(processId: string): Promise<void> {
    await this.ensureSearchExpanded();

    const processIdTextbox = this.page.getByRole("textbox", {
      name: "Process ID",
      exact: true,
    });
    const searchButton = this.page.getByRole("button", {
      name: "Search",
      exact: true,
    });

    await processIdTextbox.fill(processId);
    await expect(processIdTextbox).toHaveValue(processId);
    await expect(searchButton).toBeEnabled();
    await searchButton.click();
  }

  async waitForProcessToSucceed(
    processName: string,
    processId: string,
  ): Promise<void> {
    await this.waitForProcessToReachAcceptedStatus(processName, processId, [
      "Succeeded",
    ]);
  }

  async waitForProcessToReachAcceptedStatus(
    processName: string,
    processId: string,
    acceptedStatuses: readonly string[],
  ): Promise<void> {
    if (acceptedStatuses.length === 0) {
      throw new Error("At least one accepted process status is required");
    }

    await expect
      .poll(
        async () => {
          const resultRow = this.processResultRow(processId);

          if (
            (await resultRow.count()) === 1 &&
            (await resultRow.isVisible())
          ) {
            const hasExpectedName = await resultRow
              .getByText(processName, { exact: true })
              .isVisible();
            const acceptedStatusVisibility = await Promise.all(
              acceptedStatuses.map((status) =>
                resultRow.getByText(status, { exact: true }).isVisible(),
              ),
            );

            if (hasExpectedName && acceptedStatusVisibility.some(Boolean)) {
              return true;
            }
          }

          await this.searchByProcessId(processId);
          return false;
        },
        {
          message:
            `Expected ${processName} process ${processId} to reach one of: ` +
            acceptedStatuses.join(", "),
          timeout: 180_000,
          intervals: [5_000, 10_000],
        },
      )
      .toBe(true);

    const resultRow = this.processResultRow(processId);

    await expect(resultRow).toHaveCount(1);
    await expect(
      resultRow.getByText(processName, { exact: true }),
    ).toBeVisible();
    await expect(
      resultRow.getByText(processId, { exact: true }),
    ).toBeVisible();

    const acceptedStatusVisibility = await Promise.all(
      acceptedStatuses.map((status) =>
        resultRow.getByText(status, { exact: true }).isVisible(),
      ),
    );

    expect(
      acceptedStatusVisibility.some(Boolean),
      `Expected process ${processId} to have an accepted status: ${acceptedStatuses.join(", ")}`,
    ).toBe(true);
  }

  private async openProcessDetails(
    processName: string,
    processId: string,
  ): Promise<void> {
    const resultRow = this.processResultRow(processId);

    await expect(resultRow).toHaveCount(1);
    await resultRow.scrollIntoViewIfNeeded();

    const processNameCell = resultRow.getByRole("cell", {
      name: processName,
      exact: true,
    });

    await expect(processNameCell).toHaveCount(1);
    await expect(processNameCell).toBeVisible();

    const processDetailsTab = this.page.locator(
      'a[id$="sdi_processDetails::disAcr"]',
    );

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      await processNameCell.click();

      try {
        await processDetailsTab.waitFor({ state: "visible", timeout: 15_000 });
        break;
      } catch {
        // Oracle ADF can accept the click without activating the result row.
      }
    }

    await expect(processDetailsTab).toBeVisible({ timeout: 30_000 });
    await expect(processDetailsTab).toHaveText("Process Details");

    await expect(
      this.page.getByRole("heading", {
        name: `${processName}, ${processId}`,
        exact: true,
        level: 1,
      }),
    ).toBeVisible({ timeout: 30_000 });
  }

  async downloadLogAndExtractPostingProcessId(
    autoPostProcessId: string,
  ): Promise<string> {
    await this.openProcessDetails("AutoPost Journals", autoPostProcessId);

    const moreAttachmentsLink = this.page.getByRole("link", {
      name: /^\(\d+ more\.\.\.\)$/,
    });

    await expect(moreAttachmentsLink).toBeVisible({ timeout: 30_000 });
    await moreAttachmentsLink.click();

    const logCategorySelect = this.page.locator(
      'select[title="Enterprise Scheduler Job Log"]',
    );

    await expect(logCategorySelect).toBeVisible({ timeout: 30_000 });

    const logAttachmentRow = logCategorySelect.locator(
      "xpath=ancestor::tr[1]",
    );
    const logFileLink = logAttachmentRow.getByRole("link", {
      name: `${autoPostProcessId}.log`,
      exact: true,
    });

    await expect(logFileLink).toBeVisible({ timeout: 30_000 });

    const downloadPromise = this.page.waitForEvent("download");
    await logFileLink.click();
    const download = await downloadPromise;
    const stream = await download.createReadStream();
    const chunks: Buffer[] = [];

    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }

    const logText = Buffer.concat(chunks).toString("utf8");
    const closeAttachmentsButton = this.page.locator(
      'button[id$="attachment1:dc_cb1"]',
    );

    await expect(closeAttachmentsButton).toBeVisible({ timeout: 30_000 });
    await expect(closeAttachmentsButton).toHaveText("OK");
    await closeAttachmentsButton.click();
    await expect(closeAttachmentsButton).toBeHidden({ timeout: 30_000 });

    const postingProcessId = logText.match(
      /Your posting process (\d+) has been submitted for batches with priority \d+\./,
    )?.[1];

    if (!postingProcessId) {
      throw new Error(
        `AutoPost process ${autoPostProcessId} log did not identify a posting process`,
      );
    }

    return postingProcessId;
  }

  async downloadImportJournalsLogAndExtractChildProcessId(
    parentProcessId: string,
  ): Promise<string> {
    await this.openProcessDetails("Import Journals", parentProcessId);

    const logAndOutputSection = this.page.locator(
      'div[id$="processDetails:phattchid"]',
    );
    const logFileLink = logAndOutputSection.locator(
      'a[id$="lastAttachedFile"]',
    );

    await expect(logAndOutputSection).toBeVisible({ timeout: 30_000 });
    await expect(logFileLink).toHaveCount(1);
    await expect(logFileLink).toBeVisible({ timeout: 30_000 });
    await expect(logFileLink).toHaveText(`ESS_L_${parentProcessId}`);

    const downloadPromise = this.page.waitForEvent("download");
    await logFileLink.click();
    const download = await downloadPromise;
    const stream = await download.createReadStream();
    const chunks: Buffer[] = [];

    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }

    const logText = Buffer.concat(chunks).toString("utf8");
    const childProcessId = logText.match(
      /Import Journals: Child job request_id:\s+(\d+) has been submitted\./,
    )?.[1];

    if (!childProcessId) {
      throw new Error(
        `Import Journals parent ${parentProcessId} log did not identify a child process`,
      );
    }

    return childProcessId;
  }

  private extractSingleCreatedBatchName(reportText: string): string {
    const reportLines = reportText.split(/\r?\n/);
    const headerIndex = reportLines.findIndex(
      (line) => line.includes("Batch Name") && line.includes("Period Name"),
    );

    if (headerIndex === -1) {
      throw new Error(
        "Journal Import Execution Report did not contain the Batches Created header",
      );
    }

    const headerLine = reportLines[headerIndex];
    const batchNameStart = headerLine.indexOf("Batch Name");
    const periodNameStart = headerLine.indexOf("Period Name");
    const batchNames: string[] = [];

    for (const line of reportLines.slice(headerIndex + 1)) {
      if (line.includes("Unbalanced Journal Entries")) {
        break;
      }

      const reportedBatchName = line
        .slice(batchNameStart, periodNameStart)
        .trim();

      if (!reportedBatchName || /^[\s-]+$/.test(reportedBatchName)) {
        continue;
      }

      const configuredBatchName = reportedBatchName
        .replace(/\s+Spreadsheet\b.*$/, "")
        .trim();

      if (configuredBatchName) {
        batchNames.push(configuredBatchName);
      }
    }

    if (batchNames.length !== 1) {
      throw new Error(
        `Expected one created journal batch in the execution report, found ${batchNames.length}`,
      );
    }

    return batchNames[0];
  }

  async downloadImportJournalsReportAndExtractBatchName(
    childProcessId: string,
    parentProcessId: string,
  ): Promise<string> {
    await this.openProcessDetails("Import Journals: Child", childProcessId);

    const processDetailsHeader = this.page.locator(
      'div[id$="processDetails:requestDetailHeader"]',
    );
    const parentIdLabel = processDetailsHeader.getByText("Parent ID", {
      exact: true,
    });
    const parentIdRow = parentIdLabel.locator("xpath=ancestor::tr[1]");

    await expect(parentIdLabel).toBeVisible({ timeout: 30_000 });
    await expect(parentIdRow).toContainText(parentProcessId);

    const logAndOutputSection = this.page.locator(
      'div[id$="processDetails:phattchid"]',
    );
    const moreAttachmentsLink = logAndOutputSection.getByRole("link", {
      name: "(1 more...)",
      exact: true,
    });

    await expect(moreAttachmentsLink).toBeVisible({ timeout: 30_000 });
    await moreAttachmentsLink.click();

    const outputCategorySelect = this.page.locator(
      'select[title="Enterprise Scheduler Job Output"]',
    );

    await expect(outputCategorySelect).toBeVisible({ timeout: 30_000 });

    const outputAttachmentRow = outputCategorySelect.locator(
      "xpath=ancestor::tr[1]",
    );
    const outputFileLink = outputAttachmentRow.locator(
      'a[id$="glPopFileLiveFile"]',
    );

    await expect(outputFileLink).toBeVisible({ timeout: 30_000 });
    await expect(outputFileLink).toHaveText(`${childProcessId}.txt`);

    const downloadPromise = this.page.waitForEvent("download");
    await outputFileLink.click();
    const download = await downloadPromise;
    const stream = await download.createReadStream();
    const chunks: Buffer[] = [];

    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }

    const reportText = Buffer.concat(chunks).toString("utf8");
    const closeAttachmentsButton = this.page.locator(
      'button[id$="attachment1:dc_cb1"]',
    );

    await expect(closeAttachmentsButton).toBeVisible({ timeout: 30_000 });
    await expect(closeAttachmentsButton).toHaveText("OK");
    await closeAttachmentsButton.click();
    await expect(closeAttachmentsButton).toBeHidden({ timeout: 30_000 });

    return this.extractSingleCreatedBatchName(reportText);
  }
}
