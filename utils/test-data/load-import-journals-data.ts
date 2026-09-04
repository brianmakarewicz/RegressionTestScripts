import fs from "node:fs";
import path from "node:path";
import { type ImportJournalsData } from "../../types/erp/gl/import-journals-data";

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

/** Loads validated environment-specific Import Journals parameters. */
export function loadImportJournalsData(
  filePath: string,
): ImportJournalsData {
  const resolvedFilePath = path.resolve(process.cwd(), filePath);

  if (!fs.existsSync(resolvedFilePath)) {
    throw new Error(
      `Import Journals data file was not found: ${resolvedFilePath}`,
    );
  }

  let parsedData: unknown;

  try {
    parsedData = JSON.parse(fs.readFileSync(resolvedFilePath, "utf8"));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Import Journals data file contains invalid JSON: ${message}`,
    );
  }

  if (!isJsonObject(parsedData)) {
    throw new Error("Import Journals data must be a JSON object");
  }

  const errors: string[] = [];
  const data: ImportJournalsData = {
    source: readRequiredString(parsedData.source, "source", errors),
    ledger: readRequiredString(parsedData.ledger, "ledger", errors),
  };

  if (errors.length > 0) {
    throw new Error(
      `Import Journals data validation failed:\n- ${errors.join("\n- ")}`,
    );
  }

  return data;
}
