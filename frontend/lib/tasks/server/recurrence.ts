import { RRule } from "rrule";

// recurrenceRule is a standard RRULE string (e.g. "FREQ=WEEKLY;BYDAY=MO,WE,FR"),
// same format the RecurrencePicker UI writes. Returns null if the rule is
// invalid or has no further occurrences after `after`.
export function nextOccurrence(recurrenceRule: string, after: Date): Date | null {
  try {
    const rule = RRule.fromString(recurrenceRule);
    return rule.after(after, false);
  } catch {
    return null;
  }
}
