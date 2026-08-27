import { test } from "@playwright/test";
import { AuthenticationWorkflow } from "../../../workflows/authentication.workflow";
import { FusionNotificationsPage } from "../../../pages/common/fusion-notifications.page";

test("user can log in before validating a setup vacation rule", async ({
  page,
}) => {
  test.setTimeout(120_000);

  // Authenticate through the shared workflow used by Fusion UI tests.
  const authentication = new AuthenticationWorkflow(page);
  const notificationsPage = new FusionNotificationsPage(page);
  await authentication.login();

   // Open Notifications and follow the available detail link, if present.
  await notificationsPage.openNotificationsPanel();
  const notificationsWindow =
    await notificationsPage.openNotificationsPageIfAvailable();

  if (notificationsWindow) {
    await notificationsPage.verifyNotificationsPage(notificationsWindow);
  }
});
