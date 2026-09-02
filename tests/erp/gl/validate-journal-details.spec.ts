import path from "node:path";
import { test } from "@playwright/test";
import { requireRunProfile } from "../../../config/run-profile";
import { AuthenticationWorkflow } from "../../../workflows/authentication.workflow";
import { FusionNavigatorPage } from "../../../pages/common/fusion-navigator.page";
import { ManageJournalsPage } from "../../../pages/erp/gl/manage-journals.page";
import { EditJournalPage } from "../../../pages/erp/gl/edit-journal.page";
import { loadValidateJournalDetailsData } from "../../../utils/erp/gl/load-validate-journal-details-data";

test("user can find a journal batch and validate its details", async ({
  page,
}) => {
  test.setTimeout(60_000);

  const runProfile = requireRunProfile();

  // Load the journal identifier and environment-specific expected values.
  const journalDataFilePath = path.join(
    runProfile.testDataPath,
    "gl",
    "validate-journal-details.json",
  );

  const journalData = loadValidateJournalDetailsData(journalDataFilePath);

  // Initialize the workflow and page objects used by the scenario.
  const authentication = new AuthenticationWorkflow(
    page,
    runProfile.user("standardUser"),
  );
  const navigatorPage = new FusionNavigatorPage(page);
  const manageJournalsPage = new ManageJournalsPage(page);
  const editJournalPage = new EditJournalPage(page);

  // Authenticate and navigate to Manage Journals.
  await authentication.login();
  await navigatorPage.goToManageJournalsPage();

  // Locate and open the requested journal batch.
  await manageJournalsPage.searchForJournalBatch(journalData.journalBatchName);
  await manageJournalsPage.openJournalBatch(journalData.journalBatchName);

  // Validate the selected journal against the expected data.
  await editJournalPage.waitForEditJournalPage();
  await editJournalPage.verifyJournalBatchName(journalData.journalBatchName);
  await editJournalPage.verifyBalanceType(journalData.expectedBalanceType);
  await editJournalPage.verifyCategory(journalData.expectedCategory);
});
