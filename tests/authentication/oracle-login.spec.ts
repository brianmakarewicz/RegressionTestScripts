import { test } from '@playwright/test';
import { AuthenticationWorkflow } from '../../workflows/authentication.workflow'

test.describe('Oracle authentication', () => {
  test('logs in with the selected environment credentials', async ({ page }) => {
    test.setTimeout(120_000);

    const authentication = new AuthenticationWorkflow(page);
    await authentication.login();
  });
});