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

// Authentication normally follows the client alias. A separate profile can
// be selected when another authorized user must act on the same client data.
const authenticationAlias =
  process.env.AUTHENTICATION_ALIAS?.trim().toLowerCase() || clientAlias;

// Resolve credentials using the authentication profile and environment.
const envFilePath = path.resolve(
  process.cwd(),
  'environments',
  `.env.${authenticationAlias}.${environment}`
);

// Load Oracle connection values while preserving values already set by the process.
dotenv.config({ path: envFilePath });

// Expose the selected environment metadata and Oracle connection settings.
export const env = {
  clientAlias,
  authenticationAlias,
  environment,
  baseUrl: process.env.ORACLE_BASE_URL,
  username: process.env.ORACLE_USERNAME,
  password: process.env.ORACLE_PASSWORD,
  envFilePath,
};
