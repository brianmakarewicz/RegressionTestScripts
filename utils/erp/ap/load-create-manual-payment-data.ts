import fs from "node:fs";
import path from "node:path";

import {
  type CreateManualPaymentData,
} from "../../../types/erp/ap/create-manual-payment-data";

export function loadCreateManualPaymentData(
  dataFilePath: string,
): CreateManualPaymentData {

  const resolvedPath =
    path.resolve(dataFilePath);

  if (
    !fs.existsSync(resolvedPath)
  ) {
    throw new Error(
      `Manual payment test-data file was not found: ${resolvedPath}`,
    );
  }

  const rawData =
    fs.readFileSync(
      resolvedPath,
      "utf-8",
    );

  const data =
    JSON.parse(
      rawData,
    ) as CreateManualPaymentData;

  validateCreateManualPaymentData(
    data,
  );

  return data;
}


/*
 * ============================================================
 * VALIDATE TEST DATA
 * ============================================================
 */

function validateCreateManualPaymentData(
  data: CreateManualPaymentData,
): void {

  const requiredFields: Array<
    keyof Omit<
      CreateManualPaymentData,
      "paymentDocument" | "invoices" | "supplierSite"
    >
  > = [
    "businessUnit",
    "supplier",
    "description",
    "paymentDate",
    "disbursementBankAccount",
    "paymentMethod",
    "paymentProcessProfile",
  ];

  for (
    const field
    of requiredFields
  ) {

    const value =
      data[field];

    if (
      typeof value !== "string"
      || value.trim() === ""
    ) {
      throw new Error(
        `Required manual-payment field is missing: ${field}`,
      );
    }
  }

  // Supplier Site can be null when Oracle does not require a site.
  if (
    data.supplierSite !== null
    && (
      typeof data.supplierSite !== "string"
      || data.supplierSite.trim() === ""
    )
  ) {
    throw new Error("supplierSite must be a non-empty string or null.");
  }

  /*
   * At least one invoice must be supplied.
   */

  if (
    !Array.isArray(
      data.invoices,
    )
    || data.invoices.length === 0
  ) {
    throw new Error(
      "At least one invoice is required in manual-payment test data.",
    );
  }

  /*
   * Validate each invoice.
   */

  for (
    const [index, invoice]
    of data.invoices.entries()
  ) {

    if (
      typeof invoice.invoiceNumber
        !== "string"
      || invoice.invoiceNumber.trim()
        === ""
    ) {
      throw new Error(
        `Required invoiceNumber is missing for invoices[${index}].`,
      );
    }
  }

  /*
   * AP-07 states Payment Document is
   * required for Check payments.
   */

  if (
    data.paymentMethod === "Check"
    && (
      !data.paymentDocument
      || data.paymentDocument.trim()
        === ""
    )
  ) {
    throw new Error(
      "paymentDocument is required when paymentMethod is Check.",
    );
  }
}