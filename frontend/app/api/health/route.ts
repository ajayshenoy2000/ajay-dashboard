import { NextResponse } from "next/server";
import { getDb } from "@/lib/trend-engine/server/db";

export async function GET() {
  const db = getDb();
  let supabaseStatus = "not_configured";
  let supabaseError: string | null = null;

  if (db) {
    try {
      const { error } = await db.from("trend_settings").select("id").limit(1);
      supabaseStatus = error ? "table_missing" : "connected";
      if (error) supabaseError = error.message;
    } catch (e) {
      supabaseStatus = "error";
      supabaseError = String(e);
    }
  }

  return NextResponse.json({
    status: "ok",
    supabase: supabaseStatus,
    supabaseError,
    env: {
      supabase_url: Boolean(process.env.SUPABASE_URL),
      supabase_key: Boolean(process.env.SUPABASE_SERVICE_KEY),
      youtube: Boolean(process.env.YOUTUBE_API_KEY),
      anthropic: Boolean(process.env.ANTHROPIC_API_KEY),
      openai: Boolean(process.env.OPENAI_API_KEY),
      metascraper_token: Boolean(process.env.METASCRAPER_INGEST_TOKEN),
      metascraper_sheet: Boolean(process.env.METASCRAPER_SHEET_WEBHOOK_URL),
    },
  });
}
