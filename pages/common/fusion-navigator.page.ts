import { expect, type Locator, type Page } from "@playwright/test";

export class FusionNavigatorPage {
  constructor(private page: Page) {}

async goToHomePage(): Promise<void> {
  const classicHomeLink = this.page.locator('[id="_FOpt1:_UIShome"]');

  const redwoodHomeLink = this.page.locator(
    '#ojSpSimpleUIShellGlobalHeader_HOa1'
  );

  let homePageType: 'classic' | 'redwood' | null = null;

  await expect
    .poll(
      async () => {
        if (await classicHomeLink.isVisible()) {
          homePageType = 'classic';
          return true;
        }

        if (await redwoodHomeLink.isVisible()) {
          homePageType = 'redwood';
          return true;
        }

        return false;
      },
      {
        message: 'Waiting for either the Classic or Redwood Home link',
        timeout: 30_000,
      }
    )
    .toBe(true);

  if (homePageType === 'classic') {
    await classicHomeLink.click();

    await expect(this.page.locator('#clusters_container')).toBeVisible({
      timeout: 30_000,
    });
  } else {
    await redwoodHomeLink.click();

    // Allow the Redwood Home action to complete.
    await this.page.waitForLoadState('domcontentloaded');
  }
}

  private async openGeneralAccountingQuickActions(): Promise<Locator> {
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

    return expandedQuickActions;
  }

  async goToCreateJournalPage(): Promise<void> {
    const expandedQuickActions =
      await this.openGeneralAccountingQuickActions();

    const createJournalLink = expandedQuickActions.locator(
      'a[target="itemNode_create_journals"]',
    );

    await expect(createJournalLink).toBeVisible({ timeout: 30_000 });
    await createJournalLink.click();

    await expect(
      this.page.getByRole("heading", { name: "Create Journal" }),
    ).toBeVisible({ timeout: 30_000 });
  }

  async goToManageApprovalsForJournalsPage(): Promise<void> {
    const expandedQuickActions =
      await this.openGeneralAccountingQuickActions();

    const manageApprovalsLink = expandedQuickActions.locator(
      'a[target="itemNode_journal_approvals"]',
    );

    await expect(manageApprovalsLink).toBeVisible({ timeout: 30_000 });
    await manageApprovalsLink.click();

    await expect(
      this.page.locator("h1", { hasText: /^Journals$/ }),
    ).toBeVisible({ timeout: 30_000 });
  }

  async goToManageJournalsPage(): Promise<void> {
    const expandedQuickActions =
      await this.openGeneralAccountingQuickActions();

    const manageJournalsLink = expandedQuickActions.locator(
      'a[target="itemNode_manage_journals"]',
    );

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
    await this.page.waitForTimeout(2 * 1000);
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
    await this.page.waitForTimeout(3 * 1000);
    await this.page.getByRole("link", { name: invoiceNumber }).click();
    await expect(
      this.page.getByRole("heading", { name: "Invoice Details" }),
    ).toBeVisible({ timeout: 30_000 });
  }

  async goToCreateAPInvoice() {
    await this.page.getByRole("link", { name: "Navigator" }).click();
    await this.page.getByTitle("Payables", { exact: true }).click();
    await this.page.getByRole("link", { name: "Invoices" }).click();
    await this.page.getByRole("link", { name: "Tasks" }).click();
    await this.page.getByRole('link', { name: 'Create Invoice', exact: true }).click();
    await expect(
      this.page.getByRole('heading', { name: 'Invoice Header' }),
    ).toBeVisible({ timeout: 30_000 });

  }

    async goToReceipt(PONumber: string) {
    await this.page.getByRole('link', { name: 'Navigator' }).click();
    await this.page.getByTitle('Procurement', { exact: true }).click();
    await this.page.getByRole('link', { name: 'My Receipts' }).click();
    await this.page.locator('#smart-search-component-search-bar').getByRole('combobox').fill(PONumber);
    await this.page.locator('div').filter({ hasText: PONumber }).nth(3).click();
    await this.page.waitForTimeout(3 * 1000);
  }
}
