"use client";

import { useParams } from "next/navigation";
import { Sparkles } from "lucide-react";
import { ChatThread } from "@/components/chatbot/ChatThread";

export default function ChatConversationPage() {
  const { conversationId } = useParams<{ conversationId: string }>();
  return (
    <div>
      <div className="mb-4 flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-coral/12 text-coral">
          <Sparkles className="h-5 w-5" />
        </span>
        <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">PowerChat</h1>
      </div>
      <ChatThread conversationId={conversationId} />
    </div>
  );
}
