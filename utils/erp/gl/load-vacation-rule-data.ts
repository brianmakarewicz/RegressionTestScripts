import fs from "node:fs";
import path from "node:path";
import { type VacationRuleData } from "../../../types/erp/gl/vacation-rule-data";

type JsonObject = Record<string, unknown>;

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Loads and validates the environment-specific vacation-rule test data. */
export function loadVacationRuleData(filePath: string): VacationRuleData {
  const resolvedFilePath = path.resolve(process.cwd(), filePath);

  if (!fs.existsSync(resolvedFilePath)) {
    throw new Error(
      `Vacation Rule data file was not found: ${resolvedFilePath}`,
    );
  }

  let parsedData: unknown;

  try {
    parsedData = JSON.parse(fs.readFileSync(resolvedFilePath, "utf8"));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Vacation Rule data file contains invalid JSON: ${message}`);
  }

  const fields = [
    "userDisplayName",
    "startDate",
    "endDate",
    "delegateToFirstName",
    "delegateToLastName",
  ] as const;
  const errors: string[] = [];
  const values = {} as Record<(typeof fields)[number], string>;

  for (const field of fields) {
    const value = isJsonObject(parsedData) ? parsedData[field] : undefined;

    if (typeof value !== "string" || value.trim() === "") {
      errors.push(`${field} must be a non-empty string`);
    } else {
      values[field] = value.trim();
    }
  }

  if (errors.length > 0) {
    throw new Error(
      `Vacation Rule data validation failed:\n- ${errors.join("\n- ")}`,
    );
  }

  return values;
}
