/** Defines the journal and AutoReverse parameters used by the test. */
export interface RunAutoReverseJournalData {
  /** Exact approved, posted, reversible journal batch. */
  journalBatchName: string;
  /** Primary ledger containing the journal. */
  ledger: string;
  /** Data access set submitted to AutoReverse. */
  dataAccessSet: string;
  /** Period in which Oracle should create the reversal. */
  reversalPeriod: string;
  /** Expected category of the source journal. */
  category: string;
  /** Expected debit and credit treatment configured on the journal. */
  reversalMethod: string;
}
