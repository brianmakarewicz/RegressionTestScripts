import { expect, Locator, Page, test } from '@playwright/test';
import { AuthenticationWorkflow } from '../../../workflows/authentication.workflow';
import { FusionNavigatorPage } from '../../../pages/common/fusion-navigator.page';

//const PO_NUMBER = requiredEnv('PO_NUMBER');
const INVOICE_NUMBER = requiredEnv('INVOICE_NUMBER');

const USER_INPUT_TIMEOUT_MS = 5 * 60 * 1_000;

test('validate and post invoice', async ({ page }) => {
  test.setTimeout(15 * 60 * 1_000);

  const authentication = new AuthenticationWorkflow(page);
  const navigatorPage = new FusionNavigatorPage(page);

  await authentication.login();
  await navigatorPage.goToAPInvoice(INVOICE_NUMBER);
    
    await page.getByRole('link', { name: 'Actions', exact: true }).click();
    await page.getByText('Validate', { exact: true }).click();
    await expect(page.locator('td').filter({ hasText: /^Validated$/ }).first()).toBeVisible({ timeout: 5 * 60 * 1000 } );
    await page.getByRole('link', { name: 'Actions', exact: true }).click();
    await page.getByText('Post to Ledger').click();
    await page.getByRole('button', { name: 'Save and Close' }).click();


});

  function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Required environment variable ${name} was not provided.`);
  }

  return value;
}
