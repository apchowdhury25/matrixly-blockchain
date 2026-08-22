import { randomBytes } from "node:crypto";
import { defaultDegreeDcql, type DcqlQuery } from "./dcql";

export type AuthorizationRequest = {
  response_type: "vp_token";
  response_mode: "direct_post";
  client_id: string;
  response_uri: string;
  nonce: string;
  state: string;
  dcql_query: DcqlQuery;
  client_metadata: {
    vp_formats_supported: {
      ldp_vp: { proof_type: string[] };
      ldp_vc: { proof_type: string[] };
    };
  };
};

export function randomNonce(): string {
  return randomBytes(24).toString("base64url");
}

export function buildAuthorizationRequest(input: {
  origin: string;
  requestId: string;
  nonce?: string;
  state?: string;
  dcql?: DcqlQuery;
}): AuthorizationRequest {
  const origin = input.origin.replace(/\/$/, "");
  const clientId = origin;
  return {
    response_type: "vp_token",
    response_mode: "direct_post",
    client_id: clientId,
    response_uri: `${origin}/api/v1/oid4vp/direct-post/${input.requestId}`,
    nonce: input.nonce ?? randomNonce(),
    state: input.state ?? randomNonce(),
    dcql_query: input.dcql ?? defaultDegreeDcql(),
    client_metadata: {
      vp_formats_supported: {
        ldp_vp: { proof_type: ["DataIntegrityProof"] },
        ldp_vc: { proof_type: ["DataIntegrityProof"] },
      },
    },
  };
}

export function walletAuthorizationUrl(origin: string, requestId: string, clientId: string): string {
  const requestUri = `${origin.replace(/\/$/, "")}/api/v1/oid4vp/request/${requestId}`;
  const params = new URLSearchParams({
    client_id: clientId,
    request_uri: requestUri,
  });
  return `openid4vp://?${params.toString()}`;
}
