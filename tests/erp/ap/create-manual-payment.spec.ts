import path from "node:path";
import { errors, expect, Locator, Page, test } from "@playwright/test";
import { requireRunProfile } from "../../../config/run-profile";
import { AuthenticationWorkflow } from "../../../workflows/authentication.workflow";
import { FusionNavigatorPage } from "../../../pages/common/fusion-navigator.page";
import { loadCreateManualPaymentData } from "../../../utils/erp/ap/load-create-manual-payment-data";

test("Create Manual Payment", async ({ page }) => {
  const runProfile = requireRunProfile();
  test.setTimeout(15 * 60 * 1_000);

  const dataFilePath = path.join(
    runProfile.testDataPath,
    "ap",
    "manual_payment.json",
  );

  const paymentData = loadCreateManualPaymentData(dataFilePath);

  // Oracle generates this value when the payment is created.
  // It is stored here and reused later when searching Manage Payments.
  let paymentNumber = "";

  const authentication = new AuthenticationWorkflow(
    page,
    runProfile.user("standardUser"),
  );

  const navigatorPage = new FusionNavigatorPage(page);

  await authentication.login();

  /*
   * ==========================================================
   * 3.1 - 3.4
   * NAVIGATE TO CREATE PAYMENT
   * ==========================================================
   */

  await navigatorPage.goToCreatePaymentPage();

  /*
   * ==========================================================
   * 3.5 - 3.12
   * ENTER PAYMENT DETAILS
   * ==========================================================
   */

  await fillCombobox(
    page,
    "Business Unit",
    paymentData.businessUnit,
  );

  await fillCombobox(
    page,
    "Supplier",
    paymentData.supplier,
  );

  await fillSupplierSiteIfAvailable(page, paymentData.supplierSite);

  await page
    .getByRole("textbox", {
      name: "Description",
    })
    .fill(paymentData.description);

  const paymentDateInput = page.getByRole("textbox", {
    name: "Payment Date",
    exact: true,
  });
  await paymentDateInput.fill(paymentData.paymentDate);
  await paymentDateInput.press("Tab");

  await fillCombobox(
    page,
    "Disbursement Bank Account",
    paymentData.disbursementBankAccount,
  );

  await fillCombobox(
    page,
    "Payment Method",
    paymentData.paymentMethod,
  );

  await fillCombobox(
    page,
    "Payment Process Profile",
    paymentData.paymentProcessProfile,
  );

  /*
   * Payment Document is optional in the data structure.
   *
   * The AP-07 document states that Payment Document
   * is required for Check payments.
   */
  if (paymentData.paymentDocument) {
    await fillCombobox(
      page,
      "Payment Document",
      paymentData.paymentDocument,
    );
  }

  /*
   * ==========================================================
   * 3.13 - 3.16
   * SELECT INVOICE(S) TO PAY
   * ==========================================================
   */

  await openSelectAndAddInvoices(page);

  for (const invoice of paymentData.invoices) {

    const invoiceNumber = page.getByRole(
      "textbox",
      {
        name: "Invoice Number",
      },
    );

    await invoiceNumber.fill(
      invoice.invoiceNumber,
    );

    await clickVisible(
      page,
      [
        page.getByRole("button", {
          name: "Search",
          exact: true,
        }),

        page.getByText(
          "Search",
          {
            exact: true,
          },
        ),
      ],
      "invoice Search button",
    );

    const resultsTable = page.getByRole(
      "table",
      {
        name: "Search Results",
      },
    );

    /*
     * Limit the search to the Search Results table
     * and then locate the row containing the exact
     * invoice number.
     */
    const row = resultsTable
      .locator(":scope > tbody > tr")
      .filter({
        has: page.getByRole(
          "cell",
          {
            name: invoice.invoiceNumber,
            exact: true,
          },
        ),
      });

    await expect(row).toHaveCount(1);

    // Select the invoice by clicking its matching search-result row.
    await row.click();

    /*
     * Apply adds the selected invoice while
     * leaving the Select and Add dialog open.
     *
     * This allows multiple invoice numbers
     * to be supplied in the JSON file.
     */
    await page
      .getByRole(
        "button",
        {
          name: "Apply",
          exact: true,
        },
      )
      .click();
  }

  await page
    .getByRole(
      "button",
      {
        name: "OK",
        exact: true,
      },
    )
    .click();

  /*
   * ==========================================================
   * 3.17 - 3.18
   * PROCESS PAYMENT
   * ==========================================================
   */

  await clickVisible(
    page,
    [
      page.getByRole(
        "button",
        {
          name: "Save and Close",
          exact: true,
        },
      ),

      page.getByText(
        "Save and Close",
        {
          exact: true,
        },
      ),
    ],
    "Save and Close",
  );

  /*
   * ==========================================================
   * STORE CREATED PAYMENT NUMBER
   * ==========================================================
   *
   * Oracle generates the payment number.
   *
   * Store it in paymentNumber so the exact
   * same payment can be searched later.
   */

  paymentNumber =
    await capturePaymentNumber(page);

  console.log(
    `Created payment number: ${paymentNumber}`,
  );

  // Dismiss the confirmation only after capturing the payment number.
  await page.locator('[id="_FOd1::msgDlg::cancel"]').click();
  await expect(
    page.locator('[id="_FOd1::msgDlg::_cnt"]'),
  ).toBeHidden({ timeout: 30_000 });

  /*
   * ==========================================================
   * 3.20 - 3.24
   *
   * INTENTIONALLY SKIPPED
   * ==========================================================
   *
   * These are the Schedule Processes /
   * payment-file review steps requested
   * to be excluded.
   *
   * - Verify Payment Processes
   * - Open Format Payment Files Attachment
   * - Open Payment Document
   * - Open payment file
   * - Review Payment Document
   */

  /*
   * ==========================================================
   * 3.25+
   * GO HOME
   * ==========================================================
   */

  await navigatorPage.goToHomePage();

  /*
   * ==========================================================
   * REVIEW MANUAL PAYMENT
   * ==========================================================
   */

  await navigatorPage.goToManagePaymentsPage();

  /*
   * ==========================================================
   * SEARCH USING THE PAYMENT NUMBER CREATED ABOVE
   * ==========================================================
   */

  const paymentNumberInput =
    await findVisible(
      page,
      [
        page.getByRole(
          "textbox",
          {
            name: "Payment Number",
          },
        ),

        page.getByRole(
          "combobox",
          {
            name: "Payment Number",
          },
        ),

        page.getByLabel(
          "Payment Number",
        ),
      ],
      "Payment Number search field",
    );

  await paymentNumberInput.fill(
    paymentNumber,
  );

  await clickVisible(
    page,
    [
      page.getByRole(
        "button",
        {
          name: "Search",
          exact: true,
        },
      ),

      page.getByText(
        "Search",
        {
          exact: true,
        },
      ),
    ],
    "Manage Payments Search button",
  );

  /*
   * ==========================================================
   * OPEN PAYMENT
   * ==========================================================
   */

  const paymentLink =
    page.getByRole(
      "link",
      {
        name: paymentNumber,
        exact: true,
      },
    );

  await expect(
    paymentLink,
  ).toBeVisible({
    timeout: 30_000,
  });

  await paymentLink.click();

  /*
   * ==========================================================
   * REVIEW PAYMENT DETAILS
   * ==========================================================
   */

  await expect(
    page
      .getByText(
        paymentNumber,
        {
          exact: true,
        },
      )
      .first(),
  ).toBeVisible();

  await expect(
    page
      .getByText(
        paymentData.supplier,
        {
          exact: true,
        },
      )
      .first(),
  ).toBeVisible();
await page.waitForTimeout(10_000);
  /*
   * ==========================================================
   * REVIEW PAID INVOICES
   * ==========================================================
   */
  
const invoiceTab =
    await page.getByRole('link', { name: 'Paid Invoices' }
    );

  if (
    await invoiceTab
      .isVisible()
      .catch(() => false)
  ) {
    await invoiceTab.click();
  }

  for (
    const invoice
    of paymentData.invoices
  ) {
    await expect(
     page.getByRole('cell', { name: invoice.invoiceNumber, exact: true }).first(),
    ).toBeVisible();
  }
  await page.waitForTimeout(10_000);
/*
   * ==========================================================
   * DONE
   * ==========================================================
   */

  await clickVisible(
    page,
    [
      page.getByRole(
        "button",
        {
          name: "Done",
          exact: true,
        },
      ),

      page.getByText(
        "Done",
        {
          exact: true,
        },
      ),
    ],
    "Done",
  );
});


/*
 * ============================================================
 * HELPERS
 * ============================================================
 */

/*
 * ============================================================
 * OPEN SELECT AND ADD INVOICES
 * ============================================================
 */

async function openSelectAndAddInvoices(
  page: Page,
): Promise<void> {

  const invoicesSection =
    page.getByText(
      "Invoices to Pay",
      {
        exact: true,
      },
    );

  if (
    await invoicesSection
      .isVisible()
      .catch(() => false)
  ) {
    await invoicesSection
      .scrollIntoViewIfNeeded();
  }

  await clickVisible(
    page,
    [
      page.getByRole(
        "button",
        {
          name: "Select and Add",
          exact: true,
        },
      ),

      page.getByTitle(
        "Select and Add",
      ),

      page.getByText(
        "Select and Add",
        {
          exact: true,
        },
      ),
    ],
    "Select and Add invoice button",
  );
}


/*
 * ============================================================
 * FILL ORACLE COMBOBOX
 * ============================================================
 */

// Fill Supplier Site only when a value is supplied and Oracle displays the field.
async function fillSupplierSiteIfAvailable(
  page: Page,
  supplierSite: string | null,
): Promise<void> {
  if (supplierSite === null) {
    return;
  }

  const field = page
    .getByRole("combobox", { name: "Supplier Site", exact: true })
    .or(page.getByRole("textbox", { name: "Supplier Site", exact: true }))
    .or(page.getByLabel("Supplier Site", { exact: true }))
    .filter({ visible: true })
    .first();

  try {
    await field.waitFor({ state: "visible", timeout: 5_000 });
  } catch (error) {
    if (error instanceof errors.TimeoutError) {
      return;
    }
    throw error;
  }

  await field.fill(supplierSite);
  await field.press("Enter");
}

async function fillCombobox(
  page: Page,
  fieldName: string,
  value: string,
): Promise<void> {

  const field =
    await findVisible(
      page,
      [
        page.getByRole(
          "combobox",
          {
            name: fieldName,
          },
        ),

        page.getByRole(
          "textbox",
          {
            name: fieldName,
          },
        ),

        page.getByLabel(
          fieldName,
        ),
      ],
      fieldName,
    );

  await field.fill(value);

  await field.press("Enter");
}


/*
 * ============================================================
 * CAPTURE PAYMENT NUMBER
 * ============================================================
 */

async function capturePaymentNumber(
  page: Page,
): Promise<string> {
  // Capture only the payment identifier, not the amount in the confirmation.
  const paymentPattern = /^Payment\s+(\d+)\s+for\s+.+\s+has been created\.$/;
  const confirmation = page
    .locator('[id="_FOd1::msgDlg::_cnt"] .x1mu')
    .filter({ hasText: paymentPattern });

  await expect(confirmation).toBeVisible({ timeout: 60_000 });
  const message = (await confirmation.innerText()).replace(/\s+/g, ' ').trim();
  const match = message.match(paymentPattern);
  if (!match) {
    throw new Error(`Unable to extract payment number from confirmation: ${message}`);
  }

  return match[1];
}


/*
 * ============================================================
 * FIND VISIBLE ELEMENT
 * ============================================================
 */

async function findVisible(
  page: Page,
  locators: Locator[],
  description: string,
  timeout = 30_000,
): Promise<Locator> {

  const start =
    Date.now();

  while (
    Date.now() - start
    < timeout
  ) {

    for (
      const locator
      of locators
    ) {

      const candidate =
        locator.first();

      if (
        await candidate
          .isVisible()
          .catch(() => false)
      ) {
        return candidate;
      }
    }

    await page.waitForTimeout(
      250,
    );
  }

  throw new Error(
    `Unable to find visible element: ${description}`,
  );
}


/*
 * ============================================================
 * CLICK VISIBLE ELEMENT
 * ============================================================
 */

async function clickVisible(
  page: Page,
  locators: Locator[],
  description: string,
  timeout = 30_000,
): Promise<void> {

  const element =
    await findVisible(
      page,
      locators,
      description,
      timeout,
    );

  await element.click();
}
