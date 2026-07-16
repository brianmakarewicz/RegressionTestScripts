import { Page, expect } from "@playwright/test";

export class FusionNavigatorPage {
  constructor(private page: Page) {}

  async goToCreateJournalPage() {
    await this.page.getByRole("link", { name: "Navigator" }).click();

    const generalAccounting = this.page.getByTitle("General Accounting", {
      exact: true,
    });
    await expect(generalAccounting).toBeVisible({ timeout: 30_000 });
    await generalAccounting.click();

    await this.page.getByRole("link", { name: "Journals" }).click();
    await this.page.getByRole("link", { name: "Tasks" }).click();
    await this.page
      .getByRole("link", { name: "Create Journal", exact: true })
      .click();

    await expect(
      this.page.getByRole("heading", { name: "Create Journal" }),
    ).toBeVisible({ timeout: 30_000 });
  }

  async goToAPInvoice( invoiceNumber: string) {
      await this.page.getByRole('link', { name: 'Navigator' }).click();
      await this.page.getByTitle('Payables', { exact: true }).click();
      await this.page.getByRole('link', { name: 'Invoices' }).click();
      await this.page.getByRole('link', { name: 'Tasks' }).click();
      await this.page.getByRole('link', { name: /manage invoices/i }).click();
      await this.page.getByRole('textbox', { name: 'Invoice Number' }).click();
      await this.page.getByRole('textbox', { name: 'Invoice Number' }).fill(invoiceNumber);
      await this.page.getByRole('button', { name: 'Search', exact: true }).click();
      await this.page.getByRole('link', { name: invoiceNumber }).click();
      await expect(this.page.getByRole('heading', { name: 'Invoice Details' })).toBeVisible({timeout: 30_000 });
  }
}
