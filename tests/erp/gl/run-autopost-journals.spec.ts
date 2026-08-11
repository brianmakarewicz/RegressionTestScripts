import { test } from "@playwright/test";
import { env } from "../../../config/environment";
import { FusionNavigatorPage } from "../../../pages/common/fusion-navigator.page";
import { AutoPostJournalsPage } from "../../../pages/erp/gl/auto-post-journals.page";
import { EditJournalPage } from "../../../pages/erp/gl/edit-journal.page";
import { ManageJournalsPage } from "../../../pages/erp/gl/manage-journals.page";
import { AuthenticationWorkflow } from "../../../workflows/authentication.workflow";

test("GL 4.4.3 - authorized user can run AutoPost journals", async (
  { page },
  testInfo,
) => {
  test.setTimeout(420_000);

  // This value is the base journal name entered in the spreadsheet. Oracle
  // appends the category to the Journal name and import details to the Batch.
  const journalBaseName = process.env.GL_JOURNAL_BATCH_NAME;
  const ledgerName = env.glLedger;
  const criteriaSet = "All Journals US Primary Ledger";

  if (!journalBaseName) {
    throw new Error("GL_JOURNAL_BATCH_NAME is required");
  }

  if (!ledgerName) {
    throw new Error("ORACLE_GL_LEDGER is required");
  }

  const authentication = new AuthenticationWorkflow(page);
  const navigatorPage = new FusionNavigatorPage(page);
  const manageJournalsPage = new ManageJournalsPage(page);
  const autoPostJournalsPage = new AutoPostJournalsPage(page);
  const editJournalPage = new EditJournalPage(page);

  // Locate the prepared spreadsheet journal and confirm that it is eligible
  // for this test before AutoPost changes its business state.
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

  // Submit AutoPost using the approved functional criteria set and retain the
  // process ID for troubleshooting without checking scheduled-process status.
  const processId = await autoPostJournalsPage.submitAutoPost(criteriaSet);

  console.log(`AutoPost process ID: ${processId}`);
  await testInfo.attach("AutoPost process ID", {
    body: processId,
    contentType: "text/plain",
  });

  // Oracle returns to Journals after confirmation. Reopen Manage Journals and
  // wait for the matching primary-ledger row to show the posted business state.
  await navigatorPage.goToManageJournalsFromTasks();
  await manageJournalsPage.waitForJournalStatusByNameOrPrefixAndLedger(
    journalBaseName,
    ledgerName,
    "Posted",
    processId,
  );
  await manageJournalsPage.openJournalForLedgerByNameOrPrefix(
    journalBaseName,
    ledgerName,
  );

  // Confirm that the opened record is the expected generated batch in the
  // primary ledger and that its final Batch Status is Posted.
  await editJournalPage.waitForEditJournalPage();
  await editJournalPage.verifyJournalBatchNamePrefix(journalBaseName);
  await editJournalPage.verifyLedger(ledgerName);
  await editJournalPage.verifyBatchStatus("Posted");
});
