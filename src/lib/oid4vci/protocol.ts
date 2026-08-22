import { CONFIG_ID, LDP_VC, PRE_AUTH_GRANT, REFUSED_FORMATS } from "./constants";

export type TokenRequest = {
  grant_type: string;
  preAuthorizedCode?: string;
  tx_code?: string;
};

export function parseTokenRequest(body: Record<string, string>): { ok: true; request: TokenRequest } | { ok: false; error: string; error_description: string } {
  const grant = body.grant_type;
  if (grant === "authorization_code") {
    return {
      ok: false,
      error: "unsupported_grant_type",
      error_description: "Authorization code flow is not implemented. Use pre-authorized_code.",
    };
  }
  if (grant !== PRE_AUTH_GRANT) {
    return { ok: false, error: "unsupported_grant_type", error_description: `Unsupported grant_type ${grant ?? "(missing)"}` };
  }
  const code = body["pre-authorized_code"] || body.pre_authorized_code;
  if (!code) {
    return { ok: false, error: "invalid_request", error_description: "pre-authorized_code is required" };
  }
  if (body.tx_code) {
    return { ok: false, error: "invalid_grant", error_description: "tx_code is not used for this offer" };
  }
  return { ok: true, request: { grant_type: grant, preAuthorizedCode: code } };
}

export function parseCredentialRequest(body: Record<string, unknown>): { ok: true; configurationId: string } | { ok: false; error: string; error_description: string } {
  const format = typeof body.format === "string" ? body.format : undefined;
  if (format && REFUSED_FORMATS.has(format)) {
    return {
      ok: false,
      error: "unsupported_credential_format",
      error_description: `${format} is not issued. This issuer delivers W3C ldp_vc only.`,
    };
  }
  const configurationId =
    (typeof body.credential_configuration_id === "string" && body.credential_configuration_id) ||
    (typeof body.credential_identifier === "string" && body.credential_identifier) ||
    CONFIG_ID;
  if (configurationId !== CONFIG_ID) {
    return {
      ok: false,
      error: "invalid_credential_request",
      error_description: `Unknown credential_configuration_id ${configurationId}. Supported: ${CONFIG_ID} (${LDP_VC}).`,
    };
  }
  return { ok: true, configurationId };
}

export function credentialResponse(credential: Record<string, unknown>) {
  return { credentials: [{ credential }] };
}
