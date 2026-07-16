import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/server/auth";
import type { ChatAttachment } from "@/lib/chatbot/types";

export const dynamic = "force-dynamic";

const BUCKET = "chat-attachments";
const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/json",
]);

function safeName(name: string) {
  return name.normalize("NFKC").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(-100) || "attachment";
}

function normalizedMediaType(type: string, name: string) {
  if (type) return type;
  const extension = name.split(".").pop()?.toLowerCase();
  return ({ md: "text/markdown", txt: "text/plain", csv: "text/csv", json: "application/json" } as Record<string, string>)[extension ?? ""] ?? "";
}

function ownsPath(userId: string, path: string) {
  return path.startsWith(`${userId}/`) && !path.includes("..") && path.length < 500;
}

export async function POST(req: NextRequest) {
  const auth = await getAuthContext(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const name = String(body.name ?? "").slice(0, 160);
  const size = Number(body.size ?? 0);
  const mediaType = normalizedMediaType(String(body.mediaType ?? ""), name);
  if (!name) return NextResponse.json({ error: "file name is required" }, { status: 400 });
  if (!ALLOWED_TYPES.has(mediaType)) return NextResponse.json({ error: "Unsupported file type" }, { status: 415 });
  if (!size || size > MAX_BYTES) return NextResponse.json({ error: "Files must be between 1 byte and 10 MB" }, { status: 413 });

  const id = crypto.randomUUID();
  const storagePath = `${auth.userId}/${id}/${safeName(name)}`;
  const { data, error } = await auth.db.storage.from(BUCKET).createSignedUploadUrl(storagePath);
  if (error || !data) return NextResponse.json({ error: `Upload preparation failed: ${error?.message ?? "unknown error"}` }, { status: 500 });

  const attachment: ChatAttachment = {
    id,
    name,
    mediaType,
    size,
    storagePath,
  };
  return NextResponse.json({ attachment, token: data.token });
}

export async function GET(req: NextRequest) {
  const auth = await getAuthContext(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const path = req.nextUrl.searchParams.get("path") ?? "";
  if (!ownsPath(auth.userId, path)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data, error } = await auth.db.storage.from(BUCKET).download(path);
  if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return new NextResponse(data, {
    headers: {
      "Content-Type": data.type || "application/octet-stream",
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
