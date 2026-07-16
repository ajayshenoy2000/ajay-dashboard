"use client";

import { ChatThread } from "@/components/chatbot/ChatThread";
import { MioHeader } from "@/components/chatbot/MioHeader";

export default function ChatPage() {
  return (
    <div>
      <MioHeader />
      <ChatThread />
    </div>
  );
}
