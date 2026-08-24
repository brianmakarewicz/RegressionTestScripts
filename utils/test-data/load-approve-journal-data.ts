import fs from "node:fs";
import path from "node:path";
import { type ApproveJournalData } from "../../types/erp/gl/approve-journal-data";

type JsonObject = Record<string, unknown>;

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Loads and validates the environment-specific journal approval data. */
export function loadApproveJournalData(filePath: string): ApproveJournalData {
  if (!filePath.trim()) {
    throw new Error("Approve Journal data file path is required");
  }

  const resolvedFilePath = path.resolve(process.cwd(), filePath);

  if (!fs.existsSync(resolvedFilePath)) {
    throw new Error(
      `Approve Journal data file was not found: ${resolvedFilePath}`,
    );
  }

  let parsedData: unknown;

  try {
    parsedData = JSON.parse(fs.readFileSync(resolvedFilePath, "utf8"));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Approve Journal data file contains invalid JSON: ${message}`,
    );
  }

  if (!isJsonObject(parsedData)) {
    throw new Error("Approve Journal data must be a JSON object");
  }

  if (
    typeof parsedData.journalBatchName !== "string" ||
    parsedData.journalBatchName.trim() === ""
  ) {
    throw new Error(
      "Approve Journal data validation failed:\n- journalBatchName must be a non-empty string",
    );
  }

  return {
    journalBatchName: parsedData.journalBatchName.trim(),
  };
}
