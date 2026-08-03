import { expect, type Locator, type Page } from "@playwright/test";

/**
 * Represents shared navigation within Oracle Fusion.
 *
 * Provides reusable navigation methods for reaching application pages used
 * by automated business workflows.
 */
export class FusionNavigatorPage {
  constructor(private page: Page) {}

  /**
   * Returns to the Oracle Fusion Home page and waits for its content to load.
   */
  async goToHomePage(): Promise<void> {
    const homeLink = this.page.getByRole("link", {
      name: "Home",
      exact: true,
    });

    await expect(homeLink).toBeVisible({ timeout: 30_000 });
    await homeLink.click();

    // Wait for the Oracle Home page content before selecting an application area.
    await expect(this.page.locator("#clusters_container")).toBeVisible({
      timeout: 30_000,
    });
  }

  /**
   * Opens the expanded General Accounting quick actions used by GL navigation.
   */
  private async openGeneralAccountingQuickActions(): Promise<Locator> {
    // Start from Home so navigation does not depend on the previous test page.
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
    // Show More exposes the consistent quick actions across user configurations.
    await showMoreLink.click();

    const expandedQuickActions = this.page.locator(
      "#show_more_groupNode_general_accounting",
    );

    await expect(expandedQuickActions).toBeVisible({ timeout: 30_000 });

    // Return the expanded panel so destination methods remain scoped to GL actions.
    return expandedQuickActions;
  }

  /**
   * Navigates to the Create Journal page.
   */
  async goToCreateJournalPage(): Promise<void> {
    const expandedQuickActions =
      await this.openGeneralAccountingQuickActions();

    const createJournalLink = expandedQuickActions.locator(
      'a[target="itemNode_create_journals"]',
    );

    await expect(createJournalLink).toBeVisible({ timeout: 30_000 });
    await createJournalLink.click();

    // Confirm navigation completed on the Create Journal page.
    await expect(
      this.page.getByRole("heading", { name: "Create Journal" }),
    ).toBeVisible({ timeout: 30_000 });
  }

  /**
   * Navigates to the Manage Approvals for Journals workspace.
   */
  async goToManageApprovalsForJournalsPage(): Promise<void> {
    const expandedQuickActions =
      await this.openGeneralAccountingQuickActions();

    const manageApprovalsLink = expandedQuickActions.locator(
      'a[target="itemNode_journal_approvals"]',
    );

    await expect(manageApprovalsLink).toBeVisible({ timeout: 30_000 });
    await manageApprovalsLink.click();

    // Confirm navigation completed in the journal approval workspace.
    await expect(
      this.page.locator("h1", { hasText: /^Journals$/ }),
    ).toBeVisible({ timeout: 30_000 });
  }

  /**
   * Navigates to the Manage Journals page.
   */
  async goToManageJournalsPage(): Promise<void> {
    const expandedQuickActions =
      await this.openGeneralAccountingQuickActions();

    const manageJournalsLink = expandedQuickActions.locator(
      'a[target="itemNode_manage_journals"]',
    );

    await expect(manageJournalsLink).toBeVisible({ timeout: 30_000 });
    await manageJournalsLink.click();

    // Confirm navigation completed on the Manage Journals page.
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
