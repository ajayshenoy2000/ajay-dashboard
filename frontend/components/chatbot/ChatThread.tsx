"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Image as ImageIcon, Loader2, Paperclip, Send, X } from "lucide-react";
import { MessageBubble } from "./MessageBubble";
import { ConversationHistorySheet } from "./ConversationHistorySheet";
import { useRegisterChatControls } from "@/components/nav/NavControlsProvider";
import * as chatbotApi from "@/lib/chatbot/api";
import { haptic } from "@/lib/haptics";
import type { ChatAttachment, ChatMessage } from "@/lib/chatbot/types";

const ACCEPTED_FILES = "image/jpeg,image/png,image/webp,image/gif,application/pdf,text/plain,text/markdown,text/csv,application/json,.md,.txt,.csv,.json";
const MAX_FILE_BYTES = 10 * 1024 * 1024;

type PendingFile = { id: string; file: File; previewUrl?: string };

export function ChatThread({ conversationId: initialConversationId }: { conversationId?: string }) {
  const router = useRouter();
  const [conversationId, setConversationId] = useState<string | undefined>(initialConversationId);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!initialConversationId) return;
    chatbotApi.getConversation(initialConversationId).then((data) => {
      if (!data) return;
      setMessages(data.messages);
    });
  }, [initialConversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if ((!text && !pendingFiles.length) || sending) return;
    haptic(10);
    setSending(true);
    let assistantId: string | null = null;

    try {
      const attachments = await Promise.all(pendingFiles.map(({ file }) => chatbotApi.uploadAttachment(file)));
      const userMsg: ChatMessage = {
        id: `local-${Date.now()}`,
        role: "user",
        content: text,
        attachments,
        createdAt: new Date().toISOString(),
      };
      const nextAssistantId = `local-${Date.now()}-a`;
      assistantId = nextAssistantId;
      setInput("");
      clearPendingFiles();
      setMessages((prev) => [...prev, userMsg, {
        id: nextAssistantId,
        role: "assistant",
        content: "",
        attachments: [],
        createdAt: new Date().toISOString(),
      }]);

      const { conversationId: newId } = await chatbotApi.sendMessage(conversationId, text, attachments, (textSoFar) => {
        setMessages((prev) => prev.map((m) => (m.id === nextAssistantId ? { ...m, content: textSoFar } : m)));
      });
      if (!conversationId && newId) {
        setConversationId(newId);
        router.replace(`/chat/${newId}`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Could not send this message";
      if (assistantId) {
        setMessages((prev) => prev.map((message) => (
          message.id === assistantId ? { ...message, content: `Something went wrong: ${errorMessage}` } : message
        )));
      } else {
        setFileError(errorMessage);
      }
    } finally {
      setSending(false);
    }
  }

  function selectFiles(files: FileList | null) {
    if (!files) return;
    const available = Math.max(0, 4 - pendingFiles.length);
    const chosen = Array.from(files).slice(0, available);
    const invalid = chosen.find((file) => file.size > MAX_FILE_BYTES);
    if (invalid) {
      setFileError(`${invalid.name} is larger than 10 MB.`);
      return;
    }
    setFileError(files.length > available ? "You can attach up to 4 files." : null);
    setPendingFiles((current) => [...current, ...chosen.map((file) => ({
      id: crypto.randomUUID(),
      file,
      previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined,
    }))]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removePendingFile(id: string) {
    setPendingFiles((current) => {
      const item = current.find((entry) => entry.id === id);
      if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
      return current.filter((entry) => entry.id !== id);
    });
  }

  function clearPendingFiles() {
    setPendingFiles((current) => {
      current.forEach((item) => item.previewUrl && URL.revokeObjectURL(item.previewUrl));
      return [];
    });
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

  // Publish Mio's new-chat and history controls to the bottom dock.
  useRegisterChatControls({
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
            <p className="text-sm font-semibold text-ink/55">Hi, I’m Mio.</p>
            <p className="mt-1 text-xs text-ink/35">Ask about your trends, ads, schedule, tasks, memories, or saved knowledge.</p>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={handleSend}
        className="sticky bottom-[calc(5.5rem+var(--safe-bottom))] rounded-2xl border border-ink/10 bg-white p-2 shadow-[0_8px_32px_rgba(24,33,31,0.12)]"
      >
        {pendingFiles.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2 px-1 pt-1">
            {pendingFiles.map((item) => (
              <div key={item.id} className="relative flex max-w-full items-center gap-2 rounded-xl bg-mist px-2.5 py-2 pr-8">
                {item.previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.previewUrl} alt="" className="h-10 w-10 rounded-lg object-cover" />
                ) : <FileText className="h-5 w-5 shrink-0 text-sage" />}
                <span className="max-w-36 truncate text-xs font-semibold text-ink/70">{item.file.name}</span>
                <button type="button" onClick={() => removePendingFile(item.id)} aria-label={`Remove ${item.file.name}`} className="absolute right-1.5 top-1.5 rounded-full p-1 text-ink/45">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
        {fileError && <p className="mb-2 px-2 text-xs font-semibold text-coral">{fileError}</p>}
        <div className="flex items-center gap-2">
          <input ref={fileInputRef} type="file" multiple accept={ACCEPTED_FILES} onChange={(e) => selectFiles(e.target.files)} className="hidden" />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={sending || pendingFiles.length >= 4}
            aria-label="Attach image or file"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-mist text-ink/55 disabled:opacity-40"
          >
            {pendingFiles.some((item) => item.file.type.startsWith("image/")) ? <ImageIcon className="h-4 w-4" /> : <Paperclip className="h-4 w-4" />}
          </button>
          <input
            value={input}
            onChange={(e) => { setInput(e.target.value); setFileError(null); }}
            placeholder="Message…"
            className="min-h-11 min-w-0 flex-1 rounded-xl border border-ink/10 bg-mist px-3 text-sm font-semibold outline-none focus:border-sage"
          />
          <button
            type="submit"
            disabled={(!input.trim() && !pendingFiles.length) || sending}
            aria-label="Send"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-coral text-white disabled:cursor-not-allowed disabled:bg-ink/20"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
      </form>
    </div>
  );
}
