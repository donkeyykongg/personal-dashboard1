export type AssistantActionType =
  | "create_todo"
  | "create_schedule_event"
  | "create_journal_entry"
  | "answer";

export type CreateTodoDraft = {
  type: "create_todo";
  text: string;
  date: string;
};

export type CreateScheduleEventDraft = {
  type: "create_schedule_event";
  title: string;
  start_at: string;
  end_at: string;
  location?: string | null;
  body?: string | null;
};

export type CreateJournalEntryDraft = {
  type: "create_journal_entry";
  content: string;
};

export type AnswerDraft = {
  type: "answer";
  content: string;
};

export type AssistantDraft =
  | CreateTodoDraft
  | CreateScheduleEventDraft
  | CreateJournalEntryDraft
  | AnswerDraft;

export type AssistantCommandResult = {
  reply: string;
  drafts: AssistantDraft[];
  source: "ai" | "fallback";
};

