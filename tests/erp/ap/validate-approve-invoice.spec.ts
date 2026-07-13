import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

dotenv.config({
  path: path.resolve(process.cwd(), 'environments', '.env.demo.dev'),
});

type CreatedInvoice = {
  invoiceNumber: string;
  invoiceId?: string;
};

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

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
  const createdInvoice = readCreatedInvoice();

  const clientAlias = process.env.CLIENT_ALIAS || 'demo';
  const environment = process.env.ENVIRONMENT || 'dev';
  const oracleBaseUrl = requiredEnv('ORACLE_BASE_URL');
  const oracleUsername = requiredEnv('ORACLE_USERNAME');
  const oraclePassword = requiredEnv('ORACLE_PASSWORD');

  const bannerMessage = `Using ${clientAlias}/${environment}. Invoice: ${createdInvoice.invoiceNumber}`;

  await page.addInitScript((messageFromEnvAndPython) => {
    window.addEventListener('DOMContentLoaded', () => {
      if (document.getElementById('playwright-signin-message')) return;

      const banner = document.createElement('div');
      banner.id = 'playwright-signin-message';
      banner.textContent = messageFromEnvAndPython;
      banner.style.position = 'fixed';
      banner.style.top = '0';
      banner.style.left = '0';
      banner.style.right = '0';
      banner.style.zIndex = '999999';
      banner.style.padding = '12px 16px';
      banner.style.background = '#fff3cd';
      banner.style.color = '#222';
      banner.style.font = '16px Arial, sans-serif';
      banner.style.borderBottom = '1px solid #d6b656';
      banner.style.textAlign = 'center';

      document.body.appendChild(banner);
    });
  }, bannerMessage);

  await page.goto(oracleBaseUrl);

  await page.getByLabel(/user id|username|email/i).fill(oracleUsername);
  await page.getByLabel(/password/i).fill(oraclePassword);
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('link', { name: 'Navigator' }).click();
  await page.getByTitle('Payables', { exact: true }).click();
  await page.getByRole('link', { name: 'Invoices' }).click();
  await page.getByRole('link', { name: 'Tasks' }).click();
  await page.getByRole('link', { name: /manage invoices/i }).click();
  await page.getByRole('textbox', { name: 'Invoice Number' }).click();
  await page.getByRole('textbox', { name: 'Invoice Number' }).fill(createdInvoice.invoiceNumber);
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await page.getByRole('link', { name: createdInvoice.invoiceNumber }).click();
  // await page.locator('[id="_FOpt1:_FOr1:0:_FONSr2:0:MAnt2:1:pm1:r1:0:ap1:r7:1:me1"] > .x1jp > table > tbody > tr > td:nth-child(3) > .xmo').click();
  // await page.locator('[id="_FOpt1:_FOr1:0:_FONSr2:0:MAnt2:1:pm1:r1:0:ap1:r7:1:me2"] > .x1j5 > .x1ja').click();


  await expect(page.getByText(createdInvoice.invoiceNumber, { exact: false })).toBeVisible({
    timeout: 60_000,
  });
});