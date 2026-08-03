/** Balance types supported by the current Create Journal automation. */
export type JournalBalanceType = "Actual" | "Encumbrance";

/**
 * Defines one account line entered in the Oracle journal grid.
 * Amounts remain strings so their source formatting can be entered in the UI.
 */
export interface CreateJournalLineData {
  account: string;
  /** Exactly one of debit or credit must be supplied for each line. */
  debit?: string;
  credit?: string;
  description: string;
}

/** Defines the environment-specific input required to create a manual journal. */
export interface CreateJournalData {
  /** Combined with a timestamp at runtime to create a unique batch name. */
  batchNamePrefix: string;
  batchDescription: string;
  balanceType: JournalBalanceType;
  accountingPeriod: string;
  attachmentFilePath: string;
  ledger: string;
  category: string;
  lines: CreateJournalLineData[];
}
