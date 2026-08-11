import { test } from "@playwright/test";
import { FusionNavigatorPage } from "../../../pages/common/fusion-navigator.page";
import { AutoPostJournalsPage } from "../../../pages/erp/gl/auto-post-journals.page";
import { ManageJournalsPage } from "../../../pages/erp/gl/manage-journals.page";
import { AuthenticationWorkflow } from "../../../workflows/authentication.workflow";

test("GL 4.4.3 - authorized user can run AutoPost journals", async ({
  page,
}) => {
  test.setTimeout(180_000);

  // This value is the base journal name entered in the spreadsheet. Oracle
  // appends the category to the Journal name and import details to the Batch.
  const journalBaseName = process.env.GL_JOURNAL_BATCH_NAME;

  if (!journalBaseName) {
    throw new Error("GL_JOURNAL_BATCH_NAME is required");
  }

  const authentication = new AuthenticationWorkflow(page);
  const navigatorPage = new FusionNavigatorPage(page);
  const manageJournalsPage = new ManageJournalsPage(page);
  const autoPostJournalsPage = new AutoPostJournalsPage(page);

  // First iteration: sign in, navigate to Manage Journals, and prove that the
  // prepared spreadsheet journal can be found before AutoPost changes state.
  await authentication.login();
  await navigatorPage.goToManageJournalsPage();
  await manageJournalsPage.findJournalBatchByNameOrPrefix(journalBaseName);
  await manageJournalsPage.verifyJournalBatchStatusByNameOrPrefix(
    journalBaseName,
    "Unposted",
  );

  // Return to the Journals workspace and open the AutoPost process page.
  await manageJournalsPage.clickDone();
  await navigatorPage.goToRunAutoPostPage();
  await autoPostJournalsPage.verifyProcessName();
});
