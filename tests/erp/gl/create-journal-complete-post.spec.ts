import path from "node:path";
import { test } from "@playwright/test";
import { env, requireTestDataAlias } from "../../../config/environment";
import { AuthenticationWorkflow } from "../../../workflows/authentication.workflow";
import { FusionNavigatorPage } from "../../../pages/common/fusion-navigator.page";
import { CreateJournalPage } from "../../../pages/erp/gl/create-journal.page";
import { loadCreateJournalData } from "../../../utils/erp/gl/load-create-journal-data";

test("user can create, complete, and post a journal", async ({ page }) => {
  test.setTimeout(180_000);

  // Load environment-specific scenario data and generate a unique batch name.
  const journalDataFilePath = path.join(
    "test-data",
    "clients",
    requireTestDataAlias(),
    env.environment,
    "gl",
    "create-journal.json",
  );
  const journalData = loadCreateJournalData(journalDataFilePath);
  const journalBatchName = `${journalData.batchNamePrefix}_${Date.now()}`;
  console.log(`Journal Batch Name: ${journalBatchName}`);

  // Initialize the workflow and page objects used by the scenario.
  const authentication = new AuthenticationWorkflow(page);
  const navigatorPage = new FusionNavigatorPage(page);
  const createJournalPage = new CreateJournalPage(page);

  // Authenticate and navigate to Create Journal.
  await authentication.login();
  await navigatorPage.goToCreateJournalPage();

  // Enter the journal batch and header information.
  await createJournalPage.waitForCreateJournalPage();
  await createJournalPage.enterJournalBatchName(journalBatchName);
  await createJournalPage.enterBatchDescription(journalData.batchDescription);
  await createJournalPage.selectBalanceType(journalData.balanceType);
  await createJournalPage.selectAccountingPeriod(journalData.accountingPeriod);
  await createJournalPage.chooseAttachmentFile(
    journalData.attachmentFilePath,
  );
  await createJournalPage.selectLedger(journalData.ledger);
  await createJournalPage.selectCategory(journalData.category);

  // Enter the balanced debit and credit lines supplied by the data file.
  for (const [index, line] of journalData.lines.entries()) {
    const lineNumber = index + 1;

    await createJournalPage.enterJournalLineAccount(lineNumber, line.account);

    if (line.debit !== undefined) {
      await createJournalPage.enterJournalLineDebit(lineNumber, line.debit);
    }

    if (line.credit !== undefined) {
      await createJournalPage.enterJournalLineCredit(lineNumber, line.credit);
    }

    await createJournalPage.enterJournalLineDescription(
      lineNumber,
      line.description,
    );
  }

  // Save, complete, and submit the journal for posting.
  await createJournalPage.save();
  await createJournalPage.completeJournal();
  await createJournalPage.postJournal();
});
