"use client";

import { useEffect, useState } from "react";
import { BookOpen, Library, Plus, Trash2 } from "lucide-react";
import { MioHeader } from "@/components/chatbot/MioHeader";
import * as api from "@/lib/chatbot/knowledgeApi";

export default function LibrariesPage() {
  const [libraries, setLibraries] = useState<api.LibraryRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Awaited<ReturnType<typeof api.getLibrary>> | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [sourceTitle, setSourceTitle] = useState("");
  const [sourceContent, setSourceContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const refresh = async () => {
    const rows = await api.listLibraries(); setLibraries(rows);
    if (!selectedId && rows[0]) setSelectedId(rows[0].id);
  };
  useEffect(() => { refresh().catch((reason) => setError(String(reason))); }, []);
  useEffect(() => { if (selectedId) api.getLibrary(selectedId).then(setDetail).catch((reason) => setError(String(reason))); else setDetail(null); }, [selectedId]);

  async function create(e: React.FormEvent) {
    e.preventDefault(); if (!name.trim()) return; setBusy(true); setError("");
    try { const row = await api.createLibrary({ name, description }); setName(""); setDescription(""); await refresh(); setSelectedId(row.id); }
    catch (reason) { setError(String(reason)); } finally { setBusy(false); }
  }

  async function addSource(e: React.FormEvent) {
    e.preventDefault(); if (!selectedId || !sourceTitle.trim() || !sourceContent.trim()) return; setBusy(true); setError("");
    try { await api.addLibraryItem(selectedId, { title: sourceTitle, content: sourceContent }); setSourceTitle(""); setSourceContent(""); setDetail(await api.getLibrary(selectedId)); await refresh(); }
    catch (reason) { setError(String(reason)); } finally { setBusy(false); }
  }

  return (
    <div>
      <MioHeader />
      <div className="grid gap-4 md:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="min-w-0 rounded-2xl border border-ink/10 bg-white p-3 shadow-soft">
          <div className="mb-2 flex items-center gap-2 px-1"><Library className="h-4 w-4 text-coral" /><h2 className="text-sm font-bold">Libraries</h2></div>
          <div className="space-y-1">{libraries.map((library) => <button key={library.id} onClick={() => setSelectedId(library.id)} className={`flex w-full min-w-0 items-center gap-2 rounded-xl px-3 py-2.5 text-left ${selectedId === library.id ? "bg-coral/10 text-coral" : "bg-mist/60 text-ink/60"}`}><BookOpen className="h-4 w-4 shrink-0" /><span className="min-w-0 flex-1 truncate text-sm font-bold">{library.name}</span><span className="text-[10px] font-bold opacity-60">{library.itemCount}</span></button>)}</div>
          <form onSubmit={create} className="mt-3 space-y-2 border-t border-ink/8 pt-3"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="New library" maxLength={120} className="h-10 w-full min-w-0 rounded-xl bg-mist px-3 text-sm font-semibold outline-none" /><input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description" maxLength={500} className="h-10 w-full min-w-0 rounded-xl bg-mist px-3 text-xs outline-none" /><button disabled={busy || !name.trim()} className="flex h-10 w-full items-center justify-center gap-1.5 rounded-xl bg-ink text-xs font-bold text-white disabled:opacity-40"><Plus className="h-4 w-4" />Create library</button></form>
        </aside>

        <section className="min-w-0 rounded-2xl border border-ink/10 bg-white p-4 shadow-soft">
          {selectedId && detail ? <>
            <div className="mb-4 flex items-start gap-2"><div className="min-w-0 flex-1"><h2 className="truncate text-lg font-bold">{String(detail.library.name)}</h2><p className="text-xs text-ink/40">Paste exports, notes, research, or reference material. Mio retrieves only relevant passages.</p></div><button onClick={async () => { if (!window.confirm(`Delete the ${String(detail.library.name)} library and all its sources?`)) return; await api.deleteLibrary(selectedId); setSelectedId(null); setDetail(null); await refresh(); }} aria-label="Delete library" className="rounded-xl p-2 text-ink/30 hover:text-coral"><Trash2 className="h-4 w-4" /></button></div>
            <form onSubmit={addSource} className="space-y-2"><input value={sourceTitle} onChange={(e) => setSourceTitle(e.target.value)} placeholder="Source title, e.g. ChatGPT memory export" maxLength={200} className="h-11 w-full min-w-0 rounded-xl border border-ink/10 bg-mist px-3 text-sm font-semibold outline-none focus:border-sage" /><textarea value={sourceContent} onChange={(e) => setSourceContent(e.target.value)} placeholder="Paste text here…" maxLength={250000} rows={8} className="w-full min-w-0 resize-y rounded-xl border border-ink/10 bg-mist p-3 text-sm leading-5 outline-none focus:border-sage" /><div className="flex items-center justify-between gap-2"><span className="text-[10px] font-semibold text-ink/30">{sourceContent.length.toLocaleString()} / 250,000 characters</span><button disabled={busy || !sourceTitle.trim() || !sourceContent.trim()} className="flex h-10 items-center gap-1.5 rounded-xl bg-coral px-4 text-xs font-bold text-white disabled:opacity-40"><Plus className="h-4 w-4" />Add source</button></div></form>
            <div className="mt-5 border-t border-ink/8 pt-4"><h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-ink/35">Sources</h3><div className="grid gap-2 sm:grid-cols-2">{detail.items.map((item) => <div key={item.id} className="flex min-w-0 items-center gap-2 rounded-xl bg-mist p-3"><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-ink/70">{item.title}</p><p className="mt-1 text-[10px] font-semibold uppercase text-ink/35">{item.source_type} · {item.status}</p></div><button onClick={async () => { if (!window.confirm(`Remove ${item.title} from this library?`)) return; await api.deleteLibraryItem(selectedId, item.id); setDetail(await api.getLibrary(selectedId)); await refresh(); }} aria-label={`Delete ${item.title}`} className="rounded-lg p-2 text-ink/30 hover:text-coral"><Trash2 className="h-4 w-4" /></button></div>)}{!detail.items.length && <p className="text-sm text-ink/35">No sources yet.</p>}</div></div>
          </> : <div className="flex min-h-72 items-center justify-center text-center"><div><Library className="mx-auto h-8 w-8 text-ink/20" /><p className="mt-2 text-sm font-semibold text-ink/35">Create a library to give Mio durable knowledge.</p></div></div>}
          {error && <p className="mt-3 text-xs font-semibold text-coral">{error}</p>}
        </section>
      </div>
    </div>
  );
}
