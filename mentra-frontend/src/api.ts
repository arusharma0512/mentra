export type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
  createdAt: number;
};

export type ChatThread = {
  id: string;
  title: string;
  updatedAt: number;
  messages: ChatMessage[];
  summary?: string;
};

export type ResponseStyle = "concise" | "detailed" | "step-by-step";

export type SendOptions = {
  responseStyle?: ResponseStyle;
  includePractice?: boolean;
};

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8080";

// -------------------- LIST THREADS --------------------

export async function listThreads(): Promise<ChatThread[]> {
  const res = await fetch(`${API_BASE}/api/threads`, {
    credentials: "include",
  });

  if (!res.ok) throw new Error("Failed to list threads");

  const data = await res.json();
  return data.threads ?? [];
}

// -------------------- CREATE THREAD --------------------

export async function createThread(): Promise<ChatThread> {
  const res = await fetch(`${API_BASE}/api/threads`, {
    method: "POST",
    credentials: "include",
  });

  if (!res.ok) throw new Error("Failed to create thread");

  const data = await res.json();
  return data.thread;
}

// -------------------- SEND MESSAGE --------------------
// ✅ Supports BOTH:
// sendMessage(id, content, files, "detailed", true)
// sendMessage(id, content, files, { responseStyle: "detailed", includePractice: true })

export async function sendMessage(
  threadId: string,
  content: string,
  files?: File[],
  responseStyleOrOptions?: ResponseStyle | SendOptions,
  includePracticeMaybe?: boolean,
): Promise<{ message: ChatMessage; thread: ChatThread }> {
  // Normalize args
  let responseStyle: ResponseStyle = "detailed";
  let includePractice = false;

  if (typeof responseStyleOrOptions === "string") {
    responseStyle = responseStyleOrOptions;
    includePractice = Boolean(includePracticeMaybe);
  } else if (
    typeof responseStyleOrOptions === "object" &&
    responseStyleOrOptions
  ) {
    responseStyle = responseStyleOrOptions.responseStyle ?? "detailed";
    includePractice = Boolean(responseStyleOrOptions.includePractice);
  }

  const safeFiles = files ?? [];

  // 🔥 DEBUG LOG
  console.log("Sending files:", safeFiles);
  console.log("responseStyle:", responseStyle);
  console.log("includePractice:", includePractice);

  // If files exist → use FormData
  if (safeFiles.length > 0) {
    const formData = new FormData();

    formData.append("content", content ?? "");
    formData.append("responseStyle", responseStyle);
    formData.append("includePractice", String(includePractice));

    for (const file of safeFiles) {
      formData.append("files", file);
    }

    const res = await fetch(`${API_BASE}/api/threads/${threadId}/messages`, {
      method: "POST",
      body: formData,
      credentials: "include",
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("Backend error:", data);
      throw new Error(data?.error || "Failed to send message with files");
    }

    return data;
  }

  // Otherwise JSON-only
  const res = await fetch(`${API_BASE}/api/threads/${threadId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      content,
      responseStyle,
      includePractice,
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    console.error("Backend error:", data);
    throw new Error(data?.error || "Failed to send message");
  }

  return data;
}
