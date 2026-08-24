import fs from "node:fs";
import path from "node:path";
import { type RunAutoPostJournalsData } from "../../../types/erp/gl/run-autopost-journals-data";

type JsonObject = Record<string, unknown>;

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readRequiredString(
  value: unknown,
  fieldName: string,
  errors: string[],
): string {
  if (typeof value !== "string" || value.trim() === "") {
    errors.push(`${fieldName} must be a non-empty string`);
    return "";
  }

  return value.trim();
}

/** Loads and validates environment-specific AutoPost test data. */
export function loadRunAutoPostJournalsData(
  filePath: string,
): RunAutoPostJournalsData {
  if (!filePath.trim()) {
    throw new Error("Run AutoPost Journals data file path is required");
  }

  const resolvedFilePath = path.resolve(process.cwd(), filePath);

  if (!fs.existsSync(resolvedFilePath)) {
    throw new Error(
      `Run AutoPost Journals data file was not found: ${resolvedFilePath}`,
    );
  }

  let parsedData: unknown;

  try {
    parsedData = JSON.parse(fs.readFileSync(resolvedFilePath, "utf8"));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Run AutoPost Journals data file contains invalid JSON: ${message}`,
    );
  }

  if (!isJsonObject(parsedData)) {
    throw new Error("Run AutoPost Journals data must be a JSON object");
  }

  const errors: string[] = [];
  const data: RunAutoPostJournalsData = {
    journalBaseName: readRequiredString(
      parsedData.journalBaseName,
      "journalBaseName",
      errors,
    ),
    ledger: readRequiredString(parsedData.ledger, "ledger", errors),
    criteriaSet: readRequiredString(
      parsedData.criteriaSet,
      "criteriaSet",
      errors,
    ),
  };

  if (errors.length > 0) {
    throw new Error(
      `Run AutoPost Journals data validation failed:\n- ${errors.join("\n- ")}`,
    );
  }

  return data;
}
