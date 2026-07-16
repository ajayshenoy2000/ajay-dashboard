import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/server/auth";

const MAX_CONTENT = 250_000;

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getAuthContext(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const title = String(body.title ?? "").trim();
  const content = String(body.content ?? "").trim();
  if (!title || !content) return NextResponse.json({ error: "title and content are required" }, { status: 400 });
  if (content.length > MAX_CONTENT) return NextResponse.json({ error: "Pasted sources are limited to 250,000 characters" }, { status: 413 });
  const { data: library } = await auth.db.from("mio_libraries").select("id").eq("user_id", auth.userId).eq("id", params.id).maybeSingle();
  if (!library) return NextResponse.json({ error: "Library not found" }, { status: 404 });

  const { data: item, error } = await auth.db.from("mio_library_items").insert({
    library_id: params.id,
    user_id: auth.userId,
    title: title.slice(0, 200),
    source_type: String(body.sourceType ?? "paste"),
    original_content: content,
    status: "ready",
  }).select("*").single();
  if (error || !item) return NextResponse.json({ error: error?.message ?? "Could not save source" }, { status: 500 });

  const chunks = chunkText(content).map((chunk, index) => ({
    item_id: item.id,
    library_id: params.id,
    user_id: auth.userId,
    chunk_index: index,
    content: chunk,
    token_estimate: Math.ceil(chunk.length / 4),
  }));
  const { error: chunkError } = await auth.db.from("mio_library_chunks").insert(chunks);
  if (chunkError) {
    await auth.db.from("mio_library_items").update({ status: "failed" }).eq("id", item.id);
    return NextResponse.json({ error: chunkError.message }, { status: 500 });
  }
  await auth.db.from("mio_libraries").update({ updated_at: new Date().toISOString() }).eq("id", params.id);
  return NextResponse.json({ id: item.id, title: item.title, chunks: chunks.length }, { status: 201 });
}

function chunkText(content: string) {
  const paragraphs = content.split(/\n{2,}/).map((part) => part.trim()).filter(Boolean);
  const chunks: string[] = [];
  let current = "";
  for (const paragraph of paragraphs) {
    if ((current.length + paragraph.length) > 1800 && current) {
      chunks.push(current.trim());
      current = `${current.slice(-180)}\n\n${paragraph}`;
    } else {
      current += `${current ? "\n\n" : ""}${paragraph}`;
    }
    while (current.length > 2200) {
      chunks.push(current.slice(0, 1800));
      current = current.slice(1620);
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks.length ? chunks : [content.slice(0, 1800)];
}
