import { useEffect, useMemo, useRef, useState } from "react";
import { MoreHorizontal, Search, Settings, Trash2 } from "lucide-react";
import type { ChatThread } from "../types";

export default function Sidebar({
  threads,
  activeId,
  onNewChat,
  onSelectChat,
  onDeleteChat,
}: {
  threads: ChatThread[];
  activeId: string | null;
  onNewChat: () => void;
  onSelectChat: (id: string) => void;
  onDeleteChat: (id: string) => void;
}) {
  const [showSearch, setShowSearch] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [query, setQuery] = useState("");

  // Three dots menu state
  const [menuForId, setMenuForId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Close the 3 dot menu when clicking outside / pressing Escape
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

  const filteredThreads = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return threads;
    return threads.filter((t) => t.title.toLowerCase().includes(q));
  }, [threads, query]);

  return (
    <>
      <aside className="w-[320px] h-full bg-mentra-mintSoft border-r border-mentra-border flex">
        <div className="flex-1 p-5 pr-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-full bg-mentra-mint/70 flex items-center justify-center">
                🌿
              </div>
              <h1 className="text-xl font-semibold text-mentra-text">Mentra</h1>
            </div>

            {/* Search + Settings icons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowSearch(true)}
                className="w-10 h-10 rounded-full bg-white/40 hover:bg-white/60 border border-white/40 flex items-center justify-center transition cursor-pointer"
              >
                <Search size={18} className="text-mentra-text" />
              </button>

              <button
                type="button"
                onClick={() => setShowSettings(true)}
                className="w-10 h-10 rounded-full bg-white/40 hover:bg-white/60 border border-white/40 flex items-center justify-center transition cursor-pointer"
              >
                <Settings size={18} className="text-mentra-text" />
              </button>
            </div>
          </div>

          {/* New Chat */}
          <button
            onClick={onNewChat}
            className="w-full rounded-full bg-mentra-mintDark/60 text-white text-sm py-2.5 px-4 flex items-center gap-2 hover:opacity-95 transition"
          >
            ＋ New Chat
          </button>

          {/* Threads */}
          <div className="mt-6 space-y-3">
            {filteredThreads.map((thread) => {
              const isActive = thread.id === activeId;

              return (
                <div key={thread.id} className="relative">
                  {/* Whole row is clickable to select */}
                  <button
                    onClick={() => onSelectChat(thread.id)}
                    className={`w-full text-left rounded-2xl px-4 py-3 transition border flex items-start justify-between gap-3
                      ${
                        isActive
                          ? "bg-mentra-mintActive/60 border-transparent"
                          : "bg-white/20 border-white/30 hover:bg-white/35"
                      }
                    `}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-mentra-text truncate">
                        {thread.title}
                      </div>
                      <div className="text-xs text-mentra-muted mt-1">
                        {new Date(thread.updatedAt).toLocaleTimeString()}
                      </div>
                    </div>

                    {/* 3 dots menu button (will NOT select chat) */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setMenuForId((prev) =>
                          prev === thread.id ? null : thread.id,
                        );
                      }}
                      className="w-9 h-9 rounded-full bg-white/30 hover:bg-white/50 border border-white/40 flex items-center justify-center transition shrink-0 cursor-pointer"
                      aria-label="Chat options"
                    >
                      <MoreHorizontal size={18} className="text-mentra-text" />
                    </button>
                  </button>

                  {/* Dropdown menu */}
                  {menuForId === thread.id && (
                    <div
                      ref={menuRef}
                      className="absolute right-3 top-[52px] z-[9999] w-44 rounded-xl bg-white shadow-lg border border-gray-200 overflow-hidden"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-gray-50"
                        onClick={() => {
                          setMenuForId(null);
                          onDeleteChat(thread.id);
                        }}
                      >
                        <Trash2 size={16} />
                        Delete chat
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </aside>

      {/* Search Modal */}
      {showSearch && (
        <div
          className="fixed inset-0 z-[9999] bg-black/40 flex items-center justify-center p-4 pointer-events-auto"
          onClick={() => setShowSearch(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-5 shadow-lg pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-gray-900">
                Search Chats
              </h2>
              <button
                onClick={() => setShowSearch(false)}
                className="px-3 py-1.5 rounded-lg hover:bg-gray-100 transition"
              >
                Close
              </button>
            </div>

            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by title..."
              className="w-full border border-gray-300 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-black/10"
            />

            <div className="mt-3 text-sm text-gray-600">
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
          className="fixed inset-0 z-[9999] bg-black/40 flex items-center justify-center p-4 pointer-events-auto"
          onClick={() => setShowSettings(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-5 shadow-lg pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-gray-900">
                Settings
              </h2>
              <button
                onClick={() => setShowSettings(false)}
                className="px-3 py-1.5 rounded-lg hover:bg-gray-100 transition"
              >
                Close
              </button>
            </div>

            <div className="space-y-3 text-sm text-gray-700">
              <div className="rounded-xl border border-gray-200 p-3">
                Account settings coming soon
              </div>

              <div className="rounded-xl border border-gray-200 p-3">
                Theme & preferences coming soon
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
