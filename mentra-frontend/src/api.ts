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

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8080";

// -------------------- LIST THREADS --------------------

export async function listThreads(): Promise<ChatThread[]> {
  const res = await fetch(`${API_BASE}/api/threads`, {
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error("Failed to list threads");
  }

  const data = await res.json();
  return data.threads ?? [];
}

// -------------------- CREATE THREAD --------------------

export async function createThread(): Promise<ChatThread> {
  const res = await fetch(`${API_BASE}/api/threads`, {
    method: "POST",
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error("Failed to create thread");
  }

  const data = await res.json();
  return data.thread;
}

// -------------------- SEND MESSAGE --------------------

export async function sendMessage(
  threadId: string,
  content: string,
  files?: File[],
): Promise<{ message: ChatMessage; thread: ChatThread }> {
  // 🔥 IMPORTANT DEBUG LOG
  console.log("Sending files:", files);

  // If files exist → use FormData
  if (files && files.length > 0) {
    const formData = new FormData();

    formData.append("content", content ?? "");

    for (const file of files) {
      formData.append("files", file);
    }

    const res = await fetch(`${API_BASE}/api/threads/${threadId}/messages`, {
      method: "POST",
      body: formData,
      credentials: "include",
      // 🚫 DO NOT set Content-Type manually
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
    body: JSON.stringify({ content }),
  });

  const data = await res.json();

  if (!res.ok) {
    console.error("Backend error:", data);
    throw new Error(data?.error || "Failed to send message");
  }

  return data;
}
