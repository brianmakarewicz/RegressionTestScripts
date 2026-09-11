export type ManualPaymentMethod =
  | "Electronic (ACH)"
  | "Check"
  | "Wire"
  | string;

export interface ManualPaymentInvoiceData {
  invoiceNumber: string;
}

export interface CreateManualPaymentData {
  businessUnit: string;
  supplier: string;
  supplierSite: string | null;
  description: string;
  // Use the date format accepted by the Oracle environment.
  paymentDate: string;
  disbursementBankAccount: string;
  paymentMethod: ManualPaymentMethod;
  paymentProcessProfile: string;
  paymentDocument?: string;
  invoices: ManualPaymentInvoiceData[];
}