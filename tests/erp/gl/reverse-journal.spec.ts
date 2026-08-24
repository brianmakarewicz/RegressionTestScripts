import path from "node:path";
import { test } from "@playwright/test";
import { env, requireTestDataAlias } from "../../../config/environment";
import { FusionNavigatorPage } from "../../../pages/common/fusion-navigator.page";
import { EditJournalPage } from "../../../pages/erp/gl/edit-journal.page";
import { ManageJournalsPage } from "../../../pages/erp/gl/manage-journals.page";
import { loadJournalReversalData } from "../../../utils/erp/gl/load-journal-reversal-data";
import { AuthenticationWorkflow } from "../../../workflows/authentication.workflow";

test("GL-08 - user can reverse a journal and submit it for posting", async (
  { page },
  testInfo,
) => {
  test.setTimeout(300_000);

  const journalDataFilePath = path.join(
    "test-data",
    "clients",
    requireTestDataAlias(),
    env.environment,
    "gl",
    "journal-reversal.json",
  );
  const journalData = loadJournalReversalData(journalDataFilePath);

  const authentication = new AuthenticationWorkflow(page);
  const navigatorPage = new FusionNavigatorPage(page);
  const manageJournalsPage = new ManageJournalsPage(page);
  const editJournalPage = new EditJournalPage(page);

  // Sign in using the selected initial environment (demo/dev for this test).
  await authentication.login();
  await navigatorPage.goToManageJournalsPage();

  // Stop before making changes if the configured source journal was consumed.
  await manageJournalsPage.searchForJournalBatch(
    journalData.sourceJournalBatchName,
  );
  await manageJournalsPage.verifySourceJournalIsReversible(
    journalData.sourceJournalBatchName,
    journalData.ledger,
  );

  // Capture the stable Manual journal ID used to locate its future reversal.
  const sourceJournalName = await manageJournalsPage.getJournalNameForLedger(
    journalData.sourceJournalBatchName,
    journalData.ledger,
  );
  const sourceJournalId = sourceJournalName.match(/\bManual\s+(\d+)\b/i)?.[1];

  if (!sourceJournalId) {
    throw new Error(
      `Expected journal name to contain "Manual <ID>", but found: ${sourceJournalName}`,
    );
  }

  console.log(`Source Journal ID: ${sourceJournalId}`);
  await testInfo.attach("GL-08 source journal", {
    body: JSON.stringify(
      {
        batchName: journalData.sourceJournalBatchName,
        journalName: sourceJournalName,
        journalId: sourceJournalId,
        ledger: journalData.ledger,
      },
      null,
      2,
    ),
    contentType: "application/json",
  });

  // Open the exact primary-ledger journal for the next iterative slice.
  await manageJournalsPage.openJournalForLedger(
    journalData.sourceJournalBatchName,
    journalData.ledger,
  );
  await editJournalPage.waitForEditJournalPage();
  await editJournalPage.verifyJournalBatchName(
    journalData.sourceJournalBatchName,
  );
  await editJournalPage.verifyLedger(journalData.ledger);

  // Configure and save the tester-selected reversal options. This iteration
  // deliberately stops before Journal Actions > Reverse consumes the journal.
  await editJournalPage.showJournalDetails();
  await editJournalPage.openReversalTab();
  await editJournalPage.selectReversalPeriod(journalData.reversalPeriod);
  await editJournalPage.selectReversalMethod(journalData.reversalMethod);
  await editJournalPage.saveJournal();

  await editJournalPage.verifyReversalPeriod(journalData.reversalPeriod);
  await editJournalPage.verifyReversalMethod(journalData.reversalMethod);
  await editJournalPage.verifyReversalStatus("Not reversed");

  // Consume the configured source journal by creating its next-period
  // reversal. Approval remains outside this iteration.
  const reversalProcessId = await editJournalPage.reverseJournal();

  console.log(`Reversal process ID: ${reversalProcessId}`);
  await testInfo.attach("GL-08 reversal process ID", {
    body: reversalProcessId,
    contentType: "text/plain",
  });

  await editJournalPage.returnToManageJournals();

  const reversalBatchName =
    await manageJournalsPage.waitForUnpostedReversalJournal({
      sourceJournalId,
      ledger: journalData.ledger,
      reversalPeriod: journalData.reversalPeriod,
      processId: reversalProcessId,
    });

  console.log(`Reversal Journal Batch: ${reversalBatchName}`);
  await testInfo.attach("GL-08 reversal journal batch", {
    body: reversalBatchName,
    contentType: "text/plain",
  });

  // Select the generated primary-ledger reversal and submit Post Batch. What
  // happens after submission is environment-specific and outside this test.
  await manageJournalsPage.selectReversalJournalForPosting(
    sourceJournalId,
    journalData.ledger,
  );
  await manageJournalsPage.postSelectedReversalJournalBatch();
});
