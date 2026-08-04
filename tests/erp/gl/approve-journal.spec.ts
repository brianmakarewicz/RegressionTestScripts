import { test } from "@playwright/test";
import { FusionNavigatorPage } from "../../../pages/common/fusion-navigator.page";
import { EditJournalPage } from "../../../pages/erp/gl/edit-journal.page";
import { ManageJournalsPage } from "../../../pages/erp/gl/manage-journals.page";
import { AuthenticationWorkflow } from "../../../workflows/authentication.workflow";

test("GL 4.4.2 - authorized user can approve a journal", async ({ page }) => {
  test.setTimeout(180_000);

  // Require the exact batch configured for this approval run.
  const journalBatchName = process.env.GL_JOURNAL_BATCH_NAME;

  if (!journalBatchName) {
    throw new Error("GL_JOURNAL_BATCH_NAME is required");
  }

  const authentication = new AuthenticationWorkflow(page);
  const navigatorPage = new FusionNavigatorPage(page);
  const manageJournalsPage = new ManageJournalsPage(page);
  const editJournalPage = new EditJournalPage(page);

  // Sign in as the independently configured journal approver.
  await authentication.login();
  await navigatorPage.goToManageJournalsPage();

  // Find and approve the exact journal batch supplied for this test run.
  await manageJournalsPage.searchForJournalBatch(journalBatchName);
  await manageJournalsPage.openJournalBatch(journalBatchName);
  await editJournalPage.waitForEditJournalPage();
  await editJournalPage.verifyJournalBatchName(journalBatchName);
  await editJournalPage.approveJournalBatch();

  // Return to Manage Journals and verify asynchronous posting completed.
  await editJournalPage.returnToManageJournals();
  await manageJournalsPage.waitForJournalBatchToBePosted(journalBatchName);
});
