import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import { type OracleLoginData } from "../../types/common/oracle-login-data";

/** Loads one Oracle login without changing process-wide environment values. */
export function loadOracleLoginData(
  clientAlias: string,
  environment: string,
): OracleLoginData {
  if (!clientAlias.trim()) {
    throw new Error("Oracle login client alias is required");
  }

  if (!environment.trim()) {
    throw new Error("Oracle login environment is required");
  }

  const envFilePath = path.resolve(
    process.cwd(),
    "environments",
    `.env.${clientAlias}.${environment}`,
  );

  if (!fs.existsSync(envFilePath)) {
    throw new Error(
      `Oracle login environment file was not found: ${envFilePath}`,
    );
  }

  const parsedEnvironment = dotenv.parse(fs.readFileSync(envFilePath));
  const requiredValues = {
    baseUrl: parsedEnvironment.ORACLE_BASE_URL?.trim(),
    username: parsedEnvironment.ORACLE_USERNAME?.trim(),
    password: parsedEnvironment.ORACLE_PASSWORD?.trim(),
  };
  const missingKeys = Object.entries(requiredValues)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missingKeys.length > 0) {
    throw new Error(
      `Oracle login environment is missing: ${missingKeys.join(", ")}`,
    );
  }

  return {
    baseUrl: requiredValues.baseUrl!,
    username: requiredValues.username!,
    password: requiredValues.password!,
  };
}
