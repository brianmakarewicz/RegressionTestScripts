import fs from "node:fs";
import path from "node:path";
import { type ValidateJournalDetailsData } from "../../../types/erp/gl/validate-journal-details-data";

// Runtime JSON shape and primitive field readers
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

/**
 * Loads and validates environment-specific journal-detail expectations before UI work.
 */
export function loadValidateJournalDetailsData(
  filePath: string,
): ValidateJournalDetailsData {
  if (!filePath.trim()) {
    throw new Error("Validate Journal Details data file path is required");
  }

  // Treat relative test-data paths as relative to the repository root.
  const resolvedFilePath = path.resolve(process.cwd(), filePath);

  if (!fs.existsSync(resolvedFilePath)) {
    throw new Error(
      `Validate Journal Details data file was not found: ${resolvedFilePath}`,
    );
  }

  let parsedData: unknown;

  try {
    parsedData = JSON.parse(fs.readFileSync(resolvedFilePath, "utf8"));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Validate Journal Details data file contains invalid JSON: ${message}`,
    );
  }

  if (!isJsonObject(parsedData)) {
    throw new Error("Validate Journal Details data must be a JSON object");
  }

  // Collect field-level issues so the caller receives one complete error report.
  const errors: string[] = [];

  const journalData: ValidateJournalDetailsData = {
    journalBatchName: readRequiredString(
      parsedData.journalBatchName,
      "journalBatchName",
      errors,
    ),
    expectedBalanceType: readRequiredString(
      parsedData.expectedBalanceType,
      "expectedBalanceType",
      errors,
    ),
    expectedCategory: readRequiredString(
      parsedData.expectedCategory,
      "expectedCategory",
      errors,
    ),
  };

  // Throw once after all independent validation rules have been evaluated.
  if (errors.length > 0) {
    throw new Error(
      `Validate Journal Details data validation failed:\n- ${errors.join("\n- ")}`,
    );
  }

  return journalData;
}
