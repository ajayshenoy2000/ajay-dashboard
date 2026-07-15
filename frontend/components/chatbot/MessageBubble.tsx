import { Sparkles, User } from "lucide-react";
import type { ChatMessage } from "@/lib/chatbot/types";

export function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex items-start gap-2.5 ${isUser ? "flex-row-reverse" : ""}`}>
      <div
        className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
          isUser ? "bg-coral/15 text-coral" : "bg-coral/12 text-coral"
        }`}
      >
        {isUser ? <User className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
      </div>
      <div
        className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-6 ${
          isUser ? "bg-coral text-white" : "border border-ink/10 bg-white text-ink/85 shadow-soft"
        }`}
      >
        {message.content || "…"}
      </div>
    </div>
  );
}
