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
            const hasSucceededStatus = await resultRow
              .getByText("Succeeded", { exact: true })
              .isVisible();

            if (hasExpectedName && hasSucceededStatus) {
              return true;
            }
          }

          await this.searchByProcessId(processId);
          return false;
        },
        {
          message: `Expected ${processName} process ${processId} to succeed`,
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
    await expect(
      resultRow.getByText("Succeeded", { exact: true }),
    ).toBeVisible();
  }

  async downloadLogAndExtractPostingProcessId(
    autoPostProcessId: string,
  ): Promise<string> {
    const resultRow = this.processResultRow(autoPostProcessId);

    await expect(resultRow).toHaveCount(1);
    await resultRow.scrollIntoViewIfNeeded();

    const processNameCell = this.page.getByRole("cell", {
      name: "AutoPost Journals",
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
        name: `AutoPost Journals, ${autoPostProcessId}`,
        exact: true,
        level: 1,
      }),
    ).toBeVisible({ timeout: 30_000 });

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
}
