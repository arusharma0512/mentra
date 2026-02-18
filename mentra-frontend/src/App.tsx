import { useEffect, useMemo, useRef, useState } from "react";
import {
  Leaf,
  Plus,
  Search,
  Settings,
  History,
  ChevronLeft,
  MoreHorizontal,
  Send,
  Mic,
  Paperclip,
  X,
} from "lucide-react";

import { createThread, sendMessage, listThreads } from "./api";
import type { ChatThread } from "./api";

declare global {
  interface Window {
    webkitSpeechRecognition?: any;
    SpeechRecognition?: any;
  }
}

export default function App() {
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [active, setActive] = useState<ChatThread | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  // 🎤 Mic (speech → text)
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  // 📎 Upload picker (stores selected files; doesn’t change backend call yet)
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const activeId = active?.id;

  useEffect(() => {
    (async () => {
      // load existing threads (in-memory backend = will reset on restart)
      const t = await listThreads().catch(() => []);
      setThreads(t);

      if (t.length > 0) setActive(t[0]);
      else {
        const newT = await createThread();
        setThreads([newT]);
        setActive(newT);
      }
    })();
  }, []);

  async function onNewChat() {
    const newT = await createThread();
    setThreads((prev) => [newT, ...prev]);
    setActive(newT);
  }

  // ---------- MIC: Web Speech API ----------
  function toggleMic() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SR) {
      alert("Speech recognition isn't supported in this browser. Try Chrome.");
      return;
    }

    // Create once
    if (!recognitionRef.current) {
      const rec = new SR();
      rec.lang = "en-US";
      rec.interimResults = true;
      rec.continuous = true;

      rec.onresult = (event: any) => {
        let finalText = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) finalText += transcript;
        }

        if (finalText.trim()) {
          // ✅ Append into textbox
          setText((prev) => (prev ? prev + " " : "") + finalText.trim());
        }
      };

      rec.onerror = () => setListening(false);
      rec.onend = () => setListening(false);

      recognitionRef.current = rec;
    }

    if (listening) {
      recognitionRef.current.stop();
      setListening(false);
    } else {
      recognitionRef.current.start();
      setListening(true);
    }
  }

  // ---------- FILES: picker ----------
  function openFilePicker() {
    fileInputRef.current?.click();
  }

  function onFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files || []);
    if (selected.length === 0) return;
    setFiles((prev) => [...prev, ...selected]);
    e.target.value = ""; // allow selecting same file again
  }

  function removeFile(idx: number) {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  }
  async function onSend() {
    if (!active || busy) return;

    const content = text.trim();

    if (!content && files.length === 0) return;

    const currentThreadId = active.id; // ✅ capture safely

    setText("");
    setBusy(true);

    const optimistic: ChatThread = {
      ...active,
      messages: [
        ...active.messages,
        {
          id: `temp-${Date.now()}`,
          role: "user",
          content:
            content ||
            `Sent files: ${files.map((f) => f.name).join(", ") || "(files)"}`,
          createdAt: Date.now(),
        },
      ],
      updatedAt: Date.now(),
    };

    setActive(optimistic);

    try {
      const { thread: updated } = await sendMessage(
        currentThreadId,
        content,
        files,
      );

      setActive(updated);

      setThreads((prev) => {
        const without = prev.filter((x) => x.id !== updated.id);
        return [updated, ...without].sort((a, b) => b.updatedAt - a.updatedAt);
      });

      setFiles([]);
    } catch (err) {
      console.error(err);
    } finally {
      setBusy(false);
    }
  }

  const grouped = useMemo(() => {
    // simple: show all as one list; you can later group by Today/Yesterday
    return threads;
  }, [threads]);

  return (
    <div style={{ height: "100%", display: "flex" }}>
      {/* Sidebar */}
      <aside
        className="glass"
        style={{
          width: 330,
          padding: 18,
          borderRight: "1px solid var(--stroke)",
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            className="icon-btn"
            style={{ background: "rgba(200,240,223,0.75)" }}
          >
            <Leaf size={18} />
          </div>
          <div style={{ fontSize: 22, fontWeight: 750, letterSpacing: -0.3 }}>
            Mentra
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
            <button className="icon-btn" title="Search">
              <Search size={18} />
            </button>
            <button className="icon-btn" title="Settings">
              <Settings size={18} />
            </button>
          </div>
        </div>

        <button className="btn btn-primary" onClick={onNewChat}>
          <Plus size={18} />
          New Chat
        </button>

        <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>
          Chat Results
        </div>

        <div style={{ overflow: "auto", paddingRight: 6 }}>
          {grouped.map((t) => {
            const isActive = t.id === activeId;
            return (
              <button
                key={t.id}
                onClick={() => setActive(t)}
                className="btn"
                style={{
                  width: "100%",
                  justifyContent: "space-between",
                  marginBottom: 10,
                  background: isActive
                    ? "linear-gradient(180deg, rgba(200,240,223,0.9), rgba(227,247,238,0.9))"
                    : "rgba(255,255,255,0.60)",
                  borderColor: isActive
                    ? "rgba(69,122,99,0.25)"
                    : "var(--stroke)",
                }}
              >
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontWeight: 650, fontSize: 14 }}>
                    {t.title || "New Chat"}
                  </div>
                  <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                    Last active: {new Date(t.updatedAt).toLocaleTimeString()}
                  </div>
                </div>
                <MoreHorizontal size={18} />
              </button>
            );
          })}
        </div>

        <div style={{ marginTop: "auto" }} className="muted">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <History size={16} />
            <span style={{ fontSize: 12 }}>
              Mentra answers using your course materials (paste them here).
            </span>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {/* Top bar */}
        <div
          className="glass"
          style={{
            padding: "14px 18px",
            borderBottom: "1px solid var(--stroke)",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <button className="icon-btn" title="Back">
            <ChevronLeft size={18} />
          </button>

          <div style={{ fontWeight: 700, letterSpacing: -0.2 }}>
            {active?.title || "New Chat"}
          </div>

          <div style={{ marginLeft: "auto" }}>
            <button className="icon-btn" title="More">
              <MoreHorizontal size={18} />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflow: "auto", padding: 24 }}>
          <div style={{ maxWidth: 980, margin: "0 auto" }}>
            {active?.messages.map((m) => {
              const isUser = m.role === "user";
              return (
                <div
                  key={m.id}
                  style={{
                    display: "flex",
                    gap: 12,
                    marginBottom: 16,
                    justifyContent: isUser ? "flex-end" : "flex-start",
                  }}
                >
                  {!isUser && (
                    <div
                      className="icon-btn"
                      style={{
                        width: 42,
                        height: 42,
                        background: "rgba(200,240,223,0.7)",
                      }}
                      title="Mentra"
                    >
                      <Leaf size={18} />
                    </div>
                  )}

                  <div className={`bubble ${isUser ? "user" : ""}`}>
                    <div style={{ whiteSpace: "pre-wrap" }}>{m.content}</div>
                  </div>

                  {isUser && (
                    <div
                      className="icon-btn"
                      style={{
                        width: 42,
                        height: 42,
                        background: "rgba(255,255,255,0.70)",
                      }}
                      title="You"
                    >
                      <span
                        style={{ fontWeight: 800, color: "var(--sage-600)" }}
                      >
                        U
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Input bar */}
        <div style={{ padding: 18 }}>
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,application/pdf"
            style={{ display: "none" }}
            onChange={onFilesSelected}
          />

          {/* Selected files preview */}
          {files.length > 0 && (
            <div
              style={{
                maxWidth: 980,
                margin: "0 auto 10px auto",
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              {files.map((f, idx) => (
                <div
                  key={`${f.name}-${idx}`}
                  className="glass pill"
                  style={{
                    padding: "8px 10px",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <span style={{ fontSize: 13 }}>{f.name}</span>
                  <button
                    className="icon-btn"
                    style={{ width: 28, height: 28 }}
                    onClick={() => removeFile(idx)}
                    title="Remove"
                    type="button"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div
            className="glass pill"
            style={{
              maxWidth: 980,
              margin: "0 auto",
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: 10,
            }}
          >
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type a message…"
              style={{
                flex: 1,
                border: "none",
                outline: "none",
                background: "transparent",
                fontSize: 15,
                padding: "10px 12px",
                color: "var(--text)",
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") onSend();
              }}
              disabled={!active || busy}
            />

            {/* Upload icon */}
            <button
              className="icon-btn"
              title="Upload (photos/PDF)"
              onClick={openFilePicker}
              type="button"
            >
              <Paperclip size={18} />
            </button>

            {/* Mic icon */}
            <button
              className="icon-btn"
              title={listening ? "Stop recording" : "Record (speech → text)"}
              onClick={toggleMic}
              type="button"
              style={{
                background: listening
                  ? "linear-gradient(180deg, rgba(200,240,223,0.95), rgba(227,247,238,0.95))"
                  : undefined,
                borderColor: listening ? "rgba(69,122,99,0.25)" : undefined,
              }}
            >
              <Mic size={18} />
            </button>

            <button
              className="icon-btn"
              title="Send"
              onClick={onSend}
              disabled={!active || busy || (!text.trim() && files.length === 0)}
              style={{
                background:
                  busy || (!text.trim() && files.length === 0)
                    ? "rgba(255,255,255,0.55)"
                    : "linear-gradient(180deg, var(--mint-200), var(--mint-100))",
                borderColor: "rgba(69,122,99,0.25)",
              }}
            >
              <Send size={18} />
            </button>
          </div>

          <div
            className="muted"
            style={{ fontSize: 12, textAlign: "center", marginTop: 10 }}
          >
            Mentra answers using your course materials — paste notes/slides when
            needed.
          </div>
        </div>
      </main>
    </div>
  );
}
