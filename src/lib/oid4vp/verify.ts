import { credentialFromPresentation, verifyPresentation, type PresentationResult } from "../credentials/presentation";
import type { DistributedLedgerAdapter } from "../ledger/adapter";
import { matchCredentialToDcql, parseDcqlQuery } from "./dcql";
import type { AuthorizationRequest } from "./request";
import type { StatusListResolveOptions } from "../status/resolve";
import { parseVpToken } from "./vp-token";

export type Oid4vpVerifyInput = {
  request: AuthorizationRequest;
  vpToken: unknown;
  state?: string;
  documentBytes?: Uint8Array;
  statusListCredential?: Record<string, unknown>;
  statusListResolve?: StatusListResolveOptions;
  now?: Date;
};

export type Oid4vpVerifyResult = PresentationResult & {
  dcqlId?: string;
  nonceBound: boolean;
};

export async function verifyOid4vpSubmission(
  input: Oid4vpVerifyInput,
  ledger: DistributedLedgerAdapter,
): Promise<Oid4vpVerifyResult> {
  const fail = (reason: string): Oid4vpVerifyResult => ({
    verified: false,
    issuerVerified: false,
    signatureValid: false,
    documentIntegrityValid: null,
    ledgerProofValid: false,
    statusListValid: null,
    schemaAnchored: null,
    credentialActive: false,
    expired: false,
    revoked: false,
    superseded: false,
    suspended: false,
    status: "INVALID",
    reasons: [reason],
    holderProofValid: false,
    holderMatchesSubject: null,
    nonceBound: false,
  });

  if (input.state !== undefined && input.state !== input.request.state) {
    return fail("state does not match the authorization request");
  }
  const dcql = parseDcqlQuery(input.request.dcql_query);
  if (!dcql.ok) return fail(dcql.reason);
  const query = dcql.query.credentials[0];
  if (!query) return fail("dcql_query has no credential query");
  const token = parseVpToken(input.vpToken, query.id);
  if (!token.ok) return fail(token.reason);
  const presentation = token.presentations[0];
  if (!presentation) return fail("vp_token is empty");
  const inner = credentialFromPresentation(presentation);
  if (!inner) return fail("Presentation does not contain a verifiable credential");
  const matched = matchCredentialToDcql(inner, query);
  if (!matched.ok) return fail(matched.reason);

  const result = await verifyPresentation(presentation, ledger, {
    documentBytes: input.documentBytes,
    statusListCredential: input.statusListCredential,
    statusListResolve: input.statusListResolve,
    now: input.now,
    expectedChallenge: input.request.nonce,
    expectedDomain: input.request.client_id,
  });
  return { ...result, dcqlId: query.id, nonceBound: result.holderProofValid && !result.reasons.some((r) => r.includes("nonce")) };
}
