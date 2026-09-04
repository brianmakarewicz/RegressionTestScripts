import path from "node:path";
import { test } from "@playwright/test";
import { requireRunProfile } from "../../../config/run-profile";
import { AuthenticationWorkflow } from "../../../workflows/authentication.workflow";
import { FusionNavigatorPage } from "../../../pages/common/fusion-navigator.page";
import { EditJournalPage } from "../../../pages/erp/gl/edit-journal.page";
import { ManageJournalsPage } from "../../../pages/erp/gl/manage-journals.page";
import { loadManuallyPostJournalData } from "../../../utils/erp/gl/load-manually-post-journal-data";

test("GL 4.4.4 - authorized user can manually post a journal", async ({
  page,
}) => {
  test.setTimeout(180_000);

  const runProfile = requireRunProfile();
  const journalDataFilePath = path.join(
    runProfile.testDataPath,
    "gl",
    "manually-post-journal.json",
  );
  const { journalBatchName } =
    loadManuallyPostJournalData(journalDataFilePath);

  const authentication = new AuthenticationWorkflow(
    page,
    runProfile.user("standardUser"),
  );
  const navigatorPage = new FusionNavigatorPage(page);
  const manageJournalsPage = new ManageJournalsPage(page);
  const editJournalPage = new EditJournalPage(page);

  // Find and validate the exact prepared journal batch.
  await authentication.login();
  await navigatorPage.goToManageJournalsPage();
  await manageJournalsPage.searchForJournalBatch(journalBatchName);
  await manageJournalsPage.verifyExactJournalBatchResult(
    journalBatchName,
  );

  // Submit the selected batch for approval with posting requested.
  await manageJournalsPage.selectJournalBatch(journalBatchName);
  await manageJournalsPage.postSelectedJournalBatch();

  // Refresh the results and confirm the exact batch without relying on
  // environment-specific status columns.
  await manageJournalsPage.searchForJournalBatch(journalBatchName);
  await manageJournalsPage.verifyExactJournalBatchResult(
    journalBatchName,
  );

  // Open the journal and verify Oracle recorded the expected approval action.
  await manageJournalsPage.openJournalForBatch(journalBatchName);
  await editJournalPage.waitForEditJournalPage();
  await editJournalPage.verifyJournalBatchName(journalBatchName);
  await editJournalPage.showJournalBatchDetails();
  await editJournalPage.openActionLog();
  await editJournalPage.verifyActionLogContainsAction(
    "Sent for approval with posting",
  );
});
