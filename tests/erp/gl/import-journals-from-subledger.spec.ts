import path from "node:path";
import { test } from "@playwright/test";
import { env } from "../../../config/environment";
import { FusionNavigatorPage } from "../../../pages/common/fusion-navigator.page";
import { ScheduledProcessesPage } from "../../../pages/common/scheduled-processes.page";
import { EditJournalPage } from "../../../pages/erp/gl/edit-journal.page";
import { ImportJournalsPage } from "../../../pages/erp/gl/import-journals.page";
import { ManageJournalsPage } from "../../../pages/erp/gl/manage-journals.page";
import { loadImportJournalsData } from "../../../utils/test-data/load-import-journals-data";
import { AuthenticationWorkflow } from "../../../workflows/authentication.workflow";

test("GL 4.1.3 - user can submit Import Journals", async (
  { page },
  testInfo,
) => {
  test.setTimeout(420_000);

  const dataFilePath = path.join(
    "test-data",
    "clients",
    env.clientAlias,
    env.environment,
    "gl",
    "import-journals.json",
  );
  const importData = loadImportJournalsData(dataFilePath);

  const authentication = new AuthenticationWorkflow(page);
  const navigatorPage = new FusionNavigatorPage(page);
  const scheduledProcessesPage = new ScheduledProcessesPage(page);
  const editJournalPage = new EditJournalPage(page);
  const manageJournalsPage = new ManageJournalsPage(page);
  const importJournalsPage = new ImportJournalsPage(page);

  // Use the selected client and environment file to authenticate to Fusion.
  await authentication.login();

  // Reach the Journals workspace through the repository's established GL
  // navigation, then open Import Journals from the Tasks menu.
  await navigatorPage.goToManageJournalsPage();
  await manageJournalsPage.clickDone();
  await navigatorPage.goToImportJournalsPage();
  await importJournalsPage.verifyProcessName();
  await importJournalsPage.enterParameters(importData);

  const processId = await importJournalsPage.submit();

  console.log(`Import Journals process ID: ${processId}`);
  await testInfo.attach("Import Journals process ID", {
    body: processId,
    contentType: "text/plain",
  });

  await navigatorPage.goToScheduledProcessesPage();
  await scheduledProcessesPage.verifyOverviewPage();
  await scheduledProcessesPage.waitForProcessToSucceed(
    "Import Journals",
    processId,
  );

  const childProcessId =
    await scheduledProcessesPage.downloadImportJournalsLogAndExtractChildProcessId(
      processId,
    );

  console.log(`Import Journals child process ID: ${childProcessId}`);
  await testInfo.attach("Import Journals child process ID", {
    body: childProcessId,
    contentType: "text/plain",
  });

  await scheduledProcessesPage.waitForProcessToSucceed(
    "Import Journals: Child",
    childProcessId,
  );

  const journalBatchName =
    await scheduledProcessesPage.downloadImportJournalsReportAndExtractBatchName(
      childProcessId,
      processId,
    );

  console.log(`Imported journal batch name: ${journalBatchName}`);
  await testInfo.attach("Imported journal batch name", {
    body: journalBatchName,
    contentType: "text/plain",
  });

  // Return Home, search Manage Journals by the configured batch-name prefix,
  // and open the Journal link from the one matching ledger row.
  await navigatorPage.goToManageJournalsPage();
  await manageJournalsPage.findJournalBatchByNameOrPrefix(journalBatchName);
  await manageJournalsPage.openJournalForLedgerByNameOrPrefix(
    journalBatchName,
    importData.ledger,
  );
  await editJournalPage.waitForEditJournalPage();
});
