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
}
