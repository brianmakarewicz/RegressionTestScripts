import path from "node:path";
import { expect, Locator, Page, test } from '@playwright/test';
import { env } from "../../../config/environment";
import { AuthenticationWorkflow } from '../../../workflows/authentication.workflow';
import { FusionNavigatorPage } from '../../../pages/common/fusion-navigator.page';
import { loadCreatePOInvData } from "../../../utils/test-data/load-create-po-inv-data.ts";

const PREFIX = requiredEnv('PREFIX');

const USER_INPUT_TIMEOUT_MS = 5 * 60 * 1_000;

test('Create PO match invoice', async ({ page }) => {
  test.setTimeout(15 * 60 * 1_000);

    const dataFilePath = path.join(
    "test-data",
    "clients",
    env.clientAlias,
    env.environment,
    "ap",
    "po_match_inv.json",
  );
  const invData = loadCreatePOInvData(dataFilePath);
  const invNumber = `${PREFIX}${invData.invNumber}`;

  const authentication = new AuthenticationWorkflow(page);
  const navigatorPage = new FusionNavigatorPage(page);

  await authentication.login();
  await navigatorPage.goToCreateAPInvoice();

  /*
   * ==========================================================
   * CREATE INVOICE
   * ==========================================================
   */
  //Fill out Header
    await page.getByRole('combobox', { name: 'Identifying PO' }).fill(invData.poNumber);
    await page.getByRole('combobox', { name: 'Identifying PO' }).press('Enter');
    await page.getByRole('textbox', { name: 'Number' }).fill(invNumber);
    await page.getByRole('textbox', { name: 'Amount' }).click();
    if (invData.amount !== undefined) {
        await page.getByRole('textbox', { name: 'Amount' })
            .fill(String(invData.amount));
        }
    await page.getByRole('textbox', { name: 'Description' }).fill(invData.description);
    if (invData.invDate !== undefined) {
        await page.getByRole('textbox', { name: 'Date', exact: true })
            .fill(String(invData.invDate));
        }
    await page.getByRole('combobox', { name: 'Requester' }).fill(invData.requester);
    await page.getByRole('combobox', { name: 'Requester' }).press('Enter');
  
  /*
   * ==========================================================
   * MATCH INVOICE TO PO
   * ==========================================================
   */

//Match Invoice Lines "Go" button
    await page.getByRole('link', { name: 'Go', exact: true }).click({ timeout: 5 * 60 * 1000 });
 
    const okButton = page.getByRole('button', {
    name: 'OK',
    exact: true
    });

  // Wait until the match window is  open
  await expect(okButton).toBeVisible({
    timeout: 30_000
  });
  
  //check and enter quantity for the provided PO Line Num. 
  // lineType condition excludes lines in file with a value since they are not eligible for the po match window
    const resultsTable = page.getByRole('table', {
    name: 'Search Results',
    });

    for (const line of invData.lines) {
        if (!line.lineType) {
            const row = resultsTable
            .locator(':scope > tbody > tr')
            .filter({
                has: page.getByRole('link', {
                name: invData.poNumber,
                exact: true,
                }),
            })
            .filter({
                has: page.getByRole('cell', {
                name: line.poLineNumber,
                exact: true,
                }),
            });

            await expect(row).toHaveCount(1);

            const checkbox = row.getByRole('checkbox');
            const checkboxLabel = row.locator(
            `label[for="${await checkbox.getAttribute('id')}"]`,
            );

            if (!(await checkbox.isChecked())) {
            await checkboxLabel.click();
            }

            await expect(checkbox).toBeChecked()
            await row.getByRole('textbox', { name: 'Quantity' }).fill(line.quantity);

            await page.getByRole('button', { name: 'Apply' }).click();
            await page.getByRole('button', { name: 'OK' }).click();

            //Edit line if tracked as asset - not currently used to be added if needed
          /*  if (line.trackAsAsset = "Y") {
                await page.getByRole('link', { name: 'Asset' }).click();
                await page.locator('[id="_FOpt1:_FOr1:0:_FONSr2:0:MAnt2:1:pm1:r1:0:ap1:at2:_ATp:ta2:0:sb5::Label0"]').click();
                await page.getByRole('textbox', { name: 'Serial Number' }).click();
                await page.getByRole('textbox', { name: 'Serial Number' }).fill('xyz');
                await page.getByRole('textbox', { name: 'Asset Category' }).click();
                await page.getByRole('textbox', { name: 'Asset Category' }).fill('COMPUTER EQUPMENT');
                await page.getByRole('textbox', { name: 'Asset Category' }).press('Enter');
                await page.getByRole('combobox', { name: 'Minor' }).click();
                await page.getByRole('combobox', { name: 'Minor' }).fill('NONE');
                await page.getByRole('combobox', { name: 'Minor' }).press('Enter');
            }*/

        }
    }

    await page.getByRole('button', { name: 'Apply' }).click();
    await page.getByRole('button', { name: 'OK' }).click();

  await expect(okButton).not.toBeVisible({
    timeout: 5 * 60 * 1000
  });

  await page.waitForTimeout(5 * 1000);

  /*
   * ==========================================================
   * SAVE AND CLOSE (validation occurs in subsequent scripts)
   * ==========================================================
   */

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

    await page.waitForTimeout(5 * 1000);
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