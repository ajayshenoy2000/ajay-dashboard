"use client";

import { useEffect, useState } from "react";
import { Brain, Check, Pencil, Pin, Plus, Trash2, X } from "lucide-react";
import { MioHeader } from "@/components/chatbot/MioHeader";
import * as api from "@/lib/chatbot/knowledgeApi";

const KINDS = ["preference", "profile", "goal", "project", "relationship", "decision", "other"];

export default function MemoryPage() {
  const [memories, setMemories] = useState<api.MemoryRecord[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [kind, setKind] = useState("preference");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");

  const refresh = () => api.listMemories().then(setMemories).catch((reason) => setError(String(reason)));
  useEffect(() => { void refresh(); }, []);

  async function addMemory(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    setSaving(true); setError("");
    try {
      await api.createMemory({ kind, title: title.trim(), content: content.trim() });
      setTitle(""); setContent(""); await refresh();
    } catch (reason) { setError(String(reason)); } finally { setSaving(false); }
  }

  return (
    <div>
      <MioHeader />
      <section className="rounded-2xl border border-ink/10 bg-white p-4 shadow-soft">
        <div className="mb-3 flex items-center gap-2"><Brain className="h-4 w-4 text-coral" /><div><h2 className="text-sm font-bold">What Mio remembers</h2><p className="text-xs text-ink/40">Everything here is visible, editable, and removable.</p></div></div>
        <form onSubmit={addMemory} className="grid gap-2 sm:grid-cols-[140px_1fr]">
          <select value={kind} onChange={(e) => setKind(e.target.value)} className="h-11 rounded-xl border border-ink/10 bg-mist px-3 text-sm font-semibold outline-none">{KINDS.map((value) => <option key={value}>{value}</option>)}</select>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Short label, e.g. Writing style" maxLength={160} className="h-11 min-w-0 rounded-xl border border-ink/10 bg-mist px-3 text-sm font-semibold outline-none focus:border-sage" />
          <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="What should Mio remember?" maxLength={4000} rows={3} className="min-w-0 resize-none rounded-xl border border-ink/10 bg-mist p-3 text-sm outline-none focus:border-sage sm:col-span-2" />
          <button disabled={saving || !title.trim() || !content.trim()} className="flex h-11 items-center justify-center gap-2 rounded-xl bg-coral px-4 text-sm font-bold text-white disabled:opacity-40 sm:col-span-2"><Plus className="h-4 w-4" />Remember this</button>
        </form>
        {error && <p className="mt-2 text-xs font-semibold text-coral">{error}</p>}
      </section>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {memories.map((memory) => (
          <article key={memory.id} className="min-w-0 rounded-2xl border border-ink/10 bg-white p-4 shadow-soft">
            <div className="flex items-start gap-1"><div className="min-w-0 flex-1"><p className="text-[10px] font-bold uppercase tracking-wider text-coral">{memory.kind} · {memory.sourceType}</p><h3 className="truncate text-sm font-bold text-ink">{memory.title}</h3></div><button onClick={() => { setEditingId(memory.id); setEditingContent(memory.content); }} aria-label="Edit memory" className="rounded-lg p-2 text-ink/30 hover:text-sage"><Pencil className="h-4 w-4" /></button><button onClick={async () => { await api.updateMemory(memory.id, { pinned: !memory.pinned }); await refresh(); }} aria-label="Pin memory" className={`rounded-lg p-2 ${memory.pinned ? "bg-coral/10 text-coral" : "text-ink/30"}`}><Pin className="h-4 w-4" /></button><button onClick={async () => { if (!window.confirm(`Delete ${memory.title} from Mio's memory?`)) return; await api.deleteMemory(memory.id); await refresh(); }} aria-label="Delete memory" className="rounded-lg p-2 text-ink/30 hover:text-coral"><Trash2 className="h-4 w-4" /></button></div>
            {editingId === memory.id ? <div className="mt-2"><textarea value={editingContent} onChange={(e) => setEditingContent(e.target.value)} rows={4} maxLength={4000} className="w-full resize-y rounded-xl border border-sage/40 bg-mist p-2.5 text-sm outline-none" /><div className="mt-1 flex justify-end gap-1"><button onClick={() => setEditingId(null)} aria-label="Cancel edit" className="rounded-lg p-2 text-ink/40"><X className="h-4 w-4" /></button><button onClick={async () => { await api.updateMemory(memory.id, { content: editingContent.trim() }); setEditingId(null); await refresh(); }} disabled={!editingContent.trim()} aria-label="Save memory" className="rounded-lg bg-sage p-2 text-white disabled:opacity-40"><Check className="h-4 w-4" /></button></div></div> : <p className="mt-2 whitespace-pre-wrap text-sm leading-5 text-ink/65">{memory.content}</p>}
          </article>
        ))}
        {!memories.length && <div className="sm:col-span-2 rounded-2xl border border-dashed border-ink/15 p-8 text-center text-sm font-semibold text-ink/35">No memories yet. Tell Mio what matters, or add one above.</div>}
      </div>
    </div>
  );
}
