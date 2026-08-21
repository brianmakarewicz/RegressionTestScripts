/** Defines the environment-specific source journal used by the GL-08 test. */
export interface JournalReversalData {
  /** Existing approved journal batch that has not already been reversed. */
  sourceJournalBatchName: string;
  /** Primary ledger row used to avoid matching a reporting-ledger journal. */
  ledger: string;
  /** Tester-selected accounting period in which Oracle creates the reversal. */
  reversalPeriod: string;
  /** Debit/credit treatment Oracle applies to the generated reversal. */
  reversalMethod: string;
}
