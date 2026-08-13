import fs from "node:fs";
import path from "node:path";
import { type InquireOnDetailBalancesData } from "../../types/erp/gl/inquire-on-detail-balances-data";

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

function readOptionalString(
  value: unknown,
  fieldName: string,
  errors: string[],
): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "string" || value.trim() === "") {
    errors.push(`${fieldName} must be a non-empty string when provided`);
    return undefined;
  }

  return value.trim();
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
    currency: readOptionalString(parsedData.currency, "currency", errors),
    currencyType: readOptionalString(
      parsedData.currencyType,
      "currencyType",
      errors,
    ),
    scenario: readOptionalString(parsedData.scenario, "scenario", errors),
    legalEntity: readOptionalString(
      parsedData.legalEntity,
      "legalEntity",
      errors,
    ),
    sbu: readOptionalString(parsedData.sbu, "sbu", errors),
    region: readOptionalString(parsedData.region, "region", errors),
    costCenter: readOptionalString(
      parsedData.costCenter,
      "costCenter",
      errors,
    ),
    naturalAccount: readOptionalString(
      parsedData.naturalAccount,
      "naturalAccount",
      errors,
    ),
    intercompany: readOptionalString(
      parsedData.intercompany,
      "intercompany",
      errors,
    ),
    future1: readOptionalString(parsedData.future1, "future1", errors),
  };

  if (errors.length > 0) {
    throw new Error(
      `Inquire on Detail Balances data validation failed:\n- ${errors.join("\n- ")}`,
    );
  }

  return detailBalancesData;
}
