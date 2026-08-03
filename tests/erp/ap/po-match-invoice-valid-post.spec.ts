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
    
/*VALIDATE*/
   // await page.getByRole('link', { name: 'Actions', exact: true }).click();
   // await page.getByText('Validate', { exact: true }).click();
    await expect(page.locator('td').filter({ hasText: /^Validated$/ }).first()).toBeVisible({ timeout: 5 * 60 * 1000 } );
    await page.getByRole('button', { name: 'Save', exact: true }).click();

/*FORCE APPROVAL*/
    await page.getByRole('link', { name: 'Actions', exact: true }).click();
    await page.locator('[id="__af_Z_window"]').getByText('Approval', { exact: true }).click();
    await page.getByText('Force Approve').click();
    await page.waitForTimeout(10 * 1000);
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await page.waitForTimeout(3 * 1000);

/*CONFIRM APPROVAL*/
    await page.getByText('Validated', { exact: true }).click(); 

        await test.step('Confirm Approval status equals Manually approved', async () => {
        const approvalRow = page
            .locator('table[summary="Status"] tr')
            .filter({
            has: page.getByText('Approval', { exact: true }),
            });

        await expect(approvalRow).toHaveCount(1);
        const approvalValue = approvalRow.locator('td').nth(1);
        await expect(approvalValue).toContainText('Manually approved');
      await page.waitForTimeout(3 * 1000);
      });
    
/*Post to ledger*/
    await page.getByRole('link', { name: 'Actions', exact: true }).click();
    await page.getByText('Post to Ledger').click();
    await page.waitForTimeout(5 * 1000);
    await page.getByRole('button', { name: 'OK' }).click();
    await page.getByRole('button', { name: 'Save and Close' }).click();
    await page.waitForTimeout(3 * 1000);


});

  function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Required environment variable ${name} was not provided.`);
  }

  return value;
}
