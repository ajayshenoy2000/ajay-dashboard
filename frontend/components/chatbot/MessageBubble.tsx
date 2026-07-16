import { FileText, Sparkles, User } from "lucide-react";
import type { ChatMessage } from "@/lib/chatbot/types";
import { attachmentUrl } from "@/lib/chatbot/api";

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
        className={`max-w-[82%] overflow-hidden whitespace-pre-wrap rounded-2xl px-3 py-2.5 text-sm leading-6 ${
          isUser ? "bg-coral text-white" : "border border-ink/10 bg-white text-ink/85 shadow-soft"
        }`}
      >
        {message.attachments.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {message.attachments.map((attachment) => attachment.mediaType.startsWith("image/") ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={attachment.id}
                src={attachmentUrl(attachment.storagePath)}
                alt={attachment.name}
                className="max-h-56 w-full max-w-64 rounded-xl object-cover"
              />
            ) : (
              <a
                key={attachment.id}
                href={attachmentUrl(attachment.storagePath)}
                target="_blank"
                rel="noreferrer"
                className="flex max-w-full items-center gap-2 rounded-xl bg-white/15 px-3 py-2 text-xs font-semibold"
              >
                <FileText className="h-4 w-4 shrink-0" />
                <span className="truncate">{attachment.name}</span>
              </a>
            ))}
          </div>
        )}
        {message.content ? <LinkifiedText text={message.content} /> : (message.role === "assistant" ? "…" : null)}
      </div>
    </div>
  );
}

function LinkifiedText({ text }: { text: string }) {
  const parts = text.split(/((?:https?:\/\/[^\s]+)|(?:\/(?:trends|briefs|metascraper|schedule|tasks|chat)(?:\/[^\s)]*)?))/g);
  return <>{parts.map((part, index) => {
    if (!/^(?:https?:\/\/|\/(?:trends|briefs|metascraper|schedule|tasks|chat))/.test(part)) return <span key={index}>{part}</span>;
    const clean = part.replace(/[.,;:!?]+$/, "");
    const suffix = part.slice(clean.length);
    return <span key={index}><a href={clean} target={clean.startsWith("http") ? "_blank" : undefined} rel={clean.startsWith("http") ? "noreferrer" : undefined} className={`font-bold underline underline-offset-2 ${text ? "decoration-current/40" : ""}`}>{clean}</a>{suffix}</span>;
  })}</>;
}
