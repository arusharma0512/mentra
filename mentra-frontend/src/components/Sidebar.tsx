import type { ChatThread } from "../types";

export default function Sidebar({
  threads,
  activeId,
  onNewChat,
  onSelectChat,
}: {
  threads: ChatThread[];
  activeId: string | null;
  onNewChat: () => void;
  onSelectChat: (id: string) => void;
}) {
  return (
    <aside className="w-[320px] h-full bg-mentra-mintSoft border-r border-mentra-border flex">
      <div className="flex-1 p-5 pr-4">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-9 h-9 rounded-full bg-mentra-mint/70 flex items-center justify-center">
            🌿
          </div>
          <h1 className="text-xl font-semibold text-mentra-text">Mentra</h1>
        </div>

        <button
          onClick={onNewChat}
          className="w-full rounded-full bg-mentra-mintDark/60 text-white text-sm py-2.5 px-4 flex items-center gap-2 hover:opacity-95 transition"
        >
          ＋ New Chat
        </button>

        <div className="mt-6 space-y-3">
          {threads.map((thread) => (
            <button
              key={thread.id}
              onClick={() => onSelectChat(thread.id)}
              className={`w-full text-left rounded-2xl px-4 py-3 transition border
                ${
                  thread.id === activeId
                    ? "bg-mentra-mintActive/60 border-transparent"
                    : "bg-white/20 border-white/30 hover:bg-white/35"
                }
              `}
            >
              <div className="text-sm font-semibold text-mentra-text">
                {thread.title}
              </div>
              <div className="text-xs text-mentra-muted mt-1">
                {new Date(thread.updatedAt).toLocaleTimeString()}
              </div>
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}
