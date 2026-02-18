import type { ChatMessage } from "../types";

export default function MessageBubble({ message }: { message: ChatMessage }) {
  const isAssistant = message.role === "assistant";

  return (
    <div
      className={`flex gap-3 ${isAssistant ? "justify-start" : "justify-end"}`}
    >
      {isAssistant && (
        <div className="w-10 h-10 rounded-full bg-white/70 border border-white/50 flex items-center justify-center shrink-0">
          👩
        </div>
      )}

      <div
        className={`px-5 py-3 rounded-2xl text-sm leading-relaxed shadow-sm max-w-[75%] ${
          isAssistant
            ? "bg-mentra-mintActive text-mentra-text shadow-sm"
            : "bg-white border border-mentra-border shadow-sm"
        }`}
      >
        {message.content}
      </div>
    </div>
  );
}
