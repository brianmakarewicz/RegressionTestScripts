import { requireRunProfile } from "../../../config/run-profile";
import { test, expect } from '@playwright/test';
import { AuthenticationWorkflow } from '../../../workflows/authentication.workflow';
import { FusionNavigatorPage } from "../../../pages/common/fusion-navigator.page";


test('navigate to created invoice in Oracle Fusion', async ({ page }) => {
  test.setTimeout(180_000);
  const invoiceNumber = process.env.INVOICE_NUMBER?.trim();
  if (!invoiceNumber) {
    throw new Error('INVOICE_NUMBER is required. Set $env:INVOICE_NUMBER before running this test.');
  }

  const runProfile = requireRunProfile();
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
