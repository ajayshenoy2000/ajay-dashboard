// Hunt-command generator (§6). Builds the self-contained instruction the user
// pastes to Claude-in-Chrome. Precise enough that extraction needs no follow-up,
// and — when an ingest URL is configured — it tells Claude to POST the result
// straight to the backend so there's nothing to import by hand.

import type { AppConfig, Niche } from "./types";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

// Scope identifiers actually queried this run — bounds the backend's "killed"
// sweep so a partial hunt never false-kills untouched niches (§8).
export function huntScope(config: AppConfig): string[] {
  const scope = new Set<string>();
  for (const niche of config.niches.filter((n) => n.enabled)) {
    scope.add(niche.id);
    for (const c of niche.competitors) {
      if (c.page_id) scope.add(c.page_id);
    }
  }
  return [...scope];
}

function nicheBlock(niche: Niche): string {
  const lines: string[] = [`- ${niche.label_jp} (id: ${niche.id}) [mode: ${niche.mode}]`];
  if (niche.mode !== "competitors") {
    lines.push(`    keywords: ${niche.keywords.join(", ") || "(none)"}`);
  }
  if (niche.mode !== "keyword") {
    if (niche.competitors.length === 0) {
      lines.push(`    competitors: (none tracked — discover via keyword)`);
    } else {
      lines.push(`    competitors:`);
      for (const c of niche.competitors) {
        lines.push(`      - ${c.name} — ${c.url}${c.page_id ? ` (page_id: ${c.page_id})` : ""}`);
      }
    }
  }
  return lines.join("\n");
}

export interface CommandOptions {
  ingestUrl?: string | null;
  ingestToken?: string | null; // shared secret if the endpoint is guarded
}

export function buildHuntCommand(config: AppConfig, opts: CommandOptions = {}): string {
  const g = config.global;
  const enabled = config.niches.filter((n) => n.enabled);
  const date = todayIso();
  const scope = huntScope(config);

  const nicheSection = enabled.length
    ? enabled.map(nicheBlock).join("\n")
    : "(no niches enabled — turn some on in the console first)";

  const schema = [
    "Return ONE JSON object with this exact shape (snake_case keys):",
    "{",
    `  "captured_date": "${date}",`,
    `  "country": "${g.country}",`,
    `  "hunted_scope": ${JSON.stringify(scope)},`,
    '  "ads": [',
    "    {",
    '      "library_id": "<Meta Ad Library ID — REQUIRED, the unique key>",',
    '      "niche_id": "<the id from the niche this ad came from>",',
    '      "page_name": "<advertiser / clinic name>",',
    '      "page_id": "<advertiser Page ID or null>",',
    '      "primary_text": "<caption / body copy>",',
    '      "headline": "<or null>",',
    '      "description": "<or null>",',
    '      "cta_label": "<e.g. 予約する / 詳細はこちら, or null>",',
    '      "media_type": "image | video | carousel | unknown",',
    '      "platforms": ["FACEBOOK","INSTAGRAM"],',
    '      "started_running_date": "<ISO date from \'started running on\', or null>",',
    '      "ad_library_url": "https://www.facebook.com/ads/library/?id=<library_id>",',
    '      "landing_url": "<the CTA destination, or null>",',
    '      "media_url": "<direct image/video URL when grabbable, else null>"',
    "    }",
    "  ]",
    "}",
  ].join("\n");

  const submit = opts.ingestUrl
    ? [
        "",
        "WHEN FINISHED — submit automatically:",
        `POST the JSON object to: ${opts.ingestUrl}`,
        '  Headers: Content-Type: application/json' +
          (opts.ingestToken ? `, X-Ingest-Token: ${opts.ingestToken}` : ""),
        "  Body: the JSON object above.",
        "Then ALSO print the full JSON in your reply as a fallback in case the POST fails.",
      ].join("\n")
    : ["", "WHEN FINISHED: print ONLY the JSON object above (no commentary)."].join("\n");

  return [
    "Run a Meta Ad Library hunt. For each niche below, open",
    "https://www.facebook.com/ads/library/ , set Country = Japan, Ad category = All ads,",
    "Active status = Active. For competitors, open their Page's ad library URL directly.",
    `For keywords, search the term. Scroll to load up to ${g.capture_depth} active ads per source.`,
    "",
    `Country: ${g.country}`,
    `Platforms filter: ${g.platforms.join(", ")}`,
    `Media type: ${g.media_type}`,
    `Capture date: ${date}`,
    "",
    "NICHES:",
    nicheSection,
    "",
    "For EVERY ad, extract the schema below and tag each ad with its niche_id.",
    "Always include ad_library_url, landing_url (the CTA destination), and media_url when grabbable.",
    "Do NOT invent spend / impressions / reach / CTR / demographics — those do not exist",
    "for Japanese commercial ads. If a field can't be captured, use null.",
    "",
    schema,
    submit,
  ].join("\n");
}
