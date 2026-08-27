import fs from "node:fs";
import path from "node:path";
import { type RunAutoReverseJournalData } from "../../../types/erp/gl/run-autoreverse-journal-data";

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

/** Loads and validates environment-specific AutoReverse test data. */
export function loadRunAutoReverseJournalData(
  filePath: string,
): RunAutoReverseJournalData {
  if (!filePath.trim()) {
    throw new Error("Run AutoReverse Journal data file path is required");
  }

  const resolvedFilePath = path.resolve(process.cwd(), filePath);

  if (!fs.existsSync(resolvedFilePath)) {
    throw new Error(
      `Run AutoReverse Journal data file was not found: ${resolvedFilePath}`,
    );
  }

  let parsedData: unknown;

  try {
    parsedData = JSON.parse(fs.readFileSync(resolvedFilePath, "utf8"));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Run AutoReverse Journal data file contains invalid JSON: ${message}`,
    );
  }

  if (!isJsonObject(parsedData)) {
    throw new Error("Run AutoReverse Journal data must be a JSON object");
  }

  const errors: string[] = [];
  const data: RunAutoReverseJournalData = {
    journalBatchName: readRequiredString(
      parsedData.journalBatchName,
      "journalBatchName",
      errors,
    ),
    ledger: readRequiredString(parsedData.ledger, "ledger", errors),
    dataAccessSet: readRequiredString(
      parsedData.dataAccessSet,
      "dataAccessSet",
      errors,
    ),
    reversalPeriod: readRequiredString(
      parsedData.reversalPeriod,
      "reversalPeriod",
      errors,
    ),
    category: readRequiredString(parsedData.category, "category", errors),
    reversalMethod: readRequiredString(
      parsedData.reversalMethod,
      "reversalMethod",
      errors,
    ),
  };

  if (errors.length > 0) {
    throw new Error(
      `Run AutoReverse Journal data validation failed:\n- ${errors.join("\n- ")}`,
    );
  }

  return data;
}
