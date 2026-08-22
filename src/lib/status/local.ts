import { getSql } from "@/lib/db";
import { LOCAL_STATUS_HOST, type StatusListResolveOptions } from "./resolve";

export async function loadPublishedStatusList(url: string): Promise<Record<string, unknown> | null> {
  const sql = await getSql();
  const exact = await sql<{ credential_json: string | null }>`
    select credential_json from status_lists where id = ${url} limit 1`;
  if (exact[0]?.credential_json) return JSON.parse(exact[0].credential_json) as Record<string, unknown>;
  const slug = url.split("/").filter(Boolean).pop();
  if (!slug) return null;
  const full = `https://${LOCAL_STATUS_HOST}/credentials/status/${slug}`;
  const bySlug = await sql<{ credential_json: string | null }>`
    select credential_json from status_lists where id = ${full} limit 1`;
  if (bySlug[0]?.credential_json) return JSON.parse(bySlug[0].credential_json) as Record<string, unknown>;
  return null;
}

export function publishedStatusResolve(): StatusListResolveOptions {
  return { loader: loadPublishedStatusList };
}
