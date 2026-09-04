import { test } from "@playwright/test";
import { AuthenticationWorkflow } from "../../../workflows/authentication.workflow";
import { FusionNavigatorPage } from "../../../pages/common/fusion-navigator.page";
import { EditJournalPage } from "../../../pages/erp/gl/edit-journal.page";
import { ManageJournalsPage } from "../../../pages/erp/gl/manage-journals.page";

test("user can initiate journal approval with posting", async ({ page }) => {
  test.setTimeout(180_000);

  // Require the exact saved batch prepared for this approval-initiation run.
  const journalBatchName = process.env.GL_JOURNAL_BATCH_NAME;

  if (!journalBatchName) {
    throw new Error("GL_JOURNAL_BATCH_NAME is required");
  }

  // Initialize the workflow and page objects used by the scenario.
  const authentication = new AuthenticationWorkflow(page);
  const navigatorPage = new FusionNavigatorPage(page);
  const manageJournalsPage = new ManageJournalsPage(page);
  const editJournalPage = new EditJournalPage(page);

  // Authenticate and navigate to the existing saved journal batch.
  await authentication.login();
  await navigatorPage.goToManageJournalsPage();
  await manageJournalsPage.searchForJournalBatch(journalBatchName);
  await manageJournalsPage.openJournalBatch(journalBatchName);
  await editJournalPage.waitForEditJournalPage();
  await editJournalPage.verifyJournalBatchName(journalBatchName);

  // Complete the saved journal and submit it for approval with posting requested.
  await editJournalPage.completeJournal();
  await editJournalPage.postJournal();
  await editJournalPage.showJournalBatchDetails();
  await editJournalPage.openActionLog();

  // Confirm Oracle recorded the expected approval action.
  await editJournalPage.verifyActionLogContainsAction(
    "Sent for approval with posting",
  );
});
