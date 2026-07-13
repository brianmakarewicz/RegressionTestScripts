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
  await expect(page.getByRole('heading', { name: 'Invoice Details' })).toBeVisible();
  await page.getByRole('link', { name: 'Actions', exact: true }).click();
  await page.getByText('Validate', { exact: true }).click();
  await expect(page.locator('td').filter({ hasText: /^Validated$/ }).first()).toBeVisible();
  await page.getByRole('link', { name: 'Actions', exact: true }).click();
  await page.getByText('Approval', { exact: true }).click();
  await page.getByText('Initiate').nth(1).click();


  await expect(page.getByText(createdInvoice.invoiceNumber, { exact: false })).toBeVisible({
    timeout: 60_000,
  });
});