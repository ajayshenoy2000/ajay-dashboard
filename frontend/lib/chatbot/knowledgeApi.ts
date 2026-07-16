import { authFetch } from "@/lib/authFetch";

export type MemoryRecord = {
  id: string;
  kind: string;
  title: string;
  content: string;
  confidence: number;
  sourceType: string;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
};

export type LibraryRecord = {
  id: string;
  name: string;
  description: string | null;
  color: string;
  itemCount: number;
  createdAt: string;
  updatedAt: string;
};

async function json<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await authFetch(path, init);
  if (!res.ok) throw new Error((await res.text().catch(() => "")) || "Request failed");
  return res.json();
}

export const listMemories = () => json<MemoryRecord[]>("/api/chat/memories", { cache: "no-store" });
export const createMemory = (input: { kind: string; title: string; content: string; pinned?: boolean }) => json<MemoryRecord>("/api/chat/memories", {
  method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input),
});
export const updateMemory = (id: string, patch: Partial<Pick<MemoryRecord, "kind" | "title" | "content" | "pinned">>) => json(`/api/chat/memories/${id}`, {
  method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch),
});
export async function deleteMemory(id: string) {
  await json(`/api/chat/memories/${id}`, { method: "DELETE" });
}

export const listLibraries = () => json<LibraryRecord[]>("/api/chat/libraries", { cache: "no-store" });
export const createLibrary = (input: { name: string; description?: string }) => json<{ id: string }>("/api/chat/libraries", {
  method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input),
});
export const getLibrary = (id: string) => json<{ library: Record<string, unknown>; items: Array<{ id: string; title: string; source_type: string; status: string; created_at: string }> }>(`/api/chat/libraries/${id}`, { cache: "no-store" });
export const addLibraryItem = (libraryId: string, input: { title: string; content: string; sourceType?: string }) => json(`/api/chat/libraries/${libraryId}/items`, {
  method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input),
});
export async function deleteLibrary(id: string) {
  await json(`/api/chat/libraries/${id}`, { method: "DELETE" });
}
export async function deleteLibraryItem(libraryId: string, itemId: string) {
  await json(`/api/chat/libraries/${libraryId}/items/${itemId}`, { method: "DELETE" });
}
