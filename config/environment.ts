/**
 * Loads the client- and environment-specific Oracle configuration for a test run.
 */
import dotenv from 'dotenv';
import path from 'path';

// These selectors must exist before loading credentials or functional data.
const testDataAlias = process.env.TEST_DATA_ALIAS?.trim().toLowerCase();
const clientAlias = process.env.CLIENT_ALIAS?.trim().toLowerCase();
const environment = process.env.ENVIRONMENT?.toLowerCase();

if (!environment) {
  throw new Error('ENVIRONMENT is required. Example: dev');
}

if (!clientAlias) {
  throw new Error(
    'CLIENT_ALIAS is required for Oracle authentication. Example: c001',
  );
}

// Resolve credentials using the authentication profile and environment.
const envFilePath = path.resolve(
  process.cwd(),
  'environments',
  `.env.${clientAlias}.${environment}`
);

// Load Oracle connection values while preserving values already set by the process.
dotenv.config({ path: envFilePath });

// Expose the selected environment metadata and Oracle connection settings.
export const env = {
  testDataAlias,
  clientAlias,
  environment,
  baseUrl: process.env.ORACLE_BASE_URL,
  username: process.env.ORACLE_USERNAME,
  password: process.env.ORACLE_PASSWORD,
  envFilePath,
};

/** Returns the selected functional test-data alias or fails with guidance. */
export function requireTestDataAlias(): string {
  if (!testDataAlias) {
    throw new Error(
      'TEST_DATA_ALIAS is required for tests that load client JSON data. Example: c001',
    );
  }

  return testDataAlias;
}
