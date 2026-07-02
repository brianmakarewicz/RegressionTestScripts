import { test, expect, type Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';

type InvoiceData = {
  IDENTIFYING_PO: string;
  BUSINESS_UNIT: string;
  SUPPLIER: string;
  SUPPLIER_SITE: string;
  LEGAL_ENTITY: string;
  INVOICE_GROUPS: string;
  NUMBER: string;
  AMOUNT: string;
  TYPE: string;
  DESCRIPTION: string;
  DATE: string;
  PAYMENT_TERMS: string;
  TERMS_DATE: string;
  REQUESTER: string;
  DISTRIBUTION_SET: string;
  DISTRIBUTION_COMBINATION: string;
};

function readInvoiceData(): InvoiceData[] {
  const filePath = path.resolve(process.cwd(), 'test-data', 'invoices.csv');

  const fileContent = fs.readFileSync(filePath, 'utf-8');

  return parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as InvoiceData[];
}

function hasCsvValue(value: string | undefined | null): value is string {
  return value !== undefined && value !== null && value.trim() !== '';
}


test('ap03', async ({ page }) => {
  const invoices = readInvoiceData();
  const invoice = invoices[0];

  //nav to create invoices
  await page.goto('https://fa-esew-dev28-saasfademo1.ds-fa.oraclepdemos.com/fscmUI/faces/FuseWelcome?_adf.ctrl-state=1dlfzp15bt_138&fnd=%3B%3B%3B%3Bfalse%3B256%3B%3B%3B&_afrLoop=4388339311072028');
  await page.getByRole('textbox', { name: 'Username' }).click();
  await page.getByRole('textbox', { name: 'Username' }).fill('fin_impl');
  await page.getByRole('textbox', { name: 'Password' }).click();
  await page.getByRole('textbox', { name: 'Password' }).fill('h#8?2xzS');
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('link', { name: 'Navigator' }).click();
  await page.getByTitle('Payables', { exact: true }).click();
  await page.getByRole('link', { name: 'Invoices' }).click();
  await page.getByRole('link', { name: 'Tasks' }).click();
  await page.getByRole('link', { name: 'Create Invoice', exact: true }).click();


//header
  if (hasCsvValue(invoice.IDENTIFYING_PO)) {
  await page.getByRole('combobox', { name: 'Identifying PO' }).click();
  await page.getByRole('textbox', { name: 'Identifying PO' }).fill(invoice.IDENTIFYING_PO);
  await page.keyboard.press('Enter');
  }
  if (hasCsvValue(invoice.BUSINESS_UNIT)) {
  await page.getByRole('combobox', { name: 'Business Unit' }).click();
  await page.getByRole('textbox', { name: 'Business Unit' }).fill(invoice.BUSINESS_UNIT);
  await page.keyboard.press('Enter');
  }
  
  await page.getByRole('combobox', { name: 'Supplier', exact: true }).click();
  await page.getByRole('textbox', { name: 'Supplier' }).fill(invoice.SUPPLIER);
  await page.keyboard.press('Enter');
  
  if (hasCsvValue(invoice.SUPPLIER_SITE)) {
  await page.getByRole('combobox', { name: 'Supplier Site' }).click();
  await page.getByRole('textbox', { name: 'Supplier Site' }).fill(invoice.SUPPLIER_SITE);
  await page.keyboard.press('Enter');
  }
  if (hasCsvValue(invoice.LEGAL_ENTITY)) {
  await page.getByRole('combobox', { name: 'Legal Entity' }).click();
  await page.getByRole('textbox', { name: 'Legal Entity' }).fill(invoice.LEGAL_ENTITY);
  await page.keyboard.press('Enter');
  }
  if (hasCsvValue(invoice.INVOICE_GROUPS)) {
  await page.getByRole('textbox', { name: 'Invoice Group' }).click();
  await page.getByRole('textbox', { name: 'Invoice Group' }).fill(invoice.INVOICE_GROUPS);
  }
  
  await page.getByRole('textbox', { name: 'Number' }).click();
  await page.getByRole('textbox', { name: 'Number' }).fill(invoice.NUMBER);

  await page.getByRole('textbox', { name: 'Amount' }).click();
  await page.getByRole('textbox', { name: 'Amount' }).fill(invoice.AMOUNT);
  
  if (hasCsvValue(invoice.TYPE)) {
  await page.getByRole('combobox', { name: 'Type' }).click();
  await page.getByRole('textbox', { name: 'Type' }).fill(invoice.TYPE);
  await page.keyboard.press('Enter');
  }
  
  if (hasCsvValue(invoice.DESCRIPTION)) {
  await page.getByRole('textbox', { name: 'Description' }).click();
  await page.getByRole('textbox', { name: 'Description' }).fill(invoice.DESCRIPTION);
  }
  if (hasCsvValue(invoice.DATE)) {
  await page.getByRole('textbox', { name: 'Date', exact: true }).click();
  await page.getByRole('textbox', { name: 'Date', exact: true }).fill(invoice.DATE);
  }
  if (hasCsvValue(invoice.PAYMENT_TERMS)) {
  await page.getByRole('combobox', { name: 'Payment Terms' }).click();
  await page.getByRole('textbox', { name: 'Payment Terms' }).fill(invoice.PAYMENT_TERMS);
  await page.keyboard.press('Enter');
  }
  if (hasCsvValue(invoice.TERMS_DATE)) {
  await page.getByRole('textbox', { name: 'Terms Date' }).click();
  await page.getByRole('textbox', { name: 'Terms Date' }).fill(invoice.TERMS_DATE);
  }
  if (hasCsvValue(invoice.REQUESTER)) {
  await page.getByRole('combobox', { name: 'Requester' }).click();
  await page.getByRole('textbox', { name: 'Requester' }).fill(invoice.REQUESTER);
  await page.keyboard.press('Enter');
  }

});