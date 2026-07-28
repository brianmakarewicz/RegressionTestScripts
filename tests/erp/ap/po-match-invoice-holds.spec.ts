import { expect, Locator, Page, test } from '@playwright/test';
import { AuthenticationWorkflow } from '../../../workflows/authentication.workflow';
import { FusionNavigatorPage } from '../../../pages/common/fusion-navigator.page';

const PO_NUMBER = requiredEnv('PO_NUMBER');
const INVOICE_NUMBER = requiredEnv('INVOICE_NUMBER');

const USER_INPUT_TIMEOUT_MS = 5 * 60 * 1_000;

test('Receive PO and verify invoice system hold is released', async ({ page }) => {
  test.setTimeout(15 * 60 * 1_000);

  const authentication = new AuthenticationWorkflow(page);
  const navigatorPage = new FusionNavigatorPage(page);

  await authentication.login();
  await navigatorPage.goToAPInvoice(INVOICE_NUMBER);


 /*
   * ==========================================================
   * VERIFY HOLD
   * ==========================================================
   */

  await test.step('Open Invoice Summary > System Holds', async () => {
    await openInvoiceSummary(page);
    await openSystemHolds(page);
  });
  
  await page.waitForTimeout(60 * 1000);
  await navigatorPage.goToHomePage();

  /*
   * ==========================================================
   * RECEIVE PO
   * ==========================================================
   */

  await test.step('Navigate to PO', async () => {
    await navigatorPage.goToReceipt(PO_NUMBER);

    await waitForAnyVisible(
      page,
      [
        page.getByText(new RegExp(escapeRegExp(PO_NUMBER))),
        page.getByRole('button', { name: /Receive/i }),
      ],
      `PO ${PO_NUMBER}`,
    );
  });

  //ADD CLICK ON FIRST CHECKBOX
  await page.getByRole('checkbox', { name: 'Purchase Order 3003324 Robert' }).check();
  await page.getByRole('button', { name: 'Receive Now' }).click();
  await page.getByRole('link', { name: 'Needs revalidation' }).click();
  await page.getByRole('cell', { name: 'Holds2' }).click();
  await page.getByRole('img', { name: 'Holds' }).nth(4).click();
  await page.getByRole('cell', { name: 'System Holds' }).click();
  await page.getByRole('cell', { name: 'System Holds' }).click({
    modifiers: ['ControlOrMeta']
  });
  await page.getByRole('cell', { name: 'Holds2' }).click({
    modifiers: ['ControlOrMeta']
  });
  await page.locator('[id="_FOpt1:_FOr1:0:_FONSr2:0:MAnt2:1:pm1:r1:0:ap1:r7:1:r22:0:ta1:4:s1"]').click();
  await page.getByRole('link', { name: '2', exact: true }).click();
  await page.getByRole('combobox', { name: 'Try a requisition, item, or' }).click();
  await page.locator('#smart-search-component-search-bar').click();
  await page.getByRole('combobox', { name: 'Try a requisition, item, or' }).fill('3003328');
  await page.getByRole('combobox', { name: 'Try a requisition, item, or' }).press('Enter');
  await page.getByRole('checkbox', { name: 'Purchase Order 3003328' }).check();
  await page.getByRole('button', { name: 'Receive Now' }).click();
  await test.step('Open Receive', async () => {
    await clickVisible(
      page,
      [
        page.getByRole('button', { name: /^Receive Now$/i }),
        page.getByRole('link', { name: /^Receive Now$/i }),
        page.getByText('Receive Now', { exact: true }),
      ],
      'Receive',
    );

    await waitForAnyVisible(
      page,
      [
        page.getByLabel(/Quantity/i),
        page.getByText(/Receive Items/i),
        page.getByRole('button', { name: /^Submit$/i }),
      ],
      'Receive Items',
    );
  });

  /*
   * User supplies Quantity because the correct quantity depends
   * on the PO being tested.
   */
  await test.step('MANUAL - Enter Quantity and Submit receipt', async () => {
    console.log('');
    console.log('======================================================');
    console.log('MANUAL ACTION REQUIRED Enter the Quantity received.');
    console.log('======================================================');
    console.log('');

    await waitForManualRcptQty(page);
    await page.getByRole('button', { name: 'Submit' }).click();
    await waitForReceiptSubmission(page);
    await navigatorPage.goToHomePage();
  });

  /*
   * ==========================================================
   * RETURN TO INVOICE
   * ==========================================================
   */

  await test.step('Navigate to invoice', async () => {
    await navigatorPage.goToAPInvoice(INVOICE_NUMBER);

    await waitForAnyVisible(
      page,
      [
        page.getByText(new RegExp(escapeRegExp(INVOICE_NUMBER))),
        page.getByLabel(/^Invoice Number/i),
        page.getByRole('button', { name: /Actions/i }),
      ],
      `Invoice ${INVOICE_NUMBER}`,
    );
  });

  /*
   * ==========================================================
   * VALIDATE AGAIN
   * ==========================================================
   */

  await test.step('Validate invoice after PO receipt', async () => {
    await openInvoiceActions(page);

    await page.getByRole('link', { name: 'Actions', exact: true }).click();
    await page.getByText('Validate', { exact: true }).click();
    await expect(page.locator('td').filter({ hasText: /^Validated$/ }).first()).toBeVisible({ timeout: 5 * 60 * 1000 } );
    

    await waitForValidationToComplete(page);
  });

  /*
   * ==========================================================
   * VERIFY HOLD RELEASED
   * ==========================================================
   */

  await test.step('Open Invoice Summary > System Holds', async () => {
    await openInvoiceSummary(page);
    await openSystemHolds(page);
  });

  await test.step('Verify hold is released', async () => {
    await expect
      .poll(
        async () => {
          const matches = page.getByText(/Received Quantity/i);
          const count = await matches.count();

          let visibleCount = 0;

          for (let i = 0; i < count; i++) {
            if (await matches.nth(i).isVisible().catch(() => false)) {
              visibleCount++;
            }
          }

          return visibleCount;
        },
        {
          message:
            'Waiting for hold to be released',
          timeout: 60_000,
          intervals: [1000, 2000, 5000],
        },
      )
      .toBe(0);

    console.log('');
    console.log('PASS: hold has been released.');
    console.log(`Invoice: ${INVOICE_NUMBER}`);
    console.log(`PO:      ${PO_NUMBER}`);
    console.log('');
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
async function waitForManualRcptQty(page: Page): Promise<void> {
  const quantity = await findVisible(
    page,
    [
      page.getByRole('textbox', { name: 'Quantity' }),
    ],
    'Quantity',
  );

  let lastValue = '';
  let stableSince = Date.now();

  await expect
    .poll(
      async () => {
        const currentValue = (await quantity.inputValue()).trim();

        if (currentValue !== lastValue) {
          lastValue = currentValue;
          stableSince = Date.now();
        }

        const stableForMs = Date.now() - stableSince;

        return currentValue.length > 0 && stableForMs >= 10000;
      },
      {
        message: 'Waiting for quantity to be entered',
        timeout: USER_INPUT_TIMEOUT_MS,
        intervals: [500],
      },
    )
    .toBe(true);
}

async function waitForReceiptSubmission(page: Page): Promise<void> {
 await expect
    .poll(
      async () => {
        const confirmationPatterns = [
          /receipt.*created/i,
          /receipt.*submitted/i,
          /items.*received/i,
          /received successfully/i,
          /confirmation/i,
        ];

        for (const pattern of confirmationPatterns) {
          const element = page.getByText(pattern).first();

          if (await element.isVisible().catch(() => false)) {
            return true;
          }
        }

        /*
         * If the receipt page closes after submission,
         * the Submit button should disappear.
         */
        const submitButton = page
          .getByRole('button', { name: /^Submit$/i })
          .first();

        return !(await submitButton.isVisible().catch(() => false));
      },
      {
        message:
          'Waiting for the user to enter Quantity and submit the receipt',
        timeout: USER_INPUT_TIMEOUT_MS,
        intervals: [500, 1000, 2000],
      },
    )
    .toBe(true);

  /*
   * Handle the confirmation OK automatically if it appears.
   */
  const okButton = page
    .getByRole('button', { name: /^OK$/i })
    .first();

  if (await okButton.isVisible().catch(() => false)) {
    await okButton.click();
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
    .getByText(/validated|validation completed|invoice validation/i)
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

async function openInvoiceSummary(page: Page): Promise<void> {
  await clickVisible(
    page,
    [
      page.getByRole('button', { name: /Needs Validation/i }),
      page.getByRole('link', { name: /Needs Validation/i }),
      page.getByText(/Needs Validation/i, { exact: true }),
    ],
    'Invoice Summary',
  );

  await waitForAnyVisible(
    page,
    [
      page.getByText(/System Holds/i),
      page.getByRole('dialog'),
    ],
    'Invoice Summary',
  );
}

async function openSystemHolds(page: Page): Promise<void> {
  await clickVisible(
    page,
    [
      page.getByRole('link', { name: /System Holds/i }),
      page.getByRole('button', { name: /System Holds/i }),
      page.getByText(/System Holds/i, { exact: true }),
    ],
    'System Holds',
  );

  await waitForAnyVisible(
    page,
    [
      page.getByText(/Hold Name/i),
      page.getByText(/Received Quantity/i),
      page.getByText(/No data to display/i),
      page.getByText(/System Holds/i),
    ],
    'System Holds details',
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