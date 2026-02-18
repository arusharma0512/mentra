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
  Download,
  Moon,
  Sun,
  Monitor,
} from "lucide-react";

import { createThread, sendMessage, listThreads } from "./api";
import type { ChatThread } from "./api";
import type { ResponseStyle } from "./api";

declare global {
  interface Window {
    webkitSpeechRecognition?: any;
    SpeechRecognition?: any;
  }
}

type ThemeMode = "system" | "light" | "dark";

const LS_THEME = "mentra_theme";
const LS_STYLE = "mentra_response_style";
const LS_PRACTICE = "mentra_include_practice";

export default function App() {
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [active, setActive] = useState<ChatThread | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  // 🔎 Search + ⚙️ Settings modals
  const [showSearch, setShowSearch] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [query, setQuery] = useState("");

  // ⋯ Thread menu (three dots)
  const [menuForId, setMenuForId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // 🎤 Mic (speech → text)
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  // 📎 Upload picker
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // ✅ Settings (persisted)
  const [themeMode, setThemeMode] = useState<ThemeMode>("system");
  const [responseStyle, setResponseStyle] =
    useState<ResponseStyle>("step-by-step");

  const [includePractice, setIncludePractice] = useState(true);

  const activeId = active?.id;

  // ---------- Load threads ----------
  useEffect(() => {
    (async () => {
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

  // ---------- Load settings from localStorage ----------
  useEffect(() => {
    const t = (localStorage.getItem(LS_THEME) as ThemeMode) || "system";
    const s =
      (localStorage.getItem(LS_STYLE) as ResponseStyle) || "step_by_step";
    const p = localStorage.getItem(LS_PRACTICE);

    setThemeMode(t);
    setResponseStyle(s);
    setIncludePractice(p === null ? true : p === "true");
  }, []);

  // ---------- Apply theme ----------
  useEffect(() => {
    localStorage.setItem(LS_THEME, themeMode);

    const root = document.documentElement;
    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");

    const apply = () => {
      const effective =
        themeMode === "system" ? (mq?.matches ? "dark" : "light") : themeMode;
      root.setAttribute("data-theme", effective);
    };

    apply();

    if (themeMode === "system" && mq) {
      mq.addEventListener?.("change", apply);
      return () => mq.removeEventListener?.("change", apply);
    }
  }, [themeMode]);

  // Persist other settings
  useEffect(() => {
    localStorage.setItem(LS_STYLE, responseStyle);
  }, [responseStyle]);

  useEffect(() => {
    localStorage.setItem(LS_PRACTICE, String(includePractice));
  }, [includePractice]);

  async function onNewChat() {
    const newT = await createThread();
    setThreads((prev) => [newT, ...prev]);
    setActive(newT);
  }

  async function onDeleteChat(threadId: string) {
    const ok = confirm("Delete this chat?");
    if (!ok) return;

    try {
      const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8080";

      const res = await fetch(`${API_BASE}/api/threads/${threadId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!res.ok) throw new Error("Failed to delete thread");

      setThreads((prev) => {
        const next = prev.filter((t) => t.id !== threadId);

        setActive((cur) => {
          if (!cur) return next[0] ?? null;
          if (cur.id === threadId) return next[0] ?? null;
          return cur;
        });

        return next;
      });
    } catch (e) {
      console.error(e);
      alert("Failed to delete chat");
    } finally {
      setMenuForId(null);
    }
  }

  // Close menu on outside click; ESC closes all modals/menus
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!menuRef.current) return;
      if (menuRef.current.contains(e.target as Node)) return;
      setMenuForId(null);
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setMenuForId(null);
        setShowSearch(false);
        setShowSettings(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, []);

  // ---------- MIC ----------
  function toggleMic() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SR) {
      alert("Speech recognition isn't supported in this browser. Try Chrome.");
      return;
    }

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

  // ---------- FILES ----------
  function openFilePicker() {
    fileInputRef.current?.click();
  }

  function onFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files || []);
    if (selected.length === 0) return;
    setFiles((prev) => [...prev, ...selected]);
    e.target.value = "";
  }

  function removeFile(idx: number) {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  }

  // ---------- SEND ----------
  async function onSend() {
    if (!active || busy) return;

    const content = text.trim();
    if (!content && files.length === 0) return;

    const currentThreadId = active.id;

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
        { responseStyle, includePractice },
      );

      setActive(updated);

      setThreads((prev) => {
        const without = prev.filter((x) => x.id !== updated.id);
        return [updated, ...without].sort((a, b) => b.updatedAt - a.updatedAt);
      });

      setFiles([]);
    } catch (err) {
      console.error(err);
      alert("Send failed — check Console/Network for errors.");
    } finally {
      setBusy(false);
    }
  }

  // ---------- Export chat ----------
  function exportActiveChat() {
    if (!active) return;

    const title = (active.title || "Mentra Chat").replace(/[\\/:*?"<>|]/g, "-");
    const lines: string[] = [];
    lines.push(`# ${active.title || "Mentra Chat"}`);
    lines.push(``);
    lines.push(`Exported: ${new Date().toLocaleString()}`);
    lines.push(``);

    for (const m of active.messages) {
      const who = m.role === "user" ? "User" : "Mentra";
      const when = new Date(m.createdAt).toLocaleString();
      lines.push(`## ${who} — ${when}`);
      lines.push(m.content);
      lines.push(``);
    }

    const md = lines.join("\n");
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `${title}.md`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  const filteredThreads = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return threads;
    return threads.filter((t) => (t.title || "").toLowerCase().includes(q));
  }, [threads, query]);

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
            <button
              className="icon-btn"
              title="Search"
              onClick={() => setShowSearch(true)}
              type="button"
            >
              <Search size={18} />
            </button>
            <button
              className="icon-btn"
              title="Settings"
              onClick={() => setShowSettings(true)}
              type="button"
            >
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
          {filteredThreads.map((t) => {
            const isActive = t.id === activeId;

            return (
              <div key={t.id} style={{ position: "relative" }}>
                <button
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
                    alignItems: "center",
                    display: "flex",
                    gap: 10,
                  }}
                >
                  <div style={{ textAlign: "left", flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: 650,
                        fontSize: 14,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {t.title || "New Chat"}
                    </div>
                    <div
                      className="muted"
                      style={{ fontSize: 12, marginTop: 2 }}
                    >
                      Last active: {new Date(t.updatedAt).toLocaleTimeString()}
                    </div>
                  </div>

                  <button
                    type="button"
                    className="icon-btn"
                    title="Options"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setMenuForId((prev) => (prev === t.id ? null : t.id));
                    }}
                    style={{ width: 36, height: 36 }}
                  >
                    <MoreHorizontal size={18} />
                  </button>
                </button>

                {menuForId === t.id && (
                  <div
                    ref={menuRef}
                    style={{
                      position: "absolute",
                      right: 8,
                      top: 50,
                      zIndex: 9999,
                      background: "white",
                      border: "1px solid rgba(0,0,0,0.08)",
                      borderRadius: 12,
                      boxShadow: "0 12px 30px rgba(0,0,0,0.12)",
                      overflow: "hidden",
                      minWidth: 160,
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => onDeleteChat(t.id)}
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        textAlign: "left",
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        color: "#dc2626",
                        fontWeight: 600,
                      }}
                    >
                      Delete chat
                    </button>
                  </div>
                )}
              </div>
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
          <button className="icon-btn" title="Back" type="button">
            <ChevronLeft size={18} />
          </button>

          <div style={{ fontWeight: 700, letterSpacing: -0.2 }}>
            {active?.title || "New Chat"}
          </div>

          <div style={{ marginLeft: "auto" }}>
            <button className="icon-btn" title="More" type="button">
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
            {busy && (
              <div
                style={{
                  display: "flex",
                  gap: 12,
                  marginBottom: 16,
                  justifyContent: "flex-start",
                }}
              >
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

                <div className="bubble">
                  <div className="typing-indicator" aria-label="Thinking">
                    <span />
                    <span />
                    <span />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Input bar */}
        <div style={{ padding: 18 }}>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,application/pdf"
            style={{ display: "none" }}
            onChange={onFilesSelected}
          />

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
              disabled={busy}
            />

            <button
              className="icon-btn"
              title="Upload (photos/PDF)"
              onClick={openFilePicker}
              type="button"
            >
              <Paperclip size={18} />
            </button>

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

      {/* Search Modal */}
      {showSearch && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(0,0,0,0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
          onClick={() => setShowSearch(false)}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 480,
              background: "white",
              borderRadius: 16,
              padding: 16,
              boxShadow: "0 18px 40px rgba(0,0,0,0.2)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 10,
              }}
            >
              <div style={{ fontWeight: 800 }}>Search Chats</div>
              <button
                className="icon-btn"
                onClick={() => setShowSearch(false)}
                type="button"
              >
                <X size={18} />
              </button>
            </div>

            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by title..."
              style={{
                width: "100%",
                border: "1px solid rgba(0,0,0,0.15)",
                borderRadius: 12,
                padding: "10px 12px",
                outline: "none",
              }}
            />

            <div className="muted" style={{ marginTop: 10, fontSize: 12 }}>
              {query.trim()
                ? `Showing ${filteredThreads.length} result(s)`
                : "Type to filter chats"}
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(0,0,0,0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
          onClick={() => setShowSettings(false)}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 520,
              background: "white",
              borderRadius: 16,
              padding: 16,
              boxShadow: "0 18px 40px rgba(0,0,0,0.2)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 10,
              }}
            >
              <div style={{ fontWeight: 800 }}>Settings</div>
              <button
                className="icon-btn"
                onClick={() => setShowSettings(false)}
                type="button"
              >
                <X size={18} />
              </button>
            </div>

            {/* Theme */}
            <div
              className="glass"
              style={{
                padding: 12,
                borderRadius: 14,
                marginBottom: 12,
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: 8 }}>Theme</div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button
                  type="button"
                  className="btn"
                  onClick={() => setThemeMode("system")}
                  style={{
                    background:
                      themeMode === "system"
                        ? "rgba(200,240,223,0.8)"
                        : "transparent",
                  }}
                >
                  <Monitor size={16} /> System
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={() => setThemeMode("light")}
                  style={{
                    background:
                      themeMode === "light"
                        ? "rgba(200,240,223,0.8)"
                        : "transparent",
                  }}
                >
                  <Sun size={16} /> Light
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={() => setThemeMode("dark")}
                  style={{
                    background:
                      themeMode === "dark"
                        ? "rgba(200,240,223,0.8)"
                        : "transparent",
                  }}
                >
                  <Moon size={16} /> Dark
                </button>
              </div>
            </div>

            {/* Response style */}
            <div
              className="glass"
              style={{
                padding: 12,
                borderRadius: 14,
                marginBottom: 12,
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: 8 }}>
                Response style
              </div>
              <select
                value={responseStyle}
                onChange={(e) =>
                  setResponseStyle(e.target.value as ResponseStyle)
                }
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid rgba(0,0,0,0.15)",
                  outline: "none",
                }}
              >
                <option value="concise">Concise</option>
                <option value="step_by_step">Step-by-step</option>
                <option value="detailed">Detailed</option>
                <option value="exam_ready">Exam-ready</option>
                <option value="beginner">Beginner-friendly</option>
              </select>
              <div className="muted" style={{ fontSize: 12, marginTop: 8 }}>
                This changes how Mentra answers (sent to the backend each
                message).
              </div>
            </div>

            {/* Practice questions */}
            <div
              className="glass"
              style={{
                padding: 12,
                borderRadius: 14,
                marginBottom: 12,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
              }}
            >
              <div>
                <div style={{ fontWeight: 700 }}>
                  Include practice questions
                </div>
                <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                  Adds 2 practice questions at the end of answers.
                </div>
              </div>
              <input
                type="checkbox"
                checked={includePractice}
                onChange={(e) => setIncludePractice(e.target.checked)}
                style={{ width: 18, height: 18 }}
              />
            </div>

            {/* Export */}
            <button
              type="button"
              className="btn btn-primary"
              onClick={exportActiveChat}
              disabled={!active}
              style={{ width: "100%", justifyContent: "center", gap: 10 }}
            >
              <Download size={18} />
              Export current chat (.md)
            </button>

            <div className="muted" style={{ fontSize: 12, marginTop: 10 }}>
              Export downloads a Markdown file you can submit or study from.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
