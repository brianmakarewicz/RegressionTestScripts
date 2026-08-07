import { test } from "@playwright/test";
import { env } from "../../../config/environment";
import { FusionNavigatorPage } from "../../../pages/common/fusion-navigator.page";
import { AutoReverseJournalsPage } from "../../../pages/erp/gl/auto-reverse-journals.page";
import { EditJournalPage } from "../../../pages/erp/gl/edit-journal.page";
import { ManageJournalsPage } from "../../../pages/erp/gl/manage-journals.page";
import { AuthenticationWorkflow } from "../../../workflows/authentication.workflow";

test("GL 4.1.6 - user can run AutoReverse for an accrual journal", async ({
  page,
}) => {
  test.setTimeout(240_000);

  // Require the exact approved journal batch prepared by the preceding tests.
  const journalBatchName = process.env.GL_JOURNAL_BATCH_NAME;
  const reversalPeriod = process.env.GL_REVERSAL_PERIOD;
  const ledgerName = env.glLedger;

  if (!journalBatchName) {
    throw new Error("GL_JOURNAL_BATCH_NAME is required");
  }

  if (!ledgerName) {
    throw new Error("ORACLE_GL_LEDGER is required");
  }

  if (!reversalPeriod) {
    throw new Error("GL_REVERSAL_PERIOD is required");
  }

  const authentication = new AuthenticationWorkflow(page);
  const navigatorPage = new FusionNavigatorPage(page);
  const manageJournalsPage = new ManageJournalsPage(page);
  const editJournalPage = new EditJournalPage(page);
  const autoReverseJournalsPage = new AutoReverseJournalsPage(page);

  // Find the approved accrual journal and confirm posting has completed before
  // introducing the AutoReverse submission capability in the next increment.
  await authentication.login();
  await navigatorPage.goToManageJournalsPage();
  await manageJournalsPage.waitForJournalBatchToBePosted(journalBatchName);
  await manageJournalsPage.openJournalForLedger(journalBatchName, ledgerName);
  await editJournalPage.waitForEditJournalPage();
  await editJournalPage.verifyJournalBatchName(journalBatchName);
  await editJournalPage.verifyLedger(ledgerName);
  await editJournalPage.verifyCategory("Accrual");

  // Confirm the journal is configured for the requested automatic reversal.
  await editJournalPage.showJournalDetails();
  await editJournalPage.openReversalTab();
  await editJournalPage.verifyReversalPeriod(reversalPeriod);
  await editJournalPage.verifyReversalMethod("Switch DR or CR");
  await editJournalPage.verifyReversalStatus("Not reversed");

  // Return through the Journals workspace and open the AutoReverse task.
  // Parameter entry and process submission are added as a separate capability.
  await editJournalPage.returnToManageJournals();
  await manageJournalsPage.clickDone();
  await navigatorPage.goToRunAutoReversePage();
  await autoReverseJournalsPage.waitForParameterForm();
});
