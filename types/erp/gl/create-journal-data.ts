export type JournalBalanceType = "Actual" | "Encumbrance";

export interface CreateJournalLineData {
  account: string;
  debit?: string;
  credit?: string;
  description: string;
}

export interface CreateJournalData {
  batchNamePrefix: string;
  batchDescription: string;
  balanceType: JournalBalanceType;
  accountingPeriod: string;
  attachmentFilePath: string;
  ledger: string;
  category: string;
  lines: CreateJournalLineData[];
}
