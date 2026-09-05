import path from "node:path";
import { test } from "@playwright/test";
import { env } from "../../../config/environment";
import { AuthenticationWorkflow } from "../../../workflows/authentication.workflow";
import { FusionNotificationsPage } from "../../../pages/common/fusion-notifications.page";
import { VacationRulePage } from "../../../pages/erp/gl/vacation-rule.page";
import { loadVacationRuleData } from "../../../utils/erp/gl/load-vacation-rule-data";

test("user can open Worklist for the configured vacation-rule user", async ({
  page,
}) => {
  test.setTimeout(120_000);

  const vacationRuleDataFilePath = path.join(
    "test-data",
    "clients",
    env.clientAlias,
    env.environment,
    "gl",
    "validate-setup-vacation-rule.json",
  );
  const vacationRuleData = loadVacationRuleData(vacationRuleDataFilePath);

  // Authenticate through the shared workflow used by Fusion UI tests.
  const authentication = new AuthenticationWorkflow(page);
  const notificationsPage = new FusionNotificationsPage(page);
  const vacationRulePage = new VacationRulePage(page);
  await authentication.login();

  // Open Notifications, follow its required detail link, and open Worklist.
  await notificationsPage.openNotificationsPanel();
  const notificationsWindow = await notificationsPage.openNotificationsPage();
  await notificationsPage.verifyNotificationsPage(notificationsWindow);
  await vacationRulePage.openWorklistAndConfigureVacationRule(
    vacationRuleData.userDisplayName,
    vacationRuleData.startDate,
    vacationRuleData.endDate,
    vacationRuleData.delegateToFirstName,
    vacationRuleData.delegateToLastName,
  );
});
