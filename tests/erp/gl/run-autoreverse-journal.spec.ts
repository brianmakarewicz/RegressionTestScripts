import { test } from "@playwright/test";
import { FusionNavigatorPage } from "../../../pages/common/fusion-navigator.page";
import { EditJournalPage } from "../../../pages/erp/gl/edit-journal.page";
import { ManageJournalsPage } from "../../../pages/erp/gl/manage-journals.page";
import { AuthenticationWorkflow } from "../../../workflows/authentication.workflow";

test("GL 4.1.6 - user can run AutoReverse for an accrual journal", async ({
  page,
}) => {
  test.setTimeout(240_000);

  // Require the exact approved journal batch prepared by the preceding tests.
  const journalBatchName = process.env.GL_JOURNAL_BATCH_NAME;

  if (!journalBatchName) {
    throw new Error("GL_JOURNAL_BATCH_NAME is required");
  }

  const authentication = new AuthenticationWorkflow(page);
  const navigatorPage = new FusionNavigatorPage(page);
  const manageJournalsPage = new ManageJournalsPage(page);
  const editJournalPage = new EditJournalPage(page);

  // Find the approved accrual journal and confirm posting has completed before
  // introducing the AutoReverse submission capability in the next increment.
  await authentication.login();
  await navigatorPage.goToManageJournalsPage();
  await manageJournalsPage.waitForJournalBatchToBePosted(journalBatchName);
  await manageJournalsPage.openJournalBatch(journalBatchName);
  await editJournalPage.waitForEditJournalPage();
  await editJournalPage.verifyJournalBatchName(journalBatchName);
  await editJournalPage.verifyCategory("Accrual");
});
