/** Defines the criteria used to inquire on General Ledger detail balances. */
export interface InquireOnDetailBalancesData {
  ledgerOrLedgerSet: string;
  fromAccountingPeriod: string;
  toAccountingPeriod: string;
  currency?: string;
  currencyType?: string;
  scenario?: string;
  legalEntity?: string;
  sbu?: string;
  region?: string;
  costCenter?: string;
  naturalAccount?: string;
  intercompany?: string;
  future1?: string;
}
