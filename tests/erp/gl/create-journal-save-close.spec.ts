import { test } from "@playwright/test";
import { AuthenticationWorkflow } from "../../../workflows/authentication.workflow";
import { FusionNavigatorPage } from "../../../pages/common/fusion-navigator.page";
import { CreateJournalPage } from "../../../pages/erp/gl/create-journal.page";

test("user can enter Create Journal header information and attach a file", async ({
  page,
}) => {
  const authentication = new AuthenticationWorkflow(page);
  const navigatorPage = new FusionNavigatorPage(page);
  const createJournalPage = new CreateJournalPage(page);

  await authentication.login();
  await navigatorPage.goToCreateJournalPage();

  await createJournalPage.waitForCreateJournalPage();
  await createJournalPage.enterJournalBatchName(`TEST_BATCH_${Date.now()}`);
  await createJournalPage.enterBatchDescription("TEST_BATCH_DESCRIPTION_001");
  await createJournalPage.selectAccountingPeriod("Oct-25");
  await createJournalPage.chooseAttachmentFile(
    "test-data/attachments/TestFile.example.txt",
  );
  await createJournalPage.selectCategory("Adjustment");

  await createJournalPage.enterJournalLineAccount(
    1,
    "026.00.301.0000.6421101.00000000.00000",
  );
  await createJournalPage.enterJournalLineDebit(1, "5");
  await createJournalPage.enterJournalLineDescription(1, "Description_1");

  await createJournalPage.enterJournalLineAccount(
    2,
    "026.00.000.0000.1130421.00000000.00000",
  );
  await createJournalPage.enterJournalLineCredit(2, "5");
  await createJournalPage.enterJournalLineDescription(2, "Description_2");

  await createJournalPage.saveAndClose();

});
