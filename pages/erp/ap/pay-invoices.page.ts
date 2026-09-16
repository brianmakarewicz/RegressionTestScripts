import { expect, type Locator, type Page } from "@playwright/test";
import type { PayInvoicesData } from "../../../types/erp/ap/pay-invoices-data";

/** Payment process request submission, review, and check confirmation screens. */
export class PayInvoicesPage {
  constructor(private page: Page) {}

  private field(name: string): Locator {
    return this.page.getByRole("textbox", { name, exact: true })
      .or(this.page.getByRole("combobox", { name, exact: true }))
      .filter({ visible: true });
  }

  private table(column: string): Locator {
    return this.page.getByRole("columnheader", { name: column, exact: true })
      .locator("xpath=ancestor::table[1]").filter({ visible: true });
  }

  private row(table: Locator, value: string): Locator {
    return table.locator(":scope > tbody > tr").filter({
      has: this.page.getByRole("cell", { name: value, exact: true }),
    });
  }

  private async setField(name: string, value: string): Promise<void> {
    const field = this.field(name);
    await expect(field).toBeVisible({ timeout: 30_000 });
    if (await field.evaluate((element) => element.tagName === "SELECT")) {
      await field.selectOption({ label: value });
    } else {
      await field.fill(value);
      await field.press("Tab");
    }
  }

  private async verifyField(name: string, value: string): Promise<void> {
    const field = this.field(name);
    await expect(field).toBeVisible({ timeout: 30_000 });
    if (await field.evaluate((element) => element.tagName === "SELECT")) {
      await expect(field.locator("option:checked")).toHaveText(value);
    } else {
      await expect(field).toHaveValue(value, { timeout: 30_000 });
    }
  }

  async submitRequest(requestName: string, data: PayInvoicesData): Promise<void> {
    await this.setField("Name", requestName);
    await this.setField("Template", data.template);
    // Set the selection dates using today and 60 calendar days from today.
    const payFromDate = new Date();
    const payThroughDate = new Date(payFromDate);
    payThroughDate.setDate(payThroughDate.getDate() + 60);
    const formatDate = (date: Date): string => 
  `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear().toString().slice(-2)}`;
    await this.setField("Pay from Date", formatDate(payFromDate));
    await this.page.waitForTimeout(3_000);
    await this.setField("Pay Through Date", formatDate(payThroughDate));
    
    // Use the main tab link, excluding its duplicate in the overflow menu.
    const processingOptionsTab = this.page.locator(
      'a[id$=":showDetailItem2::disAcr"]',
    );
    await expect(processingOptionsTab).toBeVisible({ timeout: 30_000 });
    await expect(processingOptionsTab).toHaveText("Payment and Processing Options");
    await processingOptionsTab.click();
    await expect(processingOptionsTab).toHaveClass(/\bp_AFSelected\b/, { timeout: 30_000 });
    await this.setField("Payment Date", formatDate(payFromDate));
    for (const [name, value] of [
      ["Disbursement Bank Account", data.expectedOptions.disbursementBankAccount],
      ["Payment Document", data.expectedOptions.paymentDocument],
      ["Payment Process Profile", data.expectedOptions.paymentProcessProfile],
      ["Payment Conversion Rate Type", data.expectedOptions.paymentConversionRateType],
    ]) await this.verifyField(name, value);
    // These template settings are necessary for the review/resume sequence.
    await expect(this.page.getByRole("checkbox", { name: "Review proposed payments", exact: true })).toBeChecked();
    await expect(this.page.getByRole("checkbox", { name: "Create payment files immediately", exact: true })).toBeChecked();
    await this.page.getByRole("button", { name: "Submit", exact: true }).click();
  }

  // Open the matching request's installment review and submit after a five-second pause.
  async reviewInstallments(requestName: string): Promise<void> {
    const table = this.page.locator('div[id$=":PprRequiringAction:_ATTp"]');
    const row = table.locator('tr[_afrrk]').filter({
      has: this.page.getByRole("link", { name: requestName, exact: true }),
    });
    await expect(row).toHaveCount(1, { timeout: 60_000 });
    await row.locator('a[title="Review installments"]').click();
    const submit = this.page.getByRole("button", { name: "Submit", exact: true });
    await expect(submit).toBeVisible({ timeout: 60_000 });
    await expect(submit).toBeEnabled();
    await this.page.waitForTimeout(5_000);
    await submit.click();
  }

  // Open this request's proposed payments and resume after a five-second review pause.
  async reviewProposedPaymentsAndResume(requestName: string): Promise<void> {
    const table = this.page.locator('div[id$=":PprRequiringAction:_ATTp"]');
    const row = table.locator('tr[_afrrk]').filter({
      has: this.page.getByRole("link", { name: requestName, exact: true }),
    });
    await expect(row).toHaveCount(1, { timeout: 60_000 });
    await row.locator('a[title="Review proposed payments"]').click();
    const resume = this.page.getByRole("button", { name: "Resume Payment Process", exact: true });
    await expect(resume).toBeVisible({ timeout: 60_000 });
    await expect(resume).toBeEnabled();
    await this.page.waitForTimeout(5_000);
    await resume.click();
  }

  async openRequestForReview(requestName: string): Promise<void> {
    const row = this.row(this.table("Pending Since"), requestName);
    await expect.poll(async () => {
      if (await row.count() === 1) return true;
      await this.page.getByTitle("Refresh", { exact: true }).filter({ visible: true }).first().click();
      return false;
    }, { timeout: 180_000, intervals: [5_000], message: `Waiting for PPR ${requestName}` }).toBe(true);
    await row.getByRole("link", { name: "Actions", exact: true }).click();
    await expect(this.page.getByRole("heading", { name: `Review Proposed Payments: ${requestName}`, exact: true })).toBeVisible({ timeout: 60_000 });
  }

  /** Leaves the payment review page open for the user before continuing. */
  async pauseForPaymentReview(): Promise<void> {
    await expect(
      this.page.getByRole("heading", { name: /^Review Proposed Payments:/ }),
    ).toBeVisible({ timeout: 60_000 });
    await this.page.waitForTimeout(15_000);
  }

  // Remove the document matching the exact invoice number from the payment request.
  async removeInvoice(invoiceNumber: string): Promise<void> {
    const documents = this.table("Reference Number");
    const invoice = this.row(documents, invoiceNumber);
    await expect(invoice).toHaveCount(1);
    await invoice.click();
    // The remove control belongs to the Documents table's toolbar.
    const section = documents.locator('xpath=ancestor::*[.//*[@title="Remove"]][1]');
    await section.getByTitle("Remove", { exact: true }).click();
    await this.page.getByRole("button", { name: "Yes", exact: true }).click();
    await expect(invoice).toHaveCount(0);
  }

  async submitRecalculation(): Promise<void> {
    await this.page.getByRole("button", { name: "Submit", exact: true }).click();
  }

  async resumePayments(): Promise<void> {
    await this.page.getByRole("button", { name: "Resume Payment Process", exact: true }).click();
  }

  async getPaymentFileId(requestName: string): Promise<string> {
    const row = this.row(this.table("Pending Since"), requestName);
    await expect(row).toHaveCount(1, { timeout: 60_000 });
    // Expand only this PPR to expose its payment-file child row.
    await row.locator('a[title="Expand"], a[title="Show More"]').click();
    const childRow = row.locator('xpath=following-sibling::tr[1]');
    const headers = await this.table("Pending Since").getByRole("columnheader").allTextContents();
    const index = headers.findIndex((name) => name.trim() === "Payment File");
    if (index < 0) throw new Error("Payment File column not found");
    const cell = childRow.getByRole("cell").nth(index);
    await expect(cell).toHaveText(/^\s*\d+\s*$/, { timeout: 60_000 });
    return (await cell.innerText()).trim();
  }

  async recordPrintStatus(paymentFileId: string): Promise<void> {
    const row = this.row(this.table("Reference"), paymentFileId);
    await expect(row).toHaveCount(1, { timeout: 60_000 });
    await row.getByRole("link", { name: "Actions", exact: true }).click();
    await expect(this.page.getByRole("heading", { name: `Record Print Status: Payment File ${paymentFileId}`, exact: true })).toBeVisible();
    const documents = this.table("Document Number");
    const rows = documents.locator(":scope > tbody > tr[_afrrk]");
    await expect.poll(() => rows.count()).toBeGreaterThan(0);
    for (const row of await rows.all()) {
      await expect(row.getByRole("cell", { name: "Printed", exact: true })).toBeVisible();
    }
    await this.page.getByRole("button", { name: "Submit", exact: true }).click();
    await this.page.getByRole("button", { name: "Record the Print Status", exact: true }).click();
  }

  async verifyCompleted(requestName: string): Promise<void> {
    const row = this.row(this.table("Payments Recorded"), requestName);
    await expect.poll(async () => {
      if (await row.count() === 1) return true;
      await this.page.getByTitle("Refresh", { exact: true }).filter({ visible: true }).first().click();
      return false;
    }, { timeout: 180_000, intervals: [5_000], message: `Waiting for completed PPR ${requestName}` }).toBe(true);
    await expect(row).toBeVisible();
    const headers = await this.table("Payments Recorded").getByRole("columnheader").allTextContents();
    const index = headers.findIndex((name) => name.trim() === "Payments Recorded");
    if (index < 0) throw new Error("Payments Recorded column not found");
    await expect(row.getByRole("cell").nth(index)).toHaveText(/^\s*[1-9]\d*\s*$/);
  }
}
