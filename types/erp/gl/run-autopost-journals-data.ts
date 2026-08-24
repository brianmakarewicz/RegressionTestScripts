/** Defines the prepared journal and AutoPost criteria for the test. */
export interface RunAutoPostJournalsData {
  /** Base journal name entered before Oracle appends generated details. */
  journalBaseName: string;
  /** Primary ledger containing the prepared journal. */
  ledger: string;
  /** Existing Oracle AutoPost criteria set to submit. */
  criteriaSet: string;
}
