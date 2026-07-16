"use client";

import { useParams } from "next/navigation";
import { ChatThread } from "@/components/chatbot/ChatThread";
import { MioHeader } from "@/components/chatbot/MioHeader";

export default function ChatConversationPage() {
  const { conversationId } = useParams<{ conversationId: string }>();
  return (
    <div>
      <MioHeader />
      <ChatThread conversationId={conversationId} />
    </div>
  );
}
