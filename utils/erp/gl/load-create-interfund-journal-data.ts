import fs from "node:fs";
import path from "node:path";
import {
  type CreateInterfundJournalData,
  type InterfundJournalLineData,
} from "../../../types/erp/gl/create-interfund-journal-data";
import { type JournalBalanceType } from "../../../types/erp/gl/create-journal-data";

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

function readBalanceType(
  value: unknown,
  errors: string[],
): JournalBalanceType {
  if (value === "Actual" || value === "Encumbrance") {
    return value;
  }

  errors.push('balanceType must be either "Actual" or "Encumbrance"');
  return "Actual";
}

function readAmount(
  value: unknown,
  fieldName: string,
  errors: string[],
): string | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (typeof value !== "string") {
    errors.push(`${fieldName} must be a numeric string when provided`);
    return undefined;
  }

  const amount = value.trim();
  const numericAmount = Number(amount.replaceAll(",", ""));

  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    errors.push(`${fieldName} must contain a positive numeric amount`);
  }

  return amount;
}

function readLines(
  value: unknown,
  errors: string[],
): InterfundJournalLineData[] {
  if (!Array.isArray(value) || value.length !== 2) {
    errors.push("lines must contain exactly two original journal lines");
    return [];
  }

  return value.map((line, index) => {
    const fieldName = `lines[${index}]`;

    if (!isJsonObject(line)) {
      errors.push(`${fieldName} must be an object`);
      return { account: "", fund: "", description: "" };
    }

    const account = readRequiredString(
      line.account,
      `${fieldName}.account`,
      errors,
    );
    const fund = readRequiredString(line.fund, `${fieldName}.fund`, errors);
    const debit = readAmount(line.debit, `${fieldName}.debit`, errors);
    const credit = readAmount(line.credit, `${fieldName}.credit`, errors);

    if ((debit === undefined) === (credit === undefined)) {
      errors.push(`${fieldName} must provide either debit or credit, but not both`);
    }

    const accountSegments = account.split(".");

    if (account && accountSegments.length !== 8) {
      errors.push(`${fieldName}.account must contain exactly eight segments`);
    }

    if (account && fund && accountSegments[0] !== fund) {
      errors.push(
        `${fieldName}.fund must match the first account segment (${accountSegments[0]})`,
      );
    }

    return {
      account,
      fund,
      debit,
      credit,
      description: readRequiredString(
        line.description,
        `${fieldName}.description`,
        errors,
      ),
    };
  });
}

/** Loads and validates the environment-specific GL 4.3.1 data file. */
export function loadCreateInterfundJournalData(
  filePath: string,
): CreateInterfundJournalData {
  const resolvedFilePath = path.resolve(process.cwd(), filePath);

  if (!fs.existsSync(resolvedFilePath)) {
    throw new Error(
      `Create Interfund Journal data file was not found: ${resolvedFilePath}`,
    );
  }

  let parsedData: unknown;

  try {
    parsedData = JSON.parse(fs.readFileSync(resolvedFilePath, "utf8"));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Create Interfund Journal data file contains invalid JSON: ${message}`,
    );
  }

  if (!isJsonObject(parsedData)) {
    throw new Error("Create Interfund Journal data must be a JSON object");
  }

  const errors: string[] = [];
  const lines = readLines(parsedData.lines, errors);
  const journalData: CreateInterfundJournalData = {
    batchNamePrefix: readRequiredString(
      parsedData.batchNamePrefix,
      "batchNamePrefix",
      errors,
    ),
    balanceType: readBalanceType(parsedData.balanceType, errors),
    accountingPeriod: readRequiredString(
      parsedData.accountingPeriod,
      "accountingPeriod",
      errors,
    ),
    attachmentFilePath: readRequiredString(
      parsedData.attachmentFilePath,
      "attachmentFilePath",
      errors,
    ),
    ledger: readRequiredString(parsedData.ledger, "ledger", errors),
    approverDataAccessSet: readRequiredString(
      parsedData.approverDataAccessSet,
      "approverDataAccessSet",
      errors,
    ),
    category: readRequiredString(parsedData.category, "category", errors),
    lines,
  };

  if (lines.length === 2 && lines[0].fund === lines[1].fund) {
    errors.push("the two original journal lines must use different Fund values");
  }

  const totalDebits = lines.reduce(
    (total, line) => total + Number((line.debit ?? "0").replaceAll(",", "")),
    0,
  );
  const totalCredits = lines.reduce(
    (total, line) => total + Number((line.credit ?? "0").replaceAll(",", "")),
    0,
  );

  if (Math.abs(totalDebits - totalCredits) > 0.000_001) {
    errors.push(
      `journal lines are not balanced: debits=${totalDebits}, credits=${totalCredits}`,
    );
  }

  if (journalData.attachmentFilePath) {
    const attachmentPath = path.resolve(
      process.cwd(),
      journalData.attachmentFilePath,
    );

    if (!fs.existsSync(attachmentPath)) {
      errors.push(`attachment file was not found: ${attachmentPath}`);
    }
  }

  if (errors.length > 0) {
    throw new Error(
      `Create Interfund Journal data validation failed:\n- ${errors.join("\n- ")}`,
    );
  }

  return journalData;
}
