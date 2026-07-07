import { test } from '@playwright/test';
import { env } from '../../config/environment';

test('loads selected environment configuration', async () => {
  console.log('Client:', env.clientAlias);
  console.log('Environment:', env.environment);
  console.log('URL:', env.baseUrl);
  console.log('Username:', env.username);
  console.log('File:', env.envFilePath);
});