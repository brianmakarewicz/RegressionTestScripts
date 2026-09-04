import path from "node:path";
import { test } from "@playwright/test";
import { requireRunProfile } from "../../../config/run-profile";
import { AuthenticationWorkflow } from "../../../workflows/authentication.workflow";
import { FusionNavigatorPage } from "../../../pages/common/fusion-navigator.page";
import { JournalApprovalsPage } from "../../../pages/erp/gl/journal-approvals.page";
import { ManageJournalsPage } from "../../../pages/erp/gl/manage-journals.page";
import { EditJournalPage } from "../../../pages/erp/gl/edit-journal.page";
import { loadWithdrawDeleteJournalsData } from "../../../utils/erp/gl/load-withdraw-delete-journals-data";

test("user can withdraw and delete a journal batch", async ({ page }) => {
  test.setTimeout(180_000);

  const runProfile = requireRunProfile();
  const journalDataFilePath = path.join(
    runProfile.testDataPath,
    "gl",
    "withdraw-delete-journals.json",
  );
  const { journalBatchName } =
    loadWithdrawDeleteJournalsData(journalDataFilePath);

  // Initialize the workflow and page objects used by the scenario.
  const authentication = new AuthenticationWorkflow(
    page,
    runProfile.user("standardUser"),
  );
  const navigatorPage = new FusionNavigatorPage(page);
  const journalApprovalsPage = new JournalApprovalsPage(page);
  const manageJournalsPage = new ManageJournalsPage(page);
  const editJournalPage = new EditJournalPage(page);

  // Find the batch in the approval workspace and withdraw it from approval.
  await authentication.login();
  await navigatorPage.goToManageApprovalsForJournalsPage();

  await journalApprovalsPage.selectPendingApprovalFromOthersTab();

  await journalApprovalsPage.searchForJournalBatch(journalBatchName);

  await journalApprovalsPage.selectJournalBatch(journalBatchName);

  await journalApprovalsPage.withdrawSelectedJournalBatch(journalBatchName);

  await journalApprovalsPage.clickDone();

  // Open the withdrawn batch from Manage Journals and delete it.
  await navigatorPage.goToManageJournalsPage();

  await manageJournalsPage.searchForJournalBatch(journalBatchName);

  await manageJournalsPage.openJournalBatch(journalBatchName);

  await editJournalPage.waitForEditJournalPage();

  await editJournalPage.deleteJournalBatch();

  // Search again to confirm the batch no longer exists.
  await manageJournalsPage.verifyJournalBatchWasDeleted(journalBatchName);
});
