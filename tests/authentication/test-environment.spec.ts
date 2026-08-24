import { test } from '@playwright/test';
import { env } from '../../config/environment';

// Diagnostic smoke test for the selected authentication configuration.
test('loads selected environment configuration', async () => {
  console.log('Authentication profile:', env.clientAlias);
  console.log('Test-data profile:', env.testDataAlias ?? 'Not selected');
  console.log('Environment:', env.environment);
  console.log('URL:', env.baseUrl);
  console.log('Username:', env.username);
  console.log('File:', env.envFilePath);
});
