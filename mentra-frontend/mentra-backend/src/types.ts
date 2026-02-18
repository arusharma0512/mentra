export type Step = { n: number; t: string; d: string };

export type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
  steps?: Step[];
  createdAt: number;
};

export type ChatThread = {
  id: string;
  title: string;
  updatedAt: number;
  messages: ChatMessage[];
};
