import type { SourceItem } from "@/lib/types";
import { tokenKey } from "./text";

export function dedupeSources(items: SourceItem[]): SourceItem[] {
  const seen = new Set<string>();
  const unique: SourceItem[] = [];
  for (const item of items) {
    const key = tokenKey(`${item.keyword}:${item.title}:${item.text}`).slice(0, 120);
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(item);
  }
  return unique;
}

export function clusterByKeyword(items: SourceItem[]): Record<string, SourceItem[]> {
  const clusters: Record<string, SourceItem[]> = {};
  for (const item of dedupeSources(items)) {
    (clusters[item.keyword] ??= []).push(item);
  }
  return clusters;
}
