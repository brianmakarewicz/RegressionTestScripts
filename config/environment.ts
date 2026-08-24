/**
 * Loads the client- and environment-specific Oracle configuration for a test run.
 */
import dotenv from 'dotenv';
import path from 'path';

// These selectors must exist before loading the environment-specific file.
const clientAlias = process.env.CLIENT_ALIAS?.toLowerCase();
const environment = process.env.ENVIRONMENT?.toLowerCase();

// Fail early when the test runner has not selected a client and environment.
if (!clientAlias) {
  throw new Error('CLIENT_ALIAS is required. Example: c001');
}

if (!environment) {
  throw new Error('ENVIRONMENT is required. Example: dev');
}

// Resolve the selected file using environments/.env.<client>.<environment>.
const envFilePath = path.resolve(
  process.cwd(),
  'environments',
  `.env.${clientAlias}.${environment}`
);

// Load Oracle connection values while preserving values already set by the process.
dotenv.config({ path: envFilePath });

// Expose the selected environment metadata and Oracle connection settings.
export const env = {
  clientAlias,
  environment,
  baseUrl: process.env.ORACLE_BASE_URL,
  username: process.env.ORACLE_USERNAME,
  password: process.env.ORACLE_PASSWORD,
  envFilePath,
};
