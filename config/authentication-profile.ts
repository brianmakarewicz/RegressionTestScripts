import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

export interface AuthenticationProfile {
  baseUrl: string;
  username: string;
  password: string;
  envFilePath: string;
}

/**
 * Loads a second Oracle authentication profile without modifying process.env.
 * This allows one Playwright test to use isolated browser contexts for
 * different users while retaining the primary test-data selection.
 */
export function loadAuthenticationProfile(
  clientAlias: string,
  environment: string,
): AuthenticationProfile {
  const normalizedAlias = clientAlias.trim().toLowerCase();
  const normalizedEnvironment = environment.trim().toLowerCase();

  if (!/^[a-z0-9_-]+$/.test(normalizedAlias)) {
    throw new Error(`Invalid authentication profile alias: ${clientAlias}`);
  }

  if (!/^[a-z0-9_-]+$/.test(normalizedEnvironment)) {
    throw new Error(`Invalid environment name: ${environment}`);
  }

  const envFilePath = path.resolve(
    process.cwd(),
    "environments",
    `.env.${normalizedAlias}.${normalizedEnvironment}`,
  );

  if (!fs.existsSync(envFilePath)) {
    throw new Error(`Authentication profile not found: ${envFilePath}`);
  }

  const parsed = dotenv.parse(fs.readFileSync(envFilePath));
  const baseUrl = parsed.ORACLE_BASE_URL?.trim();
  const username = parsed.ORACLE_USERNAME?.trim();
  const password = parsed.ORACLE_PASSWORD;

  if (!baseUrl || !username || !password) {
    throw new Error(
      `Authentication profile must define ORACLE_BASE_URL, ORACLE_USERNAME, and ORACLE_PASSWORD: ${envFilePath}`,
    );
  }

  return { baseUrl, username, password, envFilePath };
}
