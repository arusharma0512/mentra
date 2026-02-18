import "dotenv/config";
import express from "express";
import cors from "cors";
import OpenAI from "openai";
import crypto from "crypto";
import multer from "multer";
import { createRequire } from "module";

// -------------------- PDF Parse (works in ESM/tsx) --------------------
// Use createRequire so we reliably load the CommonJS export.
const require = createRequire(import.meta.url);
let pdfParseFn: any = null;

function getPdfParse() {
  if (!pdfParseFn) {
    // pdf-parse@2.x loads fine like this
    pdfParseFn = require("pdf-parse");
  }
  return pdfParseFn;
}

// -------------------- Types --------------------

type Role = "assistant" | "user";

type ChatMessage = {
  id: string;
  role: Role;
  content: string;
  createdAt: number;
};

type ChatThread = {
  id: string;
  title: string;
  updatedAt: number;
  messages: ChatMessage[];
  summary?: string;
};

// -------------------- In memory store --------------------

const threads = new Map<string, ChatThread>();

function makeId() {
  return crypto.randomUUID();
}

function titleFromFirstUserMessage(messages: ChatMessage[]) {
  const firstUser = messages.find((m) => m.role === "user");
  if (!firstUser) return "New Chat";

  let text = firstUser.content
    .replace(/--- Extracted from[\s\S]*$/i, "")
    .replace(/^Sent files:.*$/im, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

  if (!text) return "New Chat";

  // Remove common conversational starters
  const fillers = [
    "please",
    "can you",
    "could you",
    "help me with",
    "i need help with",
    "explain",
    "how do i",
    "what is",
    "tell me about",
  ];

  for (const phrase of fillers) {
    if (text.startsWith(phrase)) {
      text = text.replace(phrase, "").trim();
    }
  }

  // Keep first 4–5 meaningful words
  const words = text.split(" ").filter(Boolean);
  const short = words.slice(0, 5).join(" ");

  // Capitalize each word
  const formatted = short
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  return formatted.length > 32 ? formatted.slice(0, 32) + "…" : formatted;
}

function buildPrompt(thread: ChatThread, n = 12) {
  const summaryBlock =
    thread.summary && thread.summary.trim()
      ? `CONVERSATION SUMMARY:\n${thread.summary.trim()}\n\n`
      : "";

  const recentBlock = thread.messages
    .slice(-n)
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join("\n");

  return `${summaryBlock}${recentBlock}`;
}

// -------------------- OpenAI --------------------

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// -------------------- App --------------------

const app = express();
app.use(express.json());

// -------------------- Multer (memory storage) --------------------

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB
});

// -------------------- CORS --------------------

const allowedOrigins = (
  process.env.CORS_ORIGIN || "http://localhost:5173,http://localhost:3000"
)
  .split(",")
  .map((s) => s.trim());

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  }),
);

// -------------------- Routes --------------------

app.get("/", (_req, res) => {
  res.send("Mentra backend is running ✅");
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/threads", (_req, res) => {
  const all = Array.from(threads.values()).sort(
    (a, b) => b.updatedAt - a.updatedAt,
  );
  res.json({ threads: all });
});

app.post("/api/threads", (_req, res) => {
  const now = Date.now();
  const threadId = makeId();

  const starter: ChatMessage = {
    id: makeId(),
    role: "assistant",
    content:
      "Hi, I’m Mentra. I help you understand your coursework using only your class materials.",
    createdAt: now,
  };

  const thread: ChatThread = {
    id: threadId,
    title: "New Chat",
    updatedAt: now,
    messages: [starter],
    summary: "",
  };

  threads.set(threadId, thread);
  res.status(201).json({ thread });
});

// DELETE THREAD (for the three dots menu)
app.delete("/api/threads/:id", (req, res) => {
  const threadId = Array.isArray(req.params.id)
    ? req.params.id[0]
    : req.params.id;

  if (!threads.has(threadId)) {
    return res.status(404).json({ error: "Thread not found" });
  }

  threads.delete(threadId);
  return res.json({ ok: true });
});

// -------------------- Message Route (Text + PDF) --------------------

app.post(
  "/api/threads/:id/messages",
  upload.array("files"),
  async (req, res) => {
    // ✅ Fix TS underline: force threadId to be a string
    const threadId = Array.isArray(req.params.id)
      ? req.params.id[0]
      : req.params.id;

    const thread = threads.get(threadId);
    if (!thread) return res.status(404).json({ error: "Thread not found" });

    const content = (req.body.content || "").toString().trim();
    const uploadedFiles = req.files as Express.Multer.File[] | undefined;
    const responseStyle = (req.body.responseStyle || "detailed").toString();
    const includePractice = String(req.body.includePractice) === "true";

    let combinedContent = content || "";

    if (uploadedFiles && uploadedFiles.length > 0) {
      for (const file of uploadedFiles) {
        try {
          if (file.mimetype === "application/pdf") {
            const pdfParse = getPdfParse();
            const parsed = await pdfParse(file.buffer);

            console.log(
              `✅ Parsed PDF "${file.originalname}" chars: ${parsed?.text?.length ?? 0}`,
            );

            combinedContent +=
              `\n\n--- Extracted from ${file.originalname} ---\n` +
              (parsed.text || "").slice(0, 15000);
          } else {
            combinedContent += `\n\nUser uploaded file: ${file.originalname} (${file.mimetype})`;
          }
        } catch (err) {
          console.error("❌ PDF parse error:", err);
          combinedContent += `\n\n[Could not read ${file.originalname}]`;
        }
      }
    }

    if (!combinedContent.trim()) {
      return res
        .status(400)
        .json({ error: "Message must include text or files" });
    }

    // Save user message
    const userMsg: ChatMessage = {
      id: makeId(),
      role: "user",
      content: combinedContent,
      createdAt: Date.now(),
    };
    thread.messages.push(userMsg);

    try {
      const prompt = buildPrompt(thread, 12);

      const response = await client.responses.create({
        model: "gpt-4o-mini",
        instructions:
          "You are Mentra, a helpful coursework tutor. If extracted PDF text appears above, use it directly. Be clear, friendly, and structured. Explain step-by-step. End with a short summary and 2 practice questions.",
        input: prompt,
      });

      const assistantText =
        response.output_text?.trim() || "Sorry — I couldn’t generate a reply.";

      const assistantMsg: ChatMessage = {
        id: makeId(),
        role: "assistant",
        content: assistantText,
        createdAt: Date.now(),
      };

      thread.messages.push(assistantMsg);
      thread.updatedAt = Date.now();
      if (!thread.title || thread.title === "New Chat") {
        thread.title = titleFromFirstUserMessage(thread.messages);
      }

      threads.set(threadId, thread);

      return res.status(201).json({ message: assistantMsg, thread });
    } catch (err) {
      console.error("OpenAI error:", err);

      const assistantMsg: ChatMessage = {
        id: makeId(),
        role: "assistant",
        content:
          "Sorry — I hit an error talking to the AI service. Please try again.",
        createdAt: Date.now(),
      };

      thread.messages.push(assistantMsg);
      thread.updatedAt = Date.now();
      threads.set(threadId, thread);

      return res.status(500).json({
        error: "OpenAI request failed",
        message: assistantMsg,
        thread,
      });
    }
  },
);

// -------------------- Server --------------------

const PORT = Number(process.env.PORT) || 8080;

app.listen(PORT, () => {
  console.log(`Mentra backend running on http://localhost:${PORT}`);
});
