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
            <div
              key={c.id}
              className={`flex w-full items-center gap-1 rounded-xl px-1 py-1 transition ${
                c.id === activeId ? "bg-mist" : "hover:bg-mist"
              }`}
            >
              <button
                onClick={() => { onSelect(c.id); onClose(); }}
                className="min-w-0 flex-1 rounded-lg px-2 py-1.5 text-left"
              >
                <p className="truncate text-sm font-semibold text-ink/80">{c.title || "New conversation"}</p>
                <p className="text-[11px] text-ink/40">{new Date(c.updatedAt).toLocaleString()}</p>
              </button>
              <button
                onClick={(e) => handleDelete(c.id, e)}
                aria-label={`Delete ${c.title || "conversation"}`}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink/25 transition hover:bg-coral/10 hover:text-coral"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="py-4 text-center text-sm text-ink/40">No conversations yet.</p>
      )}
    </BottomSheet>
  );
}
