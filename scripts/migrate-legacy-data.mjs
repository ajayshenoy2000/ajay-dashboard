#!/usr/bin/env node

import fs from "node:fs";
import { createClient } from "../frontend/node_modules/@supabase/supabase-js/dist/index.mjs";

function readEnvFile(path) {
  if (!path) return {};
  return Object.fromEntries(
    fs.readFileSync(path, "utf8").split(/\r?\n/).filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const index = line.indexOf("=");
        return [line.slice(0, index), line.slice(index + 1).replace(/^['"]|['"]$/g, "")];
      }),
  );
}

const args = process.argv.slice(2);
const envFileIndex = args.indexOf("--env-file");
const targetIndex = args.indexOf("--target");
const fileEnv = readEnvFile(envFileIndex >= 0 ? args[envFileIndex + 1] : null);
const env = { ...process.env, ...fileEnv };
const url = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
const targetUserId = env.TARGET_USER_ID || (targetIndex >= 0 ? args[targetIndex + 1] : undefined);
const apply = args.includes("--apply");

if (!url || !serviceKey) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_KEY are required");
const db = createClient(url, serviceKey, { auth: { persistSession: false } });

if (!targetUserId) {
  const { data, error } = await db.auth.admin.listUsers({ page: 1, perPage: 100 });
  if (error) throw error;
  const candidates = data.users.filter((user) => !user.is_anonymous).map((user) => ({
    id: user.id,
    email: user.email,
    provider: user.app_metadata?.provider,
    createdAt: user.created_at,
  }));
  console.log(JSON.stringify({ candidates }, null, 2));
  process.exit(0);
}

const { data: targetData, error: targetError } = await db.auth.admin.getUserById(targetUserId);
if (targetError || !targetData.user || targetData.user.is_anonymous) throw targetError ?? new Error("Target must be a permanent OAuth account");

const tables = ["search_batches", "trends", "briefs", "metascraper_ads", "metascraper_captures", "trend_settings", "metascraper_config"];
const before = {};
for (const table of tables) {
  const [{ count: legacy, error: legacyError }, { count: owned, error: ownedError }] = await Promise.all([
    db.from(table).select("*", { count: "exact", head: true }).is("user_id", null),
    db.from(table).select("*", { count: "exact", head: true }).eq("user_id", targetUserId),
  ]);
  if (legacyError || ownedError) throw legacyError ?? ownedError;
  before[table] = { legacy: legacy ?? 0, owned: owned ?? 0 };
}

if (!apply) {
  console.log(JSON.stringify({ target: { id: targetData.user.id, email: targetData.user.email }, before, apply: false }, null, 2));
  process.exit(0);
}

// Singleton settings created by the new app are defaults. When a legacy
// singleton exists, preserve it and replace the empty/new target singleton.
for (const table of ["trend_settings", "metascraper_config"]) {
  if (before[table].legacy > 0 && before[table].owned > 0) {
    const { error } = await db.from(table).delete().eq("user_id", targetUserId);
    if (error) throw error;
  }
}

for (const table of tables) {
  const patch = ["trend_settings", "metascraper_config"].includes(table)
    ? { user_id: targetUserId, id: targetUserId }
    : { user_id: targetUserId };
  const { error } = await db.from(table).update(patch).is("user_id", null);
  if (error) throw new Error(`${table}: ${error.message}`);
}

const after = {};
for (const table of tables) {
  const [{ count: legacy }, { count: owned }] = await Promise.all([
    db.from(table).select("*", { count: "exact", head: true }).is("user_id", null),
    db.from(table).select("*", { count: "exact", head: true }).eq("user_id", targetUserId),
  ]);
  after[table] = { legacy: legacy ?? 0, owned: owned ?? 0 };
}

if (Object.values(after).some((counts) => counts.legacy !== 0)) throw new Error("Migration verification failed: legacy rows remain");
console.log(JSON.stringify({ target: { id: targetData.user.id, email: targetData.user.email }, before, after, apply: true }, null, 2));
