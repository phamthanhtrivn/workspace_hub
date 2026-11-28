export type HelpTopic =
  | "dashboard"
  | "projects"
  | "calendar"
  | "pomodoro"
  | "messages"
  | "meetings"
  | "documents"
  | "ai"
  | "account";

export interface HelpArticle {
  id: string;
  topic: HelpTopic;
  relatedTopics?: readonly HelpTopic[];
  title: string;
  description: string;
  steps: readonly string[];
  note?: string;
  keywords?: string;
}

export interface HelpShortcut {
  id: string;
  topic: HelpTopic | "global";
  relatedTopics?: readonly HelpTopic[];
  action: string;
  keys: readonly string[];
  macKeys?: readonly string[];
  note?: string;
  alwaysEnabled?: boolean;
}
