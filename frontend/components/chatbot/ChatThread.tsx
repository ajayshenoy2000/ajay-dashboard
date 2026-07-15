"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { MessageBubble } from "./MessageBubble";
import { ConversationHistorySheet } from "./ConversationHistorySheet";
import { useRegisterChatControls } from "@/components/nav/NavControlsProvider";
import * as chatbotApi from "@/lib/chatbot/api";
import { haptic } from "@/lib/haptics";
import { NEMOTRON } from "@/lib/ai/models";
import type { ChatMessage } from "@/lib/chatbot/types";

export function ChatThread({ conversationId: initialConversationId }: { conversationId?: string }) {
  const router = useRouter();
  const [conversationId, setConversationId] = useState<string | undefined>(initialConversationId);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [model, setModel] = useState(NEMOTRON);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!initialConversationId) return;
    chatbotApi.getConversation(initialConversationId).then((data) => {
      if (!data) return;
      setMessages(data.messages);
      setModel(data.conversation.model);
    });
  }, [initialConversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;
    haptic(10);
    setInput("");
    setSending(true);

    const userMsg: ChatMessage = { id: `local-${Date.now()}`, role: "user", content: text, createdAt: new Date().toISOString() };
    const assistantId = `local-${Date.now()}-a`;
    setMessages((prev) => [...prev, userMsg, { id: assistantId, role: "assistant", content: "", createdAt: new Date().toISOString() }]);

    try {
      const { conversationId: newId } = await chatbotApi.sendMessage(conversationId, model, text, (textSoFar) => {
        setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, content: textSoFar } : m)));
      });
      if (!conversationId && newId) {
        setConversationId(newId);
        router.replace(`/chat/${newId}`);
      }
    } catch (err) {
      setMessages((prev) =>
        prev.map((m) => (m.id === assistantId ? { ...m, content: `Something went wrong: ${err}` } : m)),
      );
    } finally {
      setSending(false);
    }
  }

  const handleSelectConversation = useCallback((id: string) => {
    router.push(`/chat/${id}`);
  }, [router]);

  const handleNewChat = useCallback(() => {
    setConversationId(undefined);
    setMessages([]);
    router.push("/chat");
  }, [router]);

  const openHistory = useCallback(() => setHistoryOpen(true), []);

  // Publish PowerChat's controls (model switcher, new chat, history) to the
  // bottom nav, so they live in the primary nav bar instead of the page.
  useRegisterChatControls({
    model,
    onModelChange: setModel,
    onNewChat: handleNewChat,
    onOpenHistory: openHistory,
  });

  return (
    <div className="flex min-h-[calc(100vh-140px)] flex-col">
      <ConversationHistorySheet
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        activeId={conversationId ?? null}
        onSelect={handleSelectConversation}
      />

      <div className="flex-1 space-y-4 pb-4">
        {messages.length ? (
          messages.map((m) => <MessageBubble key={m.id} message={m} />)
        ) : (
          <div className="rounded-2xl border border-ink/10 bg-white px-6 py-10 text-center shadow-soft">
            <p className="text-sm font-semibold text-ink/40">Ask me anything.</p>
            <p className="mt-1 text-xs text-ink/30">I can search your trends, ads, schedule, and tasks—and take supported actions for you.</p>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={handleSend}
        className="sticky bottom-[calc(5.5rem+var(--safe-bottom))] flex items-center gap-2 rounded-2xl border border-ink/10 bg-white p-2 shadow-[0_8px_32px_rgba(24,33,31,0.12)]"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Message…"
          className="min-h-11 flex-1 rounded-xl border border-ink/10 bg-mist px-3 text-sm font-semibold outline-none focus:border-sage"
        />
        <button
          type="submit"
          disabled={!input.trim() || sending}
          aria-label="Send"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-coral text-white disabled:cursor-not-allowed disabled:bg-ink/20"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
