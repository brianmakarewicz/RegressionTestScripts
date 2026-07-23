import { Page, expect } from "@playwright/test";

export class FusionNavigatorPage {
  constructor(private page: Page) {}

  async goToHomePage(): Promise<void> {
    const homeLink = this.page.getByRole("link", {
      name: "Home",
      exact: true,
    });

    await expect(homeLink).toBeVisible({ timeout: 30_000 });
    await homeLink.click();

    await expect(this.page.locator("#clusters_container")).toBeVisible({
      timeout: 30_000,
    });
  }

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

  async goToManageApprovalsForJournalsPage(): Promise<void> {
    await this.goToHomePage();

    const generalAccountingTab = this.page.locator(
      "#groupNode_general_accounting",
    );

    await expect(generalAccountingTab).toBeVisible({ timeout: 30_000 });
    await generalAccountingTab.click();

    const generalAccountingPanel = this.page.locator(
      "#cluster_groupNode_general_accounting",
    );

    await expect(generalAccountingPanel).toBeVisible({ timeout: 30_000 });

    const showMoreLink = generalAccountingPanel.locator(
      "#showmore_groupNode_general_accounting",
    );

    await expect(showMoreLink).toBeVisible({ timeout: 30_000 });
    await showMoreLink.click();

    const expandedQuickActions = this.page.locator(
      "#show_more_groupNode_general_accounting",
    );

    await expect(expandedQuickActions).toBeVisible({ timeout: 30_000 });

    const manageApprovalsLink = expandedQuickActions.getByRole("link", {
      name: "Manage Approvals for Journals",
      exact: true,
    });

    await expect(manageApprovalsLink).toBeVisible({ timeout: 30_000 });
    await manageApprovalsLink.click();

    await expect(
      this.page.locator("h1", { hasText: /^Journals$/ }),
    ).toBeVisible({ timeout: 30_000 });
  }

  async goToManageJournalsPage(): Promise<void> {
    const tasksLink = this.page.getByRole("link", {
      name: "Tasks",
      exact: true,
    });

    await expect(tasksLink).toBeVisible({ timeout: 30_000 });
    await tasksLink.click();

    const manageJournalsLink = this.page.getByRole("link", {
      name: "Manage Journals",
      exact: true,
    });

    await expect(manageJournalsLink).toBeVisible({ timeout: 30_000 });
    await manageJournalsLink.click();

    await expect(
      this.page.locator("h1", {
        hasText: /^Manage Journals$/,
      }),
    ).toBeVisible({ timeout: 30_000 });
  }

  async goToAPInvoice(invoiceNumber: string) {
    await this.page.getByRole("link", { name: "Navigator" }).click();
    await this.page.getByTitle("Payables", { exact: true }).click();
    await this.page.getByRole("link", { name: "Invoices" }).click();
    await this.page.getByRole("link", { name: "Tasks" }).click();
    await this.page.getByRole("link", { name: /manage invoices/i }).click();
    await this.page.getByRole("textbox", { name: "Invoice Number" }).click();
    await this.page
      .getByRole("textbox", { name: "Invoice Number" })
      .fill(invoiceNumber);
    await this.page
      .getByRole("button", { name: "Search", exact: true })
      .click();
    await this.page.getByRole("link", { name: invoiceNumber }).click();
    await expect(
      this.page.getByRole("heading", { name: "Invoice Details" }),
    ).toBeVisible({ timeout: 30_000 });
  }
}
