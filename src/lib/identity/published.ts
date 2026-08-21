import type { DidJson } from "./did";
import { getSql } from "@/lib/db";
import { buildDidWebDocument, isLocalDidWebHost, parseDidWeb } from "./did-web";

/** In-process did:web documents for this deployment and *.example.test. */
export async function loadPublishedDidWeb(did: string): Promise<DidJson | null> {
  const parsed = parseDidWeb(did);
  if (!parsed.ok) return null;
  if (!isLocalDidWebHost(parsed.host) && parsed.host !== process.env.MATRIXLY_DID_WEB_HOST) {
    return null;
  }
  if (parsed.pathSegments[0] !== "issuers" || !parsed.pathSegments[1]) return null;
  const slug = parsed.pathSegments[1];
  try {
    const sql = await getSql();
    const tenants = await sql<{ id: string }>`select id from tenants where slug = ${slug} limit 1`;
    const tenantId = tenants[0]?.id;
    if (!tenantId) return null;
    const keys = await sql<{ public_key_multibase: string; did: string }>`
      select public_key_multibase, did from dids
      where tenant_id = ${tenantId} and coalesce(status, 'ACTIVE') = ${"ACTIVE"}
      order by created_at desc limit 1`;
    const key = keys[0];
    if (!key) return null;
    return buildDidWebDocument({
      did,
      publicKeyMultibase: key.public_key_multibase,
      alsoKnownAs: key.did.startsWith("did:key:") ? [key.did] : undefined,
    });
  } catch {
    return null;
  }
}
