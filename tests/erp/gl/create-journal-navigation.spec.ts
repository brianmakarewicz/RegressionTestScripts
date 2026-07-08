import { test } from '@playwright/test';
import { AuthenticationWorkflow } from '../../../workflows/authentication.workflow';
import { FusionNavigatorPage } from '../../../pages/common/fusion-navigator.page';

test('user can navigate to the Create Journal page', async ({ page }) => {
  const authentication = new AuthenticationWorkflow(page);
  const navigatorPage = new FusionNavigatorPage(page);

  await authentication.login();
  await navigatorPage.goToCreateJournalPage();
});