/** Defines the environment-specific source journal used by the GL-08 test. */
export interface JournalReversalData {
  /** Existing approved journal batch that has not already been reversed. */
  sourceJournalBatchName: string;
  /** Primary ledger row used to avoid matching a reporting-ledger journal. */
  ledger: string;
}
