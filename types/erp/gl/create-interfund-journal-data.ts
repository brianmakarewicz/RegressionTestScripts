import { type JournalBalanceType } from "./create-journal-data";

/** Defines one original line entered for the interfund journal scenario. */
export interface InterfundJournalLineData {
  account: string;
  fund: string;
  debit?: string;
  credit?: string;
  description: string;
}

/** Defines the environment-specific input for GL 4.3.1 Iteration 1. */
export interface CreateInterfundJournalData {
  batchNamePrefix: string;
  balanceType: JournalBalanceType;
  accountingPeriod: string;
  attachmentFilePath: string;
  ledger: string;
  category: string;
  lines: InterfundJournalLineData[];
}
