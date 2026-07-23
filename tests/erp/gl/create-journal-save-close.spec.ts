import path from "node:path";
import { test } from "@playwright/test";
import { env } from "../../../config/environment";
import { AuthenticationWorkflow } from "../../../workflows/authentication.workflow";
import { FusionNavigatorPage } from "../../../pages/common/fusion-navigator.page";
import { CreateJournalPage } from "../../../pages/erp/gl/create-journal.page";
import { loadCreateJournalData } from "../../../utils/test-data/load-create-journal-data";

test("user can enter Create Journal header information and attach a file", async ({
  page,
}) => {
  test.setTimeout(180_000);

  const journalDataFilePath = path.join(
    "test-data",
    "clients",
    env.clientAlias,
    env.environment,
    "gl",
    "create-journal.json",
  );
  const journalData = loadCreateJournalData(journalDataFilePath);
  const journalBatchName = `${journalData.batchNamePrefix}_${Date.now()}`;

  const authentication = new AuthenticationWorkflow(page);
  const navigatorPage = new FusionNavigatorPage(page);
  const createJournalPage = new CreateJournalPage(page);

  await authentication.login();
  await navigatorPage.goToCreateJournalPage();

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

  await createJournalPage.saveAndClose();
});
