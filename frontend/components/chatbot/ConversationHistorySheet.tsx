"use client";

import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { BottomSheet } from "@/components/BottomSheet";
import * as chatbotApi from "@/lib/chatbot/api";
import type { Conversation } from "@/lib/chatbot/types";

export function ConversationHistorySheet({
  open,
  onClose,
  activeId,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  activeId: string | null;
  onSelect: (id: string) => void;
}) {
  const [conversations, setConversations] = useState<Conversation[]>([]);

  useEffect(() => {
    if (open) chatbotApi.listConversations().then(setConversations);
  }, [open]);

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    setConversations((prev) => prev.filter((c) => c.id !== id));
    await chatbotApi.deleteConversation(id);
  }

  if (!open) return null;

  return (
    <BottomSheet open={open} onClose={onClose} title="Conversations">
      {conversations.length ? (
        <div className="space-y-1">
          {conversations.map((c) => (
            <button
              key={c.id}
              onClick={() => {
                onSelect(c.id);
                onClose();
              }}
              className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left transition ${
                c.id === activeId ? "bg-mist" : "hover:bg-mist"
              }`}
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink/80">{c.title || "New conversation"}</p>
                <p className="text-[11px] text-ink/40">{new Date(c.updatedAt).toLocaleString()}</p>
              </div>
              <span
                onClick={(e) => handleDelete(c.id, e)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink/25 transition hover:bg-coral/10 hover:text-coral"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </span>
            </button>
          ))}
        </div>
      ) : (
        <p className="py-4 text-center text-sm text-ink/40">No conversations yet.</p>
      )}
    </BottomSheet>
  );
}
