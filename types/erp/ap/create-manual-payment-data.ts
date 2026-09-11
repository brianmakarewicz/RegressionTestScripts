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
  supplierSite: string;
  description: string;
  disbursementBankAccount: string;
  paymentMethod: ManualPaymentMethod;
  paymentProcessProfile: string;
  paymentDocument?: string;
  invoices: ManualPaymentInvoiceData[];
}