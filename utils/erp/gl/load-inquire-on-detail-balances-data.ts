import fs from "node:fs";
import path from "node:path";
import { type InquireOnDetailBalancesData } from "../../../types/erp/gl/inquire-on-detail-balances-data";

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

function readSegmentDefaults(
  value: unknown,
  errors: string[],
): Record<string, string> {
  if (value === undefined) {
    return {};
  }

  if (!isJsonObject(value)) {
    errors.push("segmentDefaults must be a JSON object when provided");
    return {};
  }

  const segmentDefaults: Record<string, string> = {};

  for (const [label, defaultValue] of Object.entries(value)) {
    const normalizedLabel = label.trim();

    if (!normalizedLabel) {
      errors.push("segmentDefaults labels must be non-empty strings");
      continue;
    }

    if (typeof defaultValue !== "string" || !defaultValue.trim()) {
      errors.push(`segmentDefaults.${label} must be a non-empty string`);
      continue;
    }

    segmentDefaults[normalizedLabel] = defaultValue.trim();
  }

  return segmentDefaults;
}

/** Loads and validates detail-balance criteria before browser interaction. */
export function loadInquireOnDetailBalancesData(
  filePath: string,
): InquireOnDetailBalancesData {
  if (!filePath.trim()) {
    throw new Error("Inquire on Detail Balances data file path is required");
  }

  const resolvedFilePath = path.resolve(process.cwd(), filePath);

  if (!fs.existsSync(resolvedFilePath)) {
    throw new Error(
      `Inquire on Detail Balances data file was not found: ${resolvedFilePath}`,
    );
  }

  let parsedData: unknown;

  try {
    parsedData = JSON.parse(fs.readFileSync(resolvedFilePath, "utf8"));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Inquire on Detail Balances data file contains invalid JSON: ${message}`,
    );
  }

  if (!isJsonObject(parsedData)) {
    throw new Error("Inquire on Detail Balances data must be a JSON object");
  }

  const errors: string[] = [];
  const detailBalancesData: InquireOnDetailBalancesData = {
    ledgerOrLedgerSet: readRequiredString(
      parsedData.ledgerOrLedgerSet,
      "ledgerOrLedgerSet",
      errors,
    ),
    fromAccountingPeriod: readRequiredString(
      parsedData.fromAccountingPeriod,
      "fromAccountingPeriod",
      errors,
    ),
    toAccountingPeriod: readRequiredString(
      parsedData.toAccountingPeriod,
      "toAccountingPeriod",
      errors,
    ),
    segmentDefaults: readSegmentDefaults(parsedData.segmentDefaults, errors),
  };

  if (errors.length > 0) {
    throw new Error(
      `Inquire on Detail Balances data validation failed:\n- ${errors.join("\n- ")}`,
    );
  }

  return detailBalancesData;
}
