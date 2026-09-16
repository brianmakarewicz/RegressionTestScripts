import fs from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";
import { requireRunProfile } from "../../../config/run-profile";
import { test, expect } from '@playwright/test';
import { AuthenticationWorkflow } from '../../../workflows/authentication.workflow';
import { FusionNavigatorPage } from "../../../pages/common/fusion-navigator.page";


test('navigate to created invoice in Oracle Fusion', async ({ page }) => {
  test.setTimeout(180_000);
  const prefix = process.env.PREFIX?.trim();
  if (!prefix) {
    throw new Error('PREFIX is required. Set $env:PREFIX before running this test.');
  }

  const runProfile = requireRunProfile();
  // Match create-invoice.py: exactly one ap_inv*.csv, using its first data row.
  const csvFolder = path.resolve(runProfile.testDataPath, "ap");
  const csvFiles = fs.readdirSync(csvFolder, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /^ap_inv.*\.csv$/i.test(entry.name))
    .map((entry) => entry.name)
    .sort();
  if (csvFiles.length !== 1) {
    throw new Error(`Expected exactly one ap_inv*.csv in ${csvFolder}; found ${csvFiles.length}: ${csvFiles.join(", ")}`);
  }
  const csvPath = path.join(csvFolder, csvFiles[0]);
  const rows = parse(fs.readFileSync(csvPath, "utf8"), {
    columns: true,
    bom: true,
    skip_empty_lines: true,
  }) as Array<Record<string, string>>;
  const baseInvoiceNumber = rows[0]?.NUMBER;
  if (!baseInvoiceNumber?.trim()) {
    throw new Error(`The first invoice row must have a NUMBER value: ${csvPath}`);
  }
  // Match invoice creation, with no suffix when SUFFIX is unset or empty.
  const suffix = process.env.SUFFIX ?? "";
  const invoiceNumber = `${prefix}${baseInvoiceNumber}${suffix}`;

  const authentication = new AuthenticationWorkflow(
    page,
    runProfile.user("standardUser"),
  );
  const navigatorPage = new FusionNavigatorPage(page);

  await authentication.login();
  await navigatorPage.goToAPInvoice(invoiceNumber);

  await page.getByRole('link', { name: 'Actions', exact: true }).click();
  await page.getByText('Validate', { exact: true }).click();
  await expect(page.locator('td').filter({ hasText: /^Validated$/ }).first()).toBeVisible();
  await page.getByRole('link', { name: 'Actions', exact: true }).click();
  await page.getByText('Approval', { exact: true }).click();
  // Target the visible approval menu cell rather than a positional text match.
  const initiateApproval = page.locator('td.xo2')
    .filter({ hasText: /^Force Approve$/ })
    .filter({ visible: true });
  await initiateApproval.click({ timeout: 30_000 });

});
