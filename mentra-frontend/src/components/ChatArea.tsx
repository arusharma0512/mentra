import MessageBubble from "./MessageBubble";
import InputBar from "./InputBar";
import type { ChatThread } from "../types";

export default function ChatArea({
  thread,
  onSend,
}: {
  thread: ChatThread;
  onSend: (text: string) => void;
}) {
  return (
    <main className="flex-1 h-full bg-mentra-bg flex justify-center">
      <div className="w-full max-w-3xl flex flex-col h-full px-6 py-8">
        <div className="text-base font-semibold text-mentra-text mb-6">
          {thread.title}
        </div>

        <div className="flex-1 flex flex-col gap-6 overflow-y-auto pb-6">
          {thread.messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}
        </div>

        <InputBar onSend={onSend} />
      </div>
    </main>
  );
}
