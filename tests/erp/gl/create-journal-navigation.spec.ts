import { test } from '@playwright/test';
import { AuthenticationWorkflow } from '../../../workflows/authentication.workflow';
import { FusionNavigatorPage } from '../../../pages/common/fusion-navigator.page';
import { CreateJournalPage } from '../../../pages/erp/gl/create-journal.page';

test('user can enter Create Journal header information and attach a file', async ({ page }) => {
  const authentication = new AuthenticationWorkflow(page);
  const navigatorPage = new FusionNavigatorPage(page);
  const createJournalPage = new CreateJournalPage(page);

  await authentication.login();
  await navigatorPage.goToCreateJournalPage();

  await createJournalPage.waitForCreateJournalPage();
  await createJournalPage.enterJournalBatchName('TEST_BATCH_001');
  await createJournalPage.enterBatchDescription('TEST_BATCH_DESCRIPTION_001');
  await createJournalPage.enterAccountingPeriod('Oct-25');
  await createJournalPage.chooseAttachmentFile('test-data/attachments/TestFile.example.txt');
  await createJournalPage.enterAccountingDate('10/31/2025');
});
