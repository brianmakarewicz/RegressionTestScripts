import { test } from '@playwright/test';
import { requireRunProfile } from '../../config/run-profile';

// Diagnostic smoke test for the selected authentication configuration.
test('loads selected environment configuration', async () => {
  const runProfile = requireRunProfile();
  const authentication = runProfile.user('standardUser');

  console.log('Run profile:', runProfile.name);
  console.log('Test-data path:', runProfile.testDataPath);
  console.log('URL:', authentication.baseUrl);
  console.log('Username:', authentication.username);
});
