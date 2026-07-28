import { expect, Locator, Page, test } from '@playwright/test';
import { AuthenticationWorkflow } from '../../../workflows/authentication.workflow';
import { FusionNavigatorPage } from "../../../pages/common/fusion-navigator.page";

//AP-04
const PREPAYMENT_INVOICE_NUMBER = requiredEnv('PREPAYMENT_INVOICE_NUMBER');
const TARGET_INVOICE_NUMBER = requiredEnv('TARGET_INVOICE_NUMBER');
const USER_PAYMENT_TIMEOUT_MS = 5 * 60 * 1_000;

test('create and apply a prepayment', async ({ page }) => {
  test.setTimeout(15 * 60 * 1_000);
  const authentication = new AuthenticationWorkflow(page);
  const navigatorPage = new FusionNavigatorPage(page);

  await authentication.login();
  await navigatorPage.goToAPInvoice(PREPAYMENT_INVOICE_NUMBER);

  await page.getByRole('link', { name: 'Actions', exact: true }).click();
  await page.getByText('Validate', { exact: true }).click();
  //await expect(page.locator('td').filter({ hasText: /^Validated$/ }).first()).toBeVisible();
  await page.getByRole('link', { name: 'Actions', exact: true }).click();
  await page.getByText('Approval', { exact: true }).click();
  await page.getByText('Initiate').nth(1).click();

  // Section 4.7: open the payment-parameter window.
  await page.getByRole('link', { name: 'Actions', exact: true }).click();
  await page.getByText('Pay in Full', { exact: true }).click();
  await expect(page.getByText(new RegExp(`Pay in Full:.*${escapeRegex(PREPAYMENT_INVOICE_NUMBER)}`, 'i'))).toBeVisible({timeout: 30_000 });

  // Section 4.8: the user fills in the payment parameters and clicks Submit.
  // This is a five-minute maximum wait, not a fixed delay: the script resumes as
  // soon as Oracle displays the Confirmation message.
  const confirmation = page.getByText('Confirmation', { exact: true });
  console.log('Complete the Pay in Full window and click Submit. Waiting up to five minutes for Confirmation...');
  await expect(confirmation).toBeVisible({ timeout: USER_PAYMENT_TIMEOUT_MS });

  // Sections 4.9-4.11: acknowledge, save, verify Available, then close.
  const confirmationDialog = page.getByRole('dialog').filter({ has: confirmation });
  await clickFirstVisible([
    confirmationDialog.getByRole('button', { name: /^ok$/i }),
    confirmationDialog.getByText('OK', { exact: true }),
    page.getByRole('button', { name: /^ok$/i }),
  ]);
  await clickFirstVisible([
    page.getByRole('button', { name: /^save$/i }),
    page.getByText('Save', { exact: true }),
  ]);
  await expect(page.getByText('Available', { exact: true })).toBeVisible({ timeout: 60_000 });
  await clickFirstVisible([
    page.getByRole('button', { name: /save and close/i }),
    page.getByText('Save and Close', { exact: true }),
  ]);

  // Section 5: open the AP invoice that will receive the prepayment.
  await page.getByText('Home', { exact: true }).click();
  await navigatorPage.goToAPInvoice(TARGET_INVOICE_NUMBER);

  await clickFirstVisible([
    page.getByRole('button', { name: /^actions$/i }),
    page.getByText('Actions', { exact: true }),
  ]);
  await page.getByText('Edit', { exact: true }).click();

  await clickFirstVisible([
    page.getByRole('button', { name: /invoice actions/i }),
    page.getByText('Invoice Actions', { exact: true }),
  ]);
  await page.getByText(/apply or unapply prepayments/i).click();

  const applyDialog = page.getByRole('dialog').filter({
    hasText: /apply or unapply prepayments/i,
  });
  await expect(applyDialog).toBeVisible();

  // Select the row containing the requested prepayment, then apply it.
  const prepaymentRow = applyDialog.getByRole('row').filter({
    hasText: PREPAYMENT_INVOICE_NUMBER,
  });
  await expect(prepaymentRow).toBeVisible();
  await prepaymentRow.click();
  await clickFirstVisible([
    applyDialog.getByRole('button', { name: /^apply$/i }),
    applyDialog.getByText('Apply', { exact: true }),
  ]);

  // Verify that the prepayment moved to the Applied section.
//   const appliedSection = applyDialog.getByText('Applied', { exact: true });
//   await expect(appliedSection).toBeVisible();
//   await expect(applyDialog.getByRole('row').filter({ hasText: PREPAYMENT_INVOICE_NUMBER })).toBeVisible();
   await clickFirstVisible([
     applyDialog.getByRole('button', { name: /^done$/i }),
     applyDialog.getByText('Done', { exact: true }),
   ]);

  // Applying a prepayment changes the invoice to Needs revalidation.
  //await expect(page.getByText(/needs revalidation/i)).toBeVisible({ timeout: 60_000 });
  await clickFirstVisible([
    page.getByRole('button', { name: /invoice actions/i }),
    page.getByText('Invoice Actions', { exact: true }),
  ]);
  await page.getByText('Validate', { exact: true }).click();
  //await expect(page.getByText('Validated', { exact: true })).toBeVisible({ timeout: 60_000 });
  await clickFirstVisible([
    page.getByRole('button', { name: /save and close/i }),
    page.getByText('Save and Close', { exact: true }),
  ]);
});


async function clickFirstVisible(locators: Locator[]): Promise<void> {
  for (const locator of locators) {
    const candidate = locator.first();
    if (await candidate.isVisible().catch(() => false)) {
      await candidate.click();
      return;
    }
  }
  throw new Error('None of the expected Oracle Fusion controls is visible.');
}

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
