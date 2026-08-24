import path from "node:path";
import { test } from "@playwright/test";
import { env } from "../../../config/environment";
import { FusionNavigatorPage } from "../../../pages/common/fusion-navigator.page";
import { ScheduledProcessesPage } from "../../../pages/common/scheduled-processes.page";
import { AutoPostJournalsPage } from "../../../pages/erp/gl/auto-post-journals.page";
import { EditJournalPage } from "../../../pages/erp/gl/edit-journal.page";
import { ManageJournalsPage } from "../../../pages/erp/gl/manage-journals.page";
import { loadRunAutoPostJournalsData } from "../../../utils/erp/gl/load-run-autopost-journals-data";
import { AuthenticationWorkflow } from "../../../workflows/authentication.workflow";

test("GL 4.4.3 - authorized user can run AutoPost journals", async (
  { page },
  testInfo,
) => {
  test.setTimeout(420_000);

  const autoPostDataFilePath = path.join(
    "test-data",
    "clients",
    env.clientAlias,
    env.environment,
    "gl",
    "run-autopost-journals.json",
  );
  const {
    journalBaseName,
    ledger: ledgerName,
    criteriaSet,
  } = loadRunAutoPostJournalsData(autoPostDataFilePath);

  const authentication = new AuthenticationWorkflow(page);
  const navigatorPage = new FusionNavigatorPage(page);
  const scheduledProcessesPage = new ScheduledProcessesPage(page);
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
  // process ID for scheduled-process validation and troubleshooting.
  const processId = await autoPostJournalsPage.submitAutoPost(criteriaSet);

  console.log(`AutoPost process ID: ${processId}`);
  await testInfo.attach("AutoPost process ID", {
    body: processId,
    contentType: "text/plain",
  });

  // Oracle returns to Journals after confirmation. Open Scheduled Processes,
  // verify the exact AutoPost request, and obtain the generated posting request
  // ID from its Enterprise Scheduler Job Log.
  await navigatorPage.goToScheduledProcessesPage();
  await scheduledProcessesPage.verifyOverviewPage();
  await scheduledProcessesPage.waitForProcessToSucceed(
    "AutoPost Journals",
    processId,
  );

  const postingProcessId =
    await scheduledProcessesPage.downloadLogAndExtractPostingProcessId(
      processId,
    );

  console.log(`Post Journals process ID: ${postingProcessId}`);
  await testInfo.attach("Post Journals process ID", {
    body: postingProcessId,
    contentType: "text/plain",
  });

  // Confirm the posting request identified by the AutoPost log completed
  // successfully.
  await scheduledProcessesPage.waitForProcessToSucceed(
    "Post Journals",
    postingProcessId,
  );

  // Return Home, open General Accounting, and search Manage Journals for the
  // prepared spreadsheet journal in the configured primary ledger.
  await navigatorPage.goToManageJournalsPage();
  await manageJournalsPage.waitForJournalStatusByNameOrPrefixAndLedger(
    journalBaseName,
    ledgerName,
    "Posted",
    postingProcessId,
  );
  await manageJournalsPage.openJournalForLedgerByNameOrPrefix(
    journalBaseName,
    ledgerName,
  );

  // Confirm the opened record is the generated batch in the expected ledger
  // and that its final Batch Status is Posted.
  await editJournalPage.waitForEditJournalPage();
  await editJournalPage.verifyJournalBatchNamePrefix(journalBaseName);
  await editJournalPage.verifyLedger(ledgerName);
  await editJournalPage.verifyBatchStatus("Posted");
});
