/** Defines the Worklist user expected by the vacation-rule validation. */
export interface VacationRuleData {
  userDisplayName: string;
  startDate: string;
  endDate: string;
  delegateToFirstName: string;
  delegateToLastName: string;
}
