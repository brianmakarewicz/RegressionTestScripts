import fs from "node:fs";
import path from "node:path";
import type { PayInvoicesData } from "../../../types/erp/ap/pay-invoices-data";

/** Reads and validates AP-08 inputs before any payment process is submitted. */
export function loadPayInvoicesData(filePath: string): PayInvoicesData {
  const resolvedPath = path.resolve(filePath);
  const data = JSON.parse(fs.readFileSync(resolvedPath, "utf8"));
  const object = (value: unknown, name: string): Record<string, any> => {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new Error(`${name} must be an object: ${resolvedPath}`);
    }
    return value as Record<string, any>;
  };
  const text = (value: unknown, name: string): string => {
    if (typeof value !== "string" || !value.trim() || /CHANGE_ME/.test(value)) {
      throw new Error(`${name} must contain a configured value: ${resolvedPath}`);
    }
    return value;
  };
  object(data, "AP-08 input");
  if (!["FFI CHECK", "FFI ACH", "FFI WIRE"].includes(data.template)) throw new Error("template must be FFI CHECK, FFI ACH, or FFI WIRE");
  text(data.paymentName, "paymentName");
  object(data.expectedOptions, "expectedOptions");
  for (const field of ["disbursementBankAccount", "paymentDocument", "paymentProcessProfile", "paymentConversionRateType"]) {
    text(data.expectedOptions[field], `expectedOptions.${field}`);
  }
  return data as PayInvoicesData;
}
