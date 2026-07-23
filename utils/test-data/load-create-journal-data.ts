import fs from "node:fs";
import path from "node:path";
import {
  type CreateJournalData,
  type CreateJournalLineData,
  type JournalBalanceType,
} from "../../types/erp/gl/create-journal-data";

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

function readOptionalAmount(
  value: unknown,
  fieldName: string,
  errors: string[],
): string | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (typeof value !== "string" || value.trim() === "") {
    errors.push(`${fieldName} must be a non-empty string when provided`);
    return undefined;
  }

  const amount = value.trim();
  const numericAmount = Number(amount.replaceAll(",", ""));

  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    errors.push(`${fieldName} must contain a positive numeric amount`);
  }

  return amount;
}

function readJournalLines(
  value: unknown,
  errors: string[],
): CreateJournalLineData[] {
  if (!Array.isArray(value) || value.length < 2) {
    errors.push("lines must contain at least two journal lines");
    return [];
  }

  return value.map((line, index) => {
    const fieldName = `lines[${index}]`;

    if (!isJsonObject(line)) {
      errors.push(`${fieldName} must be an object`);
      return {
        account: "",
        description: "",
      };
    }

    const debit = readOptionalAmount(
      line.debit,
      `${fieldName}.debit`,
      errors,
    );
    const credit = readOptionalAmount(
      line.credit,
      `${fieldName}.credit`,
      errors,
    );

    if ((debit === undefined) === (credit === undefined)) {
      errors.push(
        `${fieldName} must provide either debit or credit, but not both`,
      );
    }

    return {
      account: readRequiredString(
        line.account,
        `${fieldName}.account`,
        errors,
      ),
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

function validateBalancedJournal(
  lines: CreateJournalLineData[],
  errors: string[],
): void {
  const totalDebits = lines.reduce(
    (total, line) =>
      total + Number((line.debit ?? "0").replaceAll(",", "")),
    0,
  );
  const totalCredits = lines.reduce(
    (total, line) =>
      total + Number((line.credit ?? "0").replaceAll(",", "")),
    0,
  );

  if (
    Number.isFinite(totalDebits) &&
    Number.isFinite(totalCredits) &&
    Math.abs(totalDebits - totalCredits) > 0.000_001
  ) {
    errors.push(
      `journal lines are not balanced: debits=${totalDebits}, credits=${totalCredits}`,
    );
  }
}

export function loadCreateJournalData(filePath: string): CreateJournalData {
  if (!filePath.trim()) {
    throw new Error("Create Journal data file path is required");
  }

  const resolvedFilePath = path.resolve(process.cwd(), filePath);

  if (!fs.existsSync(resolvedFilePath)) {
    throw new Error(
      `Create Journal data file was not found: ${resolvedFilePath}`,
    );
  }

  let parsedData: unknown;

  try {
    parsedData = JSON.parse(fs.readFileSync(resolvedFilePath, "utf8"));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Create Journal data file contains invalid JSON: ${message}`,
    );
  }

  if (!isJsonObject(parsedData)) {
    throw new Error("Create Journal data must be a JSON object");
  }

  const errors: string[] = [];
  const lines = readJournalLines(parsedData.lines, errors);

  const journalData: CreateJournalData = {
    batchNamePrefix: readRequiredString(
      parsedData.batchNamePrefix,
      "batchNamePrefix",
      errors,
    ),
    batchDescription: readRequiredString(
      parsedData.batchDescription,
      "batchDescription",
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
    category: readRequiredString(parsedData.category, "category", errors),
    lines,
  };

  validateBalancedJournal(lines, errors);

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
      `Create Journal data validation failed:\n- ${errors.join("\n- ")}`,
    );
  }

  return journalData;
}
