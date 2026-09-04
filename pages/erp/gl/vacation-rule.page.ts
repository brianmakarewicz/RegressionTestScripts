import { expect, type Page } from "@playwright/test";

/**
 * Represents Worklist navigation for the configured vacation-rule user.
 */
export class VacationRulePage {
  constructor(private readonly page: Page) {}

  /** Opens Worklist and configures the selected user's vacation rule. */
  async openWorklistAndConfigureVacationRule(
    userDisplayName: string,
    startDate: string,
    endDate: string,
    delegateToFirstName: string,
    delegateToLastName: string,
  ): Promise<void> {
    const worklistButton = this.page.getByRole("button", {
      name: "Worklist",
      exact: true,
    });

    await expect(worklistButton).toBeVisible({ timeout: 30_000 });
    const [worklistPage] = await Promise.all([
      this.page.waitForEvent("popup", { timeout: 30_000 }),
      worklistButton.click(),
    ]);

    await worklistPage.waitForLoadState("domcontentloaded");
    await expect(worklistPage.getByText("BPM Worklist")).toBeVisible({
      timeout: 30_000,
    });

    const userLink = worklistPage.getByRole("link", {
      name: userDisplayName,
      exact: true,
    });

    await expect(userLink).toBeVisible({ timeout: 30_000 });
    await userLink.click();

    const preferencesMenuItem = worklistPage.getByRole("menuitem", {
      name: "Preferences",
      exact: true,
    });

    await expect(preferencesMenuItem).toBeVisible({ timeout: 30_000 });
    await preferencesMenuItem.click();

    const enableVacationRuleCheckbox = worklistPage.locator(
      '[id="homePageTemplate:r1:0:vacationRuleSelectOneRadio::content"]',
    );
    const startDateTextbox = worklistPage.locator(
      '[id="homePageTemplate:r1:0:vacationRuleStartDate::content"]',
    );
    const endDateTextbox = worklistPage.locator(
      '[id="homePageTemplate:r1:0:vacationRuleEndDate::content"]',
    );
    const delegateToLabel = worklistPage.getByText("Delegate to:", {
      exact: true,
    });
    const delegateToRadio = worklistPage.locator(
      '[id="homePageTemplate:r1:0:vacRuleActionItemRadioDelegate::content"]',
    );

    await expect(enableVacationRuleCheckbox).toBeVisible({ timeout: 30_000 });
    if (!(await enableVacationRuleCheckbox.isChecked())) {
      await enableVacationRuleCheckbox.check();
    }
    await expect(enableVacationRuleCheckbox).toBeChecked();

    await expect(startDateTextbox).toBeEnabled({ timeout: 30_000 });
    await expect(endDateTextbox).toBeEnabled({ timeout: 30_000 });
    await expect(startDateTextbox).toBeEditable();
    await expect(endDateTextbox).toBeEditable();
    await startDateTextbox.fill(startDate);
    await endDateTextbox.fill(endDate);

    await expect(delegateToLabel).toBeVisible({ timeout: 30_000 });
    await expect(delegateToRadio).toBeVisible();
    await delegateToRadio.click();
    await expect(delegateToRadio).toBeChecked();

    const selectUserLink = worklistPage.locator(
      'a[id$="vacRuleDelegateIdentityBrowserLink"]',
    );

    await expect(selectUserLink).toBeVisible({ timeout: 30_000 });
    await selectUserLink.click();

    const identityBrowserDialog = worklistPage.getByRole("dialog", {
      name: "Identity Browser",
      exact: true,
    });
    const advancedCheckbox = identityBrowserDialog.getByRole("checkbox", {
      name: "Advanced",
      exact: true,
    });
    const delegateFirstNameTextbox = identityBrowserDialog.getByRole(
      "textbox",
      { name: "First Name", exact: true },
    );
    const delegateLastNameTextbox = identityBrowserDialog.getByRole("textbox", {
      name: "Last Name",
      exact: true,
    });
    const searchButton = identityBrowserDialog.getByRole("button", {
      name: "Search",
      exact: true,
    });
    const searchResultsGrid = identityBrowserDialog.getByRole("grid", {
      name: "Searched Items",
      exact: true,
    });
    const searchResultRows = searchResultsGrid.locator('tr[role="row"]');

    await expect(identityBrowserDialog).toBeVisible({ timeout: 30_000 });
    await expect(advancedCheckbox).toBeVisible({ timeout: 30_000 });
    if (!(await advancedCheckbox.isChecked())) {
      await advancedCheckbox.check();
    }
    await expect(advancedCheckbox).toBeChecked();
    await expect(delegateFirstNameTextbox).toBeEditable({ timeout: 30_000 });
    await expect(delegateLastNameTextbox).toBeEditable({ timeout: 30_000 });
    await delegateFirstNameTextbox.fill(delegateToFirstName);
    await delegateLastNameTextbox.fill(delegateToLastName);

    await expect(searchButton).toBeVisible({ timeout: 30_000 });
    await searchButton.click();

    await expect(
      searchResultRows,
      "Expected exactly one delegate search result. Provide a unique first name and last name.",
    ).toHaveCount(1, { timeout: 30_000 });

    const delegateResultRadio = searchResultRows.first().getByRole("radio");
    const confirmSelectionButton = identityBrowserDialog.getByRole("button", {
      name: "OK",
      exact: true,
    });

    await expect(delegateResultRadio).toBeVisible();
    await delegateResultRadio.click();
    await expect(delegateResultRadio).toBeChecked();

    await expect(confirmSelectionButton).toBeVisible();
    await confirmSelectionButton.click();

    const saveButton = worklistPage.getByRole("button", {
      name: "Save",
      exact: true,
    });
    await expect(saveButton).toBeVisible();
    await saveButton.click();
  }
}
