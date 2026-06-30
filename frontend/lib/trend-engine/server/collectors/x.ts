import type { SourceItem } from "@/lib/types";

// X/Twitter API has no credits — always returns empty.
// The scoring engine handles missing X data gracefully.
export async function collectXPosts(_keywords: string[], _hours: number = 24): Promise<SourceItem[]> {
  return [];
}
