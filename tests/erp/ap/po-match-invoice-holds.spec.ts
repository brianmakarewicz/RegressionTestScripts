import { expect, Locator, Page, test } from '@playwright/test';
import { AuthenticationWorkflow } from '../../../workflows/authentication.workflow';
import { FusionNavigatorPage } from '../../../pages/common/fusion-navigator.page';

const PO_NUMBER = requiredEnv('PO_NUMBER');
const INVOICE_NUMBER = requiredEnv('INVOICE_NUMBER');
const ITEM_NUMBER = requiredEnv('ITEM_NUMBER');
const QUANTITY = requiredEnv('QUANTITY');

const USER_INPUT_TIMEOUT_MS = 5 * 60 * 1_000;

test('Receive PO and verify invoice system hold is released', async ({ page }) => {
  test.setTimeout(15 * 60 * 1_000);

  const authentication = new AuthenticationWorkflow(page);
  const navigatorPage = new FusionNavigatorPage(page);

  await authentication.login();
  await navigatorPage.goToAPInvoice(INVOICE_NUMBER);

  /*
   * ==========================================================
   * VALIDATE INVOICE
   * ==========================================================
   */
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

 /*
   * ==========================================================
   * VERIFY HOLD
   * ==========================================================
   */
  await page.getByText('Needs revalidation', { exact: true }).click(); 

  await test.step('Open Invoice Summary > System Holds', async () => {
    await test.step('Confirm System Holds equals 1', async () => {
      const systemHoldsRow = page
        .locator('table[summary="Holds"]')
        .locator('tr')
        .filter({
          has: page.getByText('System Holds', { exact: true }),
        });

      await expect(systemHoldsRow).toHaveCount(1);
      await expect(systemHoldsRow.getByRole('link')).toHaveText('1');
      });
  });
  
  await page.waitForTimeout(5 * 1000);
  await navigatorPage.goToHomePage();

  /*
   * ==========================================================
   * RECEIVE PO
   * ==========================================================
   */
  await navigatorPage.goToReceipt(PO_NUMBER);
  await page.getByRole('checkbox', {
    name: new RegExp(`^Purchase Order ${PO_NUMBER} ${ITEM_NUMBER}`)
    }).check();
  //await page.getByRole('checkbox', { name: 'Purchase Order 3003583 FC-10-F100F-108-02-12 - FortiGate-100F 1 Year FortiGuard' }).check();
 
  await page.getByRole('button', { name: 'Receive with Details' }).click();
  await page.getByRole('spinbutton', { name: 'Receipt Quantity' }).fill(QUANTITY);
  await page.getByRole('spinbutton', { name: 'Receipt Quantity' }).press('Tab');
  await page.getByRole('button', { name: 'Submit' }).click();
  await page.getByText('Creating receipt', { exact: true }).click();
  await page.locator('[id="_oj204_mc"]').getByText(/^Receipt .+ created$/);
  //await page.locator('[id="_oj204_mc"]').getByText('Receipt 40006224 created').click();

  await navigatorPage.goToHomePage();

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
  await page.getByText('Validated', { exact: true }).click(); 

  await test.step('Open Invoice Summary > System Holds', async () => {
    await test.step('Confirm System Holds equals 0', async () => {
      const systemHoldsRow = page
        .locator('table[summary="Holds"]')
        .locator('tr')
        .filter({
          has: page.getByText('System Holds', { exact: true }),
        });

      await expect(systemHoldsRow).toHaveCount(1);
      const systemHoldsValue = systemHoldsRow.locator('td').nth(1);
      await expect(systemHoldsValue).toHaveText('0');
      });



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
    await page.waitForTimeout(3 * 1000);
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
    .getByText(/validated|needs revalidation/i)
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