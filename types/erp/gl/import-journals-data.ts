/** Environment-specific parameters used by the Import Journals process. */
export interface ImportJournalsData {
  source: string;
  ledger: string;
  /** File attached to the imported journal before posting or approval. */
  attachmentFilePath: string;
}
