/** Defines a journal batch and the values expected during detail validation. */
export interface ValidateJournalDetailsData {
  journalBatchName: string;
  expectedBalanceType: string;
  expectedCategory: string;
}
