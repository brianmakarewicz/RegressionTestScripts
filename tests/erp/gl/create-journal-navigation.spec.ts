import { test } from '@playwright/test';
import { FusionLoginPage } from '../../../pages/common/fusion-login.page';
import { FusionNavigatorPage } from '../../../pages/common/fusion-navigator.page';

test('user can navigate to the Create Journal page', async ({ page }) => {
  const loginPage = new FusionLoginPage(page);
  const navigatorPage = new FusionNavigatorPage(page);

  await loginPage.goto();
  await loginPage.login();
  await loginPage.waitForFusionHomePage();
  await navigatorPage.goToCreateJournalPage();
  
});