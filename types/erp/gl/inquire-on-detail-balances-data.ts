/** Defines the criteria used to inquire on General Ledger detail balances. */
export interface InquireOnDetailBalancesData {
  ledgerOrLedgerSet: string;
  fromAccountingPeriod: string;
  toAccountingPeriod: string;
  segmentDefaults: Record<string, string>;
}
