import path from "node:path";
import { expect, test } from "@playwright/test";
import { env, requireTestDataAlias } from "../../../config/environment";
import { FusionNavigatorPage } from "../../../pages/common/fusion-navigator.page";
import { CreateJournalPage } from "../../../pages/erp/gl/create-journal.page";
import { EditJournalPage } from "../../../pages/erp/gl/edit-journal.page";
import { ManageJournalsPage } from "../../../pages/erp/gl/manage-journals.page";
import { loadCreateInterfundJournalData } from "../../../utils/erp/gl/load-create-interfund-journal-data";
import { AuthenticationWorkflow } from "../../../workflows/authentication.workflow";

test("GL 4.3.1 - user can create and submit an interfund journal", async ({
  page,
}, testInfo) => {
  test.setTimeout(360_000);

  const dataFilePath = path.join(
    "test-data",
    "clients",
    requireTestDataAlias(),
    env.environment,
    "gl",
    "create-interfund-journal.json",
  );
  const journalData = loadCreateInterfundJournalData(dataFilePath);
  const journalBatchName = `${journalData.batchNamePrefix}_${Date.now()}`;

  await testInfo.attach("GL 4.3.1 journal handoff", {
    body: JSON.stringify(
      {
        journalBatchName,
        ledger: journalData.ledger,
        accountingPeriod: journalData.accountingPeriod,
        originalLines: journalData.lines.map(({ account, fund }) => ({
          account,
          fund,
        })),
      },
      null,
      2,
    ),
    contentType: "application/json",
  });

  console.log(`GL 4.3.1 Journal Batch Name: ${journalBatchName}`);

  const authentication = new AuthenticationWorkflow(page);
  const navigatorPage = new FusionNavigatorPage(page);
  const createJournalPage = new CreateJournalPage(page);
  const manageJournalsPage = new ManageJournalsPage(page);
  const editJournalPage = new EditJournalPage(page);

  await authentication.login();
  await navigatorPage.goToCreateJournalPage();

  await createJournalPage.waitForCreateJournalPage();
  await createJournalPage.enterJournalBatchName(journalBatchName);
  await createJournalPage.enterBatchDescription(journalBatchName);
  await createJournalPage.selectBalanceType(journalData.balanceType);
  await createJournalPage.selectAccountingPeriod(journalData.accountingPeriod);
  await createJournalPage.enterJournalName(journalBatchName);
  await createJournalPage.enterJournalDescription(journalBatchName);
  await createJournalPage.selectLedger(journalData.ledger);
  await createJournalPage.selectCategory(journalData.category);
  await createJournalPage.commitCategory(journalData.category);
  await createJournalPage.showJournalDetails();
  await createJournalPage.chooseJournalAttachmentFile(
    journalData.attachmentFilePath,
  );
  await createJournalPage.verifyCategory(journalData.category);

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

  await createJournalPage.save();
  await createJournalPage.completeJournal();
  await createJournalPage.postJournal();
  await createJournalPage.showJournalBatchDetails();
  await createJournalPage.openActionLog();
  await createJournalPage.verifyActionLogContainsAction(
    "Sent for approval with posting",
  );

  // Exit to Journals, then open Manage Journals from Tasks so the assignment
  // check reloads the submitted journal through its normal workspace path.
  await createJournalPage.returnToJournalsWorkspace();
  await navigatorPage.goToManageJournalsFromTasks();

  const maximumAssignmentChecks = 6;
  let approverAssigned = false;

  for (let attempt = 1; attempt <= maximumAssignmentChecks; attempt += 1) {
    // Oracle creates approval assignments asynchronously after submission.
    await page.waitForTimeout(10_000);
    await manageJournalsPage.searchForJournalBatch(journalBatchName);
    // The exact result is present at this point; allow the ADF results table
    // to settle before opening it so a subsequent assignment retry cannot
    // appear to skip the returned row.
    await page.waitForTimeout(3_000);
    await manageJournalsPage.openJournalBatch(journalBatchName);
    await editJournalPage.waitForEditJournalPage();
    await editJournalPage.showJournalBatchDetails();
    await editJournalPage.openActionLog();

    approverAssigned = await editJournalPage.hasActionLogAction("Assigned to");

    if (approverAssigned) {
      break;
    }

    if (attempt < maximumAssignmentChecks) {
      await editJournalPage.returnToManageJournals();
    }
  }

  expect(
    approverAssigned,
    `Journal ${journalBatchName} was not assigned to an approver after ${maximumAssignmentChecks} checks`,
  ).toBe(true);
});
