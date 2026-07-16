export type ChatRole = "user" | "assistant" | "system" | "tool";

export type ChatAttachment = {
  id: string;
  name: string;
  mediaType: string;
  size: number;
  storagePath: string;
};

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  attachments: ChatAttachment[];
  createdAt: string;
};

export type Conversation = {
  id: string;
  title: string | null;
  model: string;
  summary: string | null;
  summaryThroughMessageId: string | null;
  memoryProcessedThroughMessageId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ChatbotDataAccess = {
  trendEngine: boolean;
  metascraper: boolean;
  schedule: boolean;
  tasks: boolean;
};
