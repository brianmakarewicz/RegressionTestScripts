import fs from "node:fs";
import path from "node:path";
import { type JournalReversalData } from "../../types/erp/gl/journal-reversal-data";

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

/** Loads and validates the environment-specific source journal for GL-08. */
export function loadJournalReversalData(
  filePath: string,
): JournalReversalData {
  if (!filePath.trim()) {
    throw new Error("Journal Reversal data file path is required");
  }

  const resolvedFilePath = path.resolve(process.cwd(), filePath);

  if (!fs.existsSync(resolvedFilePath)) {
    throw new Error(
      `Journal Reversal data file was not found: ${resolvedFilePath}`,
    );
  }

  let parsedData: unknown;

  try {
    parsedData = JSON.parse(fs.readFileSync(resolvedFilePath, "utf8"));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Journal Reversal data file contains invalid JSON: ${message}`,
    );
  }

  if (!isJsonObject(parsedData)) {
    throw new Error("Journal Reversal data must be a JSON object");
  }

  const errors: string[] = [];
  const journalData: JournalReversalData = {
    sourceJournalBatchName: readRequiredString(
      parsedData.sourceJournalBatchName,
      "sourceJournalBatchName",
      errors,
    ),
    ledger: readRequiredString(parsedData.ledger, "ledger", errors),
  };

  if (errors.length > 0) {
    throw new Error(
      `Journal Reversal data validation failed:\n- ${errors.join("\n- ")}`,
    );
  }

  return journalData;
}
