import { test } from '@playwright/test';
import { requireRunProfile } from '../../config/run-profile';
import { AuthenticationWorkflow } from '../../workflows/authentication.workflow'

test.describe('Oracle authentication', () => {
  test('logs in with the selected environment credentials', async ({ page }) => {
    test.setTimeout(120_000);

    // Exercise the same complete authentication workflow used by ERP tests.
    const authentication = new AuthenticationWorkflow(
      page,
      requireRunProfile().user('standardUser'),
    );
    await authentication.login();
  });
});
