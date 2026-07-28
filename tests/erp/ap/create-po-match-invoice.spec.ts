import { expect, Locator, Page, test } from '@playwright/test';
import { AuthenticationWorkflow } from '../../../workflows/authentication.workflow';
import { FusionNavigatorPage } from '../../../pages/common/fusion-navigator.page';

const PO_NUMBER = requiredEnv('PO_NUMBER');
const INVOICE_NUMBER = requiredEnv('INVOICE_NUMBER');

const USER_INPUT_TIMEOUT_MS = 5 * 60 * 1_000;

test('Create PO match invoice', async ({ page }) => {
  test.setTimeout(15 * 60 * 1_000);

  const authentication = new AuthenticationWorkflow(page);
  const navigatorPage = new FusionNavigatorPage(page);

  await authentication.login();
  await navigatorPage.goToCreateAPInvoice();

  /*
   * ==========================================================
   * CREATE INVOICE
   * ==========================================================
   */

  await test.step('Enter PO Number and Invoice Number', async () => {
    await page.getByRole('combobox', { name: 'Identifying PO' }).click();
    await page.getByRole('combobox', { name: 'Identifying PO' }).fill(PO_NUMBER);
    await page.getByRole('combobox', { name: 'Identifying PO' }).press('Enter');
    
    await page.getByRole('textbox', { name: 'Number' }).click();
    await page.getByRole('textbox', { name: 'Number' }).fill(INVOICE_NUMBER);
  });

  //Clicks to fill out header
   /*  await page.getByRole('textbox', { name: 'Amount' }).click();
    await page.getByRole('textbox', { name: 'Amount' }).fill('500');
    await page.getByRole('textbox', { name: 'Description' }).click();
    await page.getByTitle('Select Date').first().click();
    await page.getByRole('gridcell', { name: '1', exact: true }).click();
    await page.getByTitle('Select Date').nth(1).click();
    await page.getByRole('button', { name: 'Next Month' }).click();
    await page.getByRole('gridcell', { name: '1' }).first().click();
    await page.getByRole('textbox', { name: 'Description' }).click();
    await page.getByRole('textbox', { name: 'Description' }).fill('test po match'); */

  await test.step('MANUAL - Enter Invoice Header', async () => {
    console.log('');
    console.log('======================================================');
    console.log('MANUAL ACTION REQUIRED: Enter Invoice Header Details');
    console.log('The script will continue once Requestor contains a value.');
    console.log('======================================================');
    console.log('');

    await waitForManualInvoiceHeader(page);
  });

  /*
   * ==========================================================
   * MATCH INVOICE TO PO
   * ==========================================================
   */

//Restart at Match Invoice Lines "Go" button
    await page.getByRole('link', { name: 'Go', exact: true }).click({ timeout: 5 * 60 * 1000 });
 
    const okButton = page.getByRole('button', {
    name: 'OK',
    exact: true
    });
    
    await test.step('MANUAL - Select PO row & enter quantity & unit price', async () => {
    console.log('');
    console.log('======================================================');
    console.log('MANUAL ACTION REQUIRED: Enter Match detail');
    console.log('The script will continue once match window is closed.');
    console.log('======================================================');
    console.log('');
  });

//  await page.locator('[id="_FOpt1:_FOr1:0:_FONSr2:0:MAnt2:1:pm1:r1:0:ap1:r11:1:at1:_ATp:ta1:0:sb1::Label0"]').click();
//  await page.getByRole('textbox', { name: 'Unit Price' }).click();
//  await page.getByRole('textbox', { name: 'Unit Price' }).fill('500');
//  await page.getByRole('button', { name: 'Apply' }).click();
//  await page.getByRole('button', { name: 'OK' }).click();


  // Wait until the match window is  open
  await expect(okButton).toBeVisible({
    timeout: 30_000
  });

  // Pause automation here until user clicks OK,
  // or fail after 5 minutes.
  await expect(okButton).not.toBeVisible({
    timeout: 5 * 60 * 1000
  });

  /*
   * ==========================================================
   * SAVE AND VALIDATE
   * ==========================================================
   */

  await test.step('Save invoice', async () => {
    await clickVisible(
      page,
      [
        page.getByRole('button', { name: /^Save$/i }),
        page.getByText('Save', { exact: true }),
      ],
      'Save',
    );

    await waitForSaveToComplete(page);
  });

  await test.step('Validate invoice', async () => {
    await openInvoiceActions(page);

    await clickVisible(
      page,
      [
        page.getByRole('menuitem', { name: /^Validate$/i }),
        page.getByText('Validate', { exact: true }),
      ],
      'Validate',
    );

    await waitForValidationToComplete(page);
  });

 

  await test.step('Save and Close', async () => {
    await closeDialogIfPresent(page);

    await clickVisible(
      page,
      [
        page.getByRole('button', { name: /Save and Close/i }),
        page.getByText(/Save and Close/i, { exact: true }),
      ],
      'Save and Close',
    );
  });
});


/* ============================================================
 * HELPERS
 * ============================================================
 */

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Required environment variable ${name} was not provided.`);
  }

  return value;
}

async function findVisible(
  page: Page,
  locators: Locator[],
  description: string,
  timeout = 30_000,
): Promise<Locator> {
  const start = Date.now();

  while (Date.now() - start < timeout) {
    for (const locator of locators) {
      const candidate = locator.first();

      if (await candidate.isVisible().catch(() => false)) {
        return candidate;
      }
    }

    await page.waitForTimeout(250);
  }

  throw new Error(`Unable to find visible element: ${description}`);
}

async function clickVisible(
  page: Page,
  locators: Locator[],
  description: string,
  timeout = 30_000,
): Promise<void> {
  const element = await findVisible(
    page,
    locators,
    description,
    timeout,
  );

  await element.click();
}

async function waitForAnyVisible(
  page: Page,
  locators: Locator[],
  description: string,
  timeout = 30_000,
): Promise<void> {
  await findVisible(page, locators, description, timeout);
}

async function waitForManualInvoiceHeader(page: Page): Promise<void> {
  const requester = await findVisible(
    page,
    [
      page.getByRole('combobox', { name: 'Requester' }),
    ],
    'Requester',
  );

  let lastValue = '';
  let stableSince = Date.now();

  await expect
    .poll(
      async () => {
        const currentValue = (await requester.inputValue()).trim();

        if (currentValue !== lastValue) {
          lastValue = currentValue;
          stableSince = Date.now();
        }

        const stableForMs = Date.now() - stableSince;

        return currentValue.length > 0 && stableForMs >= 10000;
      },
      {
        message: 'Waiting for requester to be entered',
        timeout: USER_INPUT_TIMEOUT_MS,
        intervals: [500],
      },
    )
    .toBe(true);
}

async function waitForSaveToComplete(page: Page): Promise<void> {
  const confirmation = page
    .getByText(/Not validated/i)
    .first();

  const saved = await confirmation
    .waitFor({
      state: 'visible',
      timeout: 10_000,
    })
    .then(() => true)
    .catch(() => false);

  if (saved) {
    return;
  }

  const saveButton = page
    .getByRole('button', { name: /^Save$/i })
    .first();

  if (await saveButton.isVisible().catch(() => false)) {
    await expect(saveButton).toBeEnabled({
      timeout: 30_000,
    });
  }
}

async function openInvoiceActions(page: Page): Promise<void> {
  await clickVisible(
    page,
    [
      page.getByRole('button', { name: /Invoice Actions/i }),
      page.getByRole('button', { name: /^Actions$/i }),
      page.getByText(/Invoice Actions/i, { exact: true }),
      page.getByText('Actions', { exact: true }),
    ],
    'Invoice Actions',
  );
}

async function waitForValidationToComplete(page: Page): Promise<void> {
  const successMessage = page
    .getByText(/Validated/i)
    .first();

  const successFound = await successMessage
    .waitFor({
      state: 'visible',
      timeout: 30_000,
    })
    .then(() => true)
    .catch(() => false);

  if (successFound) {
    return;
  }

  await waitForAnyVisible(
    page,
    [
      page.getByRole('button', { name: /Invoice Actions/i }),
      page.getByRole('button', { name: /^Actions$/i }),
      page.getByText(/Invoice Summary/i),
    ],
    'invoice after validation',
    60_000,
  );
}

async function closeDialogIfPresent(page: Page): Promise<void> {
  const dialog = page.getByRole('dialog').last();

  if (!(await dialog.isVisible().catch(() => false))) {
    return;
  }

  const buttons = [
    dialog.getByRole('button', { name: /^OK$/i }),
    dialog.getByRole('button', { name: /^Done$/i }),
    dialog.getByRole('button', { name: /^Close$/i }),
    dialog.getByRole('button', { name: /Cancel/i }),
  ];

  for (const button of buttons) {
    if (await button.first().isVisible().catch(() => false)) {
      await button.first().click();
      return;
    }
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}