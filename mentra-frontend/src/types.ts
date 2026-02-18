export type Step = {
  n: number;
  t: string;
  d: string;
};

export type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
  steps?: Step[];
};

export type ChatThread = {
  id: string;
  title: string; // "CS101", "Econ 201", etc (for now can be "New Chat") // preview text (last message)
  updatedAt: number; // Date.now()
  messages: ChatMessage[];
};
