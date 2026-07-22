import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import { AuthenticationWorkflow } from '../../../workflows/authentication.workflow';
import { FusionNavigatorPage } from "../../../pages/common/fusion-navigator.page";


type CreatedInvoice = {
  invoiceNumber: string;
  invoiceId?: string;
};


function readCreatedInvoice(): CreatedInvoice {
  const filePath = process.env.INVOICE_OUTPUT_FILE;

  if (!filePath) {
    throw new Error('Missing INVOICE_OUTPUT_FILE. The Python script must pass the output file path when it calls Playwright.');
  }

  if (!fs.existsSync(filePath)) {
    throw new Error(`Invoice output file not found: ${filePath}`);
  }

  console.log(`Reading invoice output file: ${filePath}`);

  return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as CreatedInvoice;
}

test('navigate to created invoice in Oracle Fusion', async ({ page }) => {
  const authentication = new AuthenticationWorkflow(page);
  const createdInvoice = readCreatedInvoice();
  const navigatorPage = new FusionNavigatorPage(page);

  await authentication.login();
  await navigatorPage.goToAPInvoice(createdInvoice.invoiceNumber);

  await page.getByRole('link', { name: 'Actions', exact: true }).click();
  await page.getByText('Validate', { exact: true }).click();
  await expect(page.locator('td').filter({ hasText: /^Validated$/ }).first()).toBeVisible();
  await page.getByRole('link', { name: 'Actions', exact: true }).click();
  await page.getByText('Approval', { exact: true }).click();
  await page.getByText('Initiate').nth(1).click();

});
