export type ChatRole = "user" | "assistant" | "system" | "tool";

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
};

export type Conversation = {
  id: string;
  title: string | null;
  model: string;
  createdAt: string;
  updatedAt: string;
};

export type ChatbotDataAccess = {
  trendEngine: boolean;
  metascraper: boolean;
  schedule: boolean;
  tasks: boolean;
};
