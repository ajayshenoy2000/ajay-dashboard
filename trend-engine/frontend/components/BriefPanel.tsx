"use client";

import { Clipboard, Copy } from "lucide-react";
import type { Brief } from "@/lib/types";

export function BriefPanel({ brief }: { brief: Brief }) {
  const copyText = [
    brief.titleOptions[0],
    "",
    brief.hook,
    brief.conclusion,
    "",
    ...brief.outline.map((item, index) => `${index + 1}. ${item}`),
    "",
    "CTA:",
    brief.cta
  ].join("\n");

  return (
    <section className="rounded-md border border-ink/10 bg-white p-4 shadow-soft">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase text-coral">Ready-to-shoot</p>
          <h2 className="text-xl font-bold">3-5 Minute Brief</h2>
        </div>
        <button
          className="flex min-h-11 items-center gap-2 rounded-md bg-ink px-3 text-sm font-bold text-white"
          onClick={() => navigator.clipboard.writeText(copyText)}
          type="button"
        >
          <Copy className="h-4 w-4" />
          Copy
        </button>
      </div>
      <div className="space-y-5">
        <Block title="Title Options" items={brief.titleOptions} />
        <div className="rounded-md bg-mist p-3">
          <div className="mb-2 flex items-center gap-2 text-sm font-bold">
            <Clipboard className="h-4 w-4" />
            Hook
          </div>
          <p className="text-sm leading-6 text-ink/75">{brief.hook}</p>
        </div>
        <Block title="Outline" items={brief.outline} numbered />
        <Block title="Talking Points" items={brief.talkingPoints} />
        <Block title="Risks To Mention" items={brief.risksToMention} />
        <div>
          <h3 className="mb-2 text-sm font-bold">Soft CTA</h3>
          <p className="text-sm leading-6 text-ink/75">{brief.cta}</p>
        </div>
      </div>
    </section>
  );
}

function Block({ title, items, numbered = false }: { title: string; items: string[]; numbered?: boolean }) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-bold">{title}</h3>
      <ol className="space-y-2">
        {items.map((item, index) => (
          <li key={item} className="flex gap-2 text-sm leading-6 text-ink/75">
            <span className="mt-0.5 flex h-5 min-w-5 items-center justify-center rounded-md bg-sage/15 text-xs font-bold text-sage">
              {numbered ? index + 1 : "•"}
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
