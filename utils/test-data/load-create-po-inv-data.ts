import fs from "node:fs";
import path from "node:path";
import {
  type CreateApInvData,
  type CreateApInvLineData,
} from "../../types/erp/ap/create-po-inv-data.ts";

/**
 * Reads an AP invoice JSON file, validates the required fields,
 * and returns the JSON as CreateApInvData.
 */
export function loadCreatePOInvData(jsonFilePath: string): CreateApInvData {
  const resolvedPath = path.resolve(jsonFilePath);

  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`JSON file was not found: ${resolvedPath}`);
  }

  let parsedData: unknown;

  try {
    const jsonText = fs.readFileSync(resolvedPath, "utf-8");
    parsedData = JSON.parse(jsonText);
  } catch (error) {
    throw new Error(
      `Unable to read or parse JSON file "${resolvedPath}": ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }

  if (!isRecord(parsedData)) {
    throw new Error("The JSON file must contain a JSON object.");
  }

  validateRequiredString(parsedData, "poNumber");
  validateRequiredString(parsedData, "invNumber");
  validateRequiredString(parsedData, "description");
  validateRequiredString(parsedData, "requester");

  if (!Array.isArray(parsedData.lines) || parsedData.lines.length === 0) {
    throw new Error(
      'Required field "lines" must contain at least one invoice line.',
    );
  }

  const lines: CreateApInvLineData[] = parsedData.lines.map(
    (line: unknown, index: number) => {
      if (!isRecord(line)) {
        throw new Error(`Invoice line ${index + 1} must be a JSON object.`);
      }

      validateRequiredString(line, "quantity", `Invoice line ${index + 1}`);

      return {
        quantity: line.quantity as string,
        poLineNumber: line.poLineNumber as string,
        trackAsAsset: getOptionalString(line, "trackAsAsset"),
        serialNumber: getOptionalString(line, "serialNumber"),
        assetCatMajor: getOptionalString(line, "assetCatMajor"),
        assetCatMinor: getOptionalString(line, "assetCatMinor"),
        lineType: getOptionalString(line, "assetCatMinor"),
      };
    },
  );

  return {
    poNumber: parsedData.poNumber as string,
    invNumber: parsedData.invNumber as string,
    description: parsedData.description as string,
    requester: parsedData.requester as string,
    amount: getOptionalNumber(parsedData, "amount"),
    invDate: getOptionalString(parsedData, "invDate"),
    lines,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateRequiredString(
  data: Record<string, unknown>,
  fieldName: string,
  location = "Invoice data",
): void {
  const value = data[fieldName];

  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(
      `${location}: required field "${fieldName}" must contain a value.`,
    );
  }
}

function getOptionalString(
  data: Record<string, unknown>,
  fieldName: string,
): string | undefined {
  const value = data[fieldName];

  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (typeof value !== "string") {
    throw new Error(`Optional field "${fieldName}" must be a string.`);
  }

  return value;
}

function getOptionalNumber(
  data: Record<string, unknown>,
  fieldName: string,
): number | undefined {
  const value = data[fieldName];

  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (typeof value !== "number" || Number.isNaN(value)) {
    throw new Error(`Optional field "${fieldName}" must be a number.`);
  }

  return value;
}