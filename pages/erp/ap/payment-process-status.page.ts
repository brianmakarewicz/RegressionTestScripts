import { expect, type Page } from "@playwright/test";

/** Verifies new matching processes in the Submitted By filtered results table. */
export class PaymentProcessStatusPage {
  constructor(private page: Page) {}

  // Filter scheduled processes to the user configured in the run profile.
  async searchBySubmittedBy(username: string): Promise<void> {
    const submittedBy = this.page.locator('input[id$=":srRssdfl:value50::content"]');
    // Allow the search panel to render before checking whether it needs expanding.
    await this.page.waitForTimeout(2_000);
    if (!await submittedBy.isVisible()) {
      await this.page.getByRole("button", { name: "Expand Search", exact: true }).click();
    }
    await expect(submittedBy).toBeVisible({ timeout: 30_000 });
    await submittedBy.fill(username);
    await expect(submittedBy).toHaveValue(username);
    const searchButton = this.page.locator('button[id$=":srRssdfl::search"]');
    await expect(searchButton).toBeEnabled();
    await searchButton.click();
    await expect(this.page.locator('table[summary="List of Processes Meeting Search Criteria"]')).toBeVisible({ timeout: 60_000 });
  }

  private rows() {
    return this.page.locator('table[summary="List of Processes Meeting Search Criteria"] > tbody > tr[_afrrk]');
  }

  private async refresh(): Promise<void> {
    // Click the toolbar button, not its wrapper or icon (both titled Refresh).
    const refreshButton = this.page
      .locator('div[id$=":processRefreshId"]')
      .getByRole("button", { name: "Refresh", exact: true });
    await expect(refreshButton).toBeVisible({ timeout: 30_000 });
    await expect(refreshButton).toBeEnabled();
    await refreshButton.click({ timeout: 30_000 });
  }

  private async results(): Promise<Array<{ name: string; id: string; status: string }>> {
    const table = this.page.locator('table[summary="List of Processes Meeting Search Criteria"]');
    await expect(table).toBeVisible({ timeout: 60_000 });
    // ADF renders column headers separately from the process data table.
    const resultPanel = this.page.locator('div[id$=":panel:result"]');
    const headerTable = resultPanel.locator(
      'table[summary="This table contains column headers corresponding to the data body table below"]',
    ).filter({ has: this.page.locator('th[id$=":procName"]') });
    const headerCells = headerTable.locator('th[_afrleaf="true"]');
    await expect(headerCells.filter({ hasText: /^Name$/ })).toBeVisible({ timeout: 30_000 });
    await expect(headerCells.filter({ hasText: /^Process ID$/ })).toBeVisible({ timeout: 30_000 });
    await expect(headerCells.filter({ hasText: /^Status$/ })).toBeVisible({ timeout: 30_000 });
    const headers = (await headerCells.allTextContents()).map((text) => text.trim());
    const nameIndex = headers.indexOf("Name");
    const idIndex = headers.indexOf("Process ID");
    const statusIndex = headers.indexOf("Status");
    if ([nameIndex, idIndex, statusIndex].some((index) => index < 0)) {
      throw new Error(`Scheduled Processes result columns were not found. Headers: ${headers.join(", ")}`);
    }
    // Read all rendered rows together so an ADF refresh cannot replace rows between cell reads.
    return this.rows().evaluateAll((rows, { nameIndex, idIndex, statusIndex }) => {
      const records: Array<{ name: string; id: string; status: string }> = [];
      for (const row of rows) {
        // Skip the outer selection/wrapper cells and any empty placeholder rows.
        const cells = row.querySelectorAll<HTMLTableCellElement>(':scope > td table[_afrit="1"] > tbody > tr > td');
        const id = cells[idIndex]?.innerText.trim() ?? "";
        if (!/^\d+$/.test(id)) continue;
        const name = cells[nameIndex]?.innerText.trim() ?? "";
        const status = cells[statusIndex]?.innerText.trim() ?? "";
        if (!name || !status) throw new Error(`Scheduled Process ${id} has an incomplete result row.`);
        records.push({ id, name, status });
      }
      return records;
    }, { nameIndex, idIndex, statusIndex });
  }

  async snapshot(): Promise<Set<string>> {
    await this.refresh();
    return new Set((await this.results()).map((record) => record.id));
  }

  async waitForStage(requestName: string, names: string[], before: Set<string>): Promise<string[]> {
    // Optional processes are checked when present, but their absence does not block completion.
    const optionalNames = ["Build Payments", "Payables Selected Installments Report"];
    const requiredNames = names.filter((name) => !optionalNames.includes(name));
    const completed = new Map<string, Set<string>>();
    // Allow submitted processes 10 seconds to appear before the first refresh and check.
    await this.page.waitForTimeout(10_000);
    const started = Date.now();
    while (Date.now() - started < 300_000) {
      await this.refresh();
      const records = await this.results();
      let activeMatchingProcess = false;
      for (const record of records) {
        if (before.has(record.id) || !names.includes(record.name)) continue;
        if (/Error|Failed|Canceled|Cancelled|Warning/i.test(record.status)) {
          throw new Error(`${requestName}: ${record.name} (${record.id}) ended with ${record.status}`);
        }
        if (record.status !== "Succeeded") activeMatchingProcess = true;
        if (record.status === "Succeeded") {
          const ids = completed.get(record.name) ?? new Set<string>();
          ids.add(record.id);
          completed.set(record.name, ids);
        }
      }
      if (!activeMatchingProcess && requiredNames.every((name) => completed.has(name))) {
        return [...completed.values()].flatMap((ids) => [...ids]);
      }
      // Polling interval only; success is determined by the Status column on each matching row.
      await this.page.waitForTimeout(5_000);
    }
    throw new Error(`Timed out waiting for this PPR's processes: ${requiredNames.filter((name) => !completed.has(name)).join(", ")}. Check the Submitted By filter and result pagination for ${requestName}.`);
  }
}
