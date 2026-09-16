export type PaymentTemplateName = "FFI CHECK" | "FFI ACH" | "FFI WIRE";

export interface PayInvoicesData {
  paymentName: string;
  template: PaymentTemplateName;
  expectedOptions: {
    disbursementBankAccount: string;
    paymentDocument: string;
    paymentProcessProfile: string;
    paymentConversionRateType: string;
  };
}
