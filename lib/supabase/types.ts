export type FinanceEntry = {
  id: string;
  user_id: string | null;
  amount: number;
  category: string;
  subcategory?: string | null;
  item?: string | null;
  date: string;
  notes: string | null;
  is_recurring?: boolean | null;
  recurring_interval?: "weekly" | "monthly" | "yearly" | null;
  next_due_date?: string | null;
  is_business?: boolean;
  created_at: string;
};

export type DailyTask = {
  id: string;
  day_offset: number;
  task: string;
  tone: string;
  sort: number;
  created_at: string;
};

export type JournalPrompt = {
  id: string;
  prompt: string;
  sort: number;
  created_at: string;
};

export type UserSettings = {
  id: number;
  last_pomodoro_minutes: number;
  updated_at: string;
};

export type ScheduleEvent = {
  id: string;
  title: string;
  start_at: string;
  end_at: string;
  location: string | null;
  body: string | null;
  outlook_event_id: string | null;
  sync_status: "local" | "synced" | "pending" | "error" | "deleted";
  created_at: string;
  updated_at: string;
};

export type PomodoroSession = {
  id: string;
  started_at: string;
  ended_at: string;
  minutes: number;
  completed: boolean;
  created_at: string;
};

export type KanbanColumn = "backlog" | "todo" | "doing" | "done";
export type KanbanPriority = "high" | "medium" | "low";
export type KanbanEffort = "high" | "medium" | "low";

export type KanbanCard = {
  id: string;
  title: string;
  column_key: KanbanColumn;
  priority: KanbanPriority;
  effort: KanbanEffort;
  sort: number;
  created_at: string;
  updated_at: string;
};

export type InboxItem = {
  id: string;
  content: string;
  destination: string | null;
  archived: boolean;
  created_at: string;
};

export type OauthToken = {
  provider: string;
  access_token: string;
  refresh_token: string | null;
  expires_at: string;
  account_email: string | null;
  delta_link: string | null;
  updated_at: string;
};

export type SubscriptionCategory = "tools" | "software" | "personal";
export type BillingCycle = "monthly" | "yearly" | "weekly";

export type Subscription = {
  id: string;
  name: string;
  amount: number;
  billing_date: number;
  billing_cycle: BillingCycle;
  category: SubscriptionCategory;
  active: boolean;
  next_renewal: string | null;
  from_account_id: string | null;
  auto_deduct: boolean;
  last_deducted_at: string | null;
  entered_amount: number | null;
  entered_currency: string;
  created_at: string;
};

export type FolderType = "standard" | "vault";

export type Folder = {
  id: string;
  name: string;
  parent_id: string | null;
  type: FolderType;
  created_at: string;
};

export type Page = {
  id: string;
  folder_id: string | null;
  title: string;
  content: any;
  updated_at: string;
  created_at: string;
};

export type ScheduledPost = {
  id: string;
  platform: "instagram" | "tiktok" | "facebook";
  caption: string;
  media_url: string | null;
  scheduled_for: string;
  status: "draft" | "scheduled" | "posted";
  created_at: string;
};

export type Reflection = {
  id: string;
  date: string;
  score: number;
  content: string;
  created_at: string;
};

export type MonthlyCashFlow = {
  id: string;
  month: string;
  revenue: number;
  expenses: number;
  notes: string | null;
  created_at: string;
};

export type FinancialAccountKind = "asset" | "liability" | "income" | "expense";

export type NwCategory = "bank" | "stocks" | "crypto" | "other";

export type FinancialAccount = {
  id: string;
  name: string;
  kind: FinancialAccountKind;
  amount: number;
  interest_rate: number | null;
  min_payment: number | null;
  nw_category: NwCategory;
  created_at: string;
};

export type Task = {
  id: string;
  title: string;
  notes: string | null;
  due_date: string | null;
  due_time: string | null;
  completed: boolean;
  created_at: string;
};
