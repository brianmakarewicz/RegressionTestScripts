/**
 * Loads either the selected run profile or the legacy environment settings.
 */
import dotenv from "dotenv";
import path from "node:path";
import { requireRunProfile } from "./run-profile";

const selectedRunProfile = process.env.RUN_PROFILE?.trim();
const runProfile = selectedRunProfile ? requireRunProfile() : undefined;
const clientAlias = process.env.CLIENT_ALIAS?.trim().toLowerCase();
const testDataProfile = process.env.TEST_DATA_ALIAS?.trim().toLowerCase();
const environment = process.env.ENVIRONMENT?.trim().toLowerCase();

if (!runProfile && !environment) {
  throw new Error("ENVIRONMENT is required. Example: dev");
}

if (!runProfile && !clientAlias) {
  throw new Error(
    "CLIENT_ALIAS is required for legacy authentication. Example: demo",
  );
}

const envFilePath = path.resolve(
  process.cwd(),
  "environments",
  `.env.${clientAlias}.${environment}`,
);

if (!runProfile) {
  dotenv.config({ path: envFilePath });
}

export const env = {
  runProfile: runProfile?.name,
  clientAlias: clientAlias ?? "",
  testDataProfile,
  testDataAlias: testDataProfile,
  environment: environment ?? "",
  baseUrl: runProfile?.baseUrl ?? process.env.ORACLE_BASE_URL,
  username: process.env.ORACLE_USERNAME,
  password: process.env.ORACLE_PASSWORD,
  envFilePath,
};

export function requireTestDataProfile(): string {
  if (!testDataProfile) {
    throw new Error(
      "TEST_DATA_ALIAS is required for legacy tests that load client JSON data",
    );
  }

  return testDataProfile;
}

/** Preserves the existing API while tests migrate to test-data profile naming. */
export function requireTestDataAlias(): string {
  if (!testDataProfile) {
    throw new Error(
      "TEST_DATA_ALIAS is required for tests that load client JSON data",
    );
  }

  return testDataProfile;
}
