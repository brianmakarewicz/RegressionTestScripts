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
    const classicHomeLink = this.page.getByRole("link", {
      name: "Home",
      exact: true,
    });
    const classicHomeContent = this.page.locator("#clusters_container");
    const redwoodHomeLink = this.page.locator(
      "#ojSpSimpleUIShellGlobalHeader_HOa1",
    );
    let homePageType: "classic" | "redwood" | null = null;

    // Fusion exposes a different Home control in the Classic and Redwood
    // shells. Wait for either supported shell instead of assuming one layout.
    await expect
      .poll(
        async () => {
          if (await redwoodHomeLink.isVisible()) {
            homePageType = "redwood";
            return true;
          }

          if (await classicHomeLink.isVisible()) {
            homePageType = "classic";
            return true;
          }

          return false;
        },
        {
          message: "Waiting for either the Classic or Redwood Home link",
          timeout: 30_000,
        },
      )
      .toBe(true);

    if (homePageType === "classic") {
      // Authentication normally finishes on Classic Home. Avoid clicking Home
      // again because its delayed navigation can overwrite the next tab click.
      if (await classicHomeContent.isVisible()) {
        return;
      }

      await classicHomeLink.click();

      await expect(classicHomeContent).toBeVisible({ timeout: 30_000 });
      return;
    }

    await redwoodHomeLink.click();

    // Redwood does not expose the Classic clusters container. The destination
    // navigation method performs the next page-specific readiness assertion.
    await this.page.waitForLoadState("domcontentloaded");
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

  /**
   * Opens the Tasks menu from the Journals workspace.
   */
  async openTasksMenu(): Promise<void> {
    await expect(
      this.page.getByRole("heading", {
        name: "Journals",
        exact: true,
        level: 1,
      }),
    ).toBeVisible({ timeout: 30_000 });

    const tasksLink = this.page.locator(
      'a[id$="_FOTsdi_JournalEntryPage_itemNode_FndTasksList::disAcr"]',
    );

    await expect(tasksLink).toBeVisible({ timeout: 30_000 });
    await tasksLink.click();
  }

  /**
   * Opens Manage Journals from the Journals workspace task list.
   */
  async goToManageJournalsFromTasks(): Promise<void> {
    await this.openTasksMenu();

    const manageJournalsLink = this.page.locator(
      'a[id$="_FOTRaT:0:RAtl1"]',
    );

    await expect(manageJournalsLink).toBeVisible({ timeout: 30_000 });
    await expect(manageJournalsLink).toHaveText("Manage Journals");
    await manageJournalsLink.click();

    await expect(
      this.page.getByRole("heading", {
        name: "Manage Journals",
        exact: true,
        level: 1,
      }),
    ).toBeVisible({ timeout: 60_000 });
  }

  /**
   * Opens Run AutoReverse from the Journals workspace task list.
   */
  async goToRunAutoReversePage(): Promise<void> {
    await this.openTasksMenu();

    const runAutoReverseLink = this.page.locator(
      'a[id$="_FOTRaT:0:RAtl6"]',
    );

    await expect(runAutoReverseLink).toBeVisible({ timeout: 30_000 });
    await expect(runAutoReverseLink).toHaveText("Run AutoReverse");
    await runAutoReverseLink.click();
  }

  /**
   * Opens Run AutoPost from the Journals workspace task list.
   */
  async goToRunAutoPostPage(): Promise<void> {
    await this.openTasksMenu();

    const runAutoPostLink = this.page.locator(
      'a[id$="_FOTRaT:0:RAtl5"]',
    );

    await expect(runAutoPostLink).toBeVisible({ timeout: 30_000 });
    await expect(runAutoPostLink).toHaveText("Run AutoPost");
    await runAutoPostLink.click();
  }

  /**
   * Opens Scheduled Processes from the Tools section of the Navigator.
   */
  async goToScheduledProcessesPage(): Promise<void> {
    const navigatorLink = this.page.getByRole("link", {
      name: "Navigator",
      exact: true,
    });

    await expect(navigatorLink).toBeVisible({ timeout: 30_000 });
    await navigatorLink.click();

    const showMoreLink = this.page.locator(
      'a[id$=":nvcl1"]',
    );

    // Show More is the readiness signal for the fully loaded Navigator and
    // exposes all application groups without racing their individual toggles.
    await expect(showMoreLink).toBeVisible({ timeout: 30_000 });
    await expect(showMoreLink).toHaveText("Show More");
    await showMoreLink.click();

    const toolsGroup = this.page.locator(
      'div[id$="nvgpgl1_groupNode_tools"]',
    );
    const toolsHeader = toolsGroup.locator(
      'div[id$="nvgpgl2_groupNode_tools"]',
    );

    await expect(toolsGroup).toBeVisible({ timeout: 30_000 });
    await expect(toolsHeader).toHaveAttribute("title", "Tools");

    const scheduledProcessesLink = toolsGroup.locator(
      'a[id$="nv_itemNode_tools_scheduled_processes_fuse_plus"]',
    );

    await expect(scheduledProcessesLink).toBeVisible({ timeout: 30_000 });
    await expect(scheduledProcessesLink).toHaveAttribute(
      "title",
      "Scheduled Processes",
    );
    await scheduledProcessesLink.click();
    await this.page.waitForLoadState("domcontentloaded");
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
