import { CONFIG_ID, PRE_AUTH_GRANT } from "./constants";

export type CredentialOffer = {
  credential_issuer: string;
  credential_configuration_ids: string[];
  grants: {
    [PRE_AUTH_GRANT]: { "pre-authorized_code": string };
  };
};

export function buildCredentialOffer(origin: string, preAuthorizedCode: string): CredentialOffer {
  const issuer = origin.replace(/\/$/, "");
  return {
    credential_issuer: issuer,
    credential_configuration_ids: [CONFIG_ID],
    grants: {
      [PRE_AUTH_GRANT]: { "pre-authorized_code": preAuthorizedCode },
    },
  };
}

export function credentialOfferUri(origin: string, preAuthorizedCode: string): string {
  const offer = buildCredentialOffer(origin, preAuthorizedCode);
  const params = new URLSearchParams({ credential_offer: JSON.stringify(offer) });
  return `openid-credential-offer://?${params.toString()}`;
}

export function parseCredentialOffer(raw: unknown): { ok: true; offer: CredentialOffer } | { ok: false; reason: string } {
  if (!raw || typeof raw !== "object") return { ok: false, reason: "credential offer must be a JSON object" };
  const rec = raw as Record<string, unknown>;
  if (typeof rec.credential_issuer !== "string" || !rec.credential_issuer.startsWith("http")) {
    return { ok: false, reason: "credential_issuer is required" };
  }
  if (!Array.isArray(rec.credential_configuration_ids) || rec.credential_configuration_ids.length === 0) {
    return { ok: false, reason: "credential_configuration_ids is required" };
  }
  const grants = rec.grants as Record<string, unknown> | undefined;
  const pre = grants?.[PRE_AUTH_GRANT] as { "pre-authorized_code"?: string } | undefined;
  if (!pre?.["pre-authorized_code"]) {
    return { ok: false, reason: "pre-authorized_code grant is required (authorization code flow is not implemented)" };
  }
  return { ok: true, offer: rec as CredentialOffer };
}
