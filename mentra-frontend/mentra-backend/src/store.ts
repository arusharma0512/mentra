import type { ChatThread, ChatMessage, Step } from "./types.js";
import crypto from "crypto";

const demoSteps: Step[] = [
  {
    n: 1,
    t: "Start with the Middle",
    d: "Find the middle element of the sorted array.",
  },
  {
    n: 2,
    t: "Compare the Target",
    d: "Compare the target value to the middle element.",
  },
  {
    n: 3,
    t: "Narrow the Search",
    d: "Discard half the array based on comparison.",
  },
  { n: 4, t: "Repeat", d: "Continue until found or range is empty." },
];

function id() {
  return crypto.randomUUID();
}

function titleFromFirstUserMessage(messages: ChatMessage[]) {
  const firstUser = messages.find((m) => m.role === "user");
  if (!firstUser) return "New Chat";

  const clean = firstUser.content.trim().replace(/\s+/g, " ");
  return clean.length > 18 ? clean.slice(0, 18) + "…" : clean || "New Chat";
}

export class InMemoryStore {
  private threads = new Map<string, ChatThread>();

  listThreads(): ChatThread[] {
    return Array.from(this.threads.values()).sort(
      (a, b) => b.updatedAt - a.updatedAt,
    );
  }

  createThread(): ChatThread {
    const now = Date.now();

    const thread: ChatThread = {
      id: id(),
      title: "New Chat",
      updatedAt: now,
      messages: [
        {
          id: id(),
          role: "assistant",
          content:
            "Hi, I’m Mentra. I help you understand your coursework using only your class materials.",
          createdAt: now,
        },
      ],
    };

    this.threads.set(thread.id, thread);
    return thread;
  }

  getThread(threadId: string): ChatThread | null {
    return this.threads.get(threadId) ?? null;
  }

  addUserMessage(threadId: string, content: string) {
    const thread = this.threads.get(threadId);
    if (!thread) return null;

    const now = Date.now();

    const user: ChatMessage = {
      id: id(),
      role: "user",
      content,
      createdAt: now,
    };

    const assistant: ChatMessage = {
      id: id(),
      role: "assistant",
      content:
        "Got it — once the backend is connected, I’ll answer this using your course materials.",
      steps: /step|steps|step-by-step/i.test(content) ? demoSteps : undefined,
      createdAt: now + 1,
    };

    thread.messages.push(user, assistant);
    thread.updatedAt = Date.now();
    thread.title = titleFromFirstUserMessage(thread.messages);

    return { thread, user, assistant };
  }
}
