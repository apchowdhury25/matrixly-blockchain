/** Copy-paste examples. `$BASE` is this site’s origin. */

export const DEMO_API_KEY = "mtx_live_demo_verifier_qa_only";

export const examples = {
  missingKey: {
    title: "Missing key — must be 401, never VALID",
    request: `POST $BASE/api/v1/verify
Content-Type: application/json

{"ref":"demo-valid-bcs"}`,
    curl: `curl -sS -X POST "$BASE/api/v1/verify" \\
  -H "Content-Type: application/json" \\
  -d '{"ref":"demo-valid-bcs"}'`,
    response: `{
  "error": "Missing or invalid API key",
  "status": "UNAUTHORIZED",
  "verified": false
}`,
    status: "401",
  },
  validRef: {
    title: "Valid diploma by opaque ref",
    request: `POST $BASE/api/v1/verify
Authorization: Bearer mtx_live_demo_verifier_qa_only
Content-Type: application/json

{"ref":"demo-valid-bcs"}`,
    curl: `curl -sS -X POST "$BASE/api/v1/verify" \\
  -H "Authorization: Bearer mtx_live_demo_verifier_qa_only" \\
  -H "Content-Type: application/json" \\
  -d '{"ref":"demo-valid-bcs"}'`,
    response: `{
  "status": "VALID",
  "verified": true,
  "checks": {
    "issuerRegistered": true,
    "signatureValid": true,
    "documentSha256": true,
    "ledgerProof": true,
    "signedStatusList": true,
    "credentialActive": true
  },
  "issuerDid": "did:key:z6Mk…",
  "credentialId": "urn:uuid:demo-valid-bcs",
  "credentialHash": "sha256:…",
  "documentHash": "sha256:…",
  "reportRef": "dWyFhsSQM5mK",
  "reportHash": "sha256:…",
  "reasons": []
}`,
    status: "200",
  },
  revokedRef: {
    title: "Revoked diploma",
    request: `POST $BASE/api/v1/verify
Authorization: Bearer mtx_live_demo_verifier_qa_only
Content-Type: application/json

{"ref":"demo-revoked-bcs"}`,
    curl: `curl -sS -X POST "$BASE/api/v1/verify" \\
  -H "Authorization: Bearer mtx_live_demo_verifier_qa_only" \\
  -H "Content-Type: application/json" \\
  -d '{"ref":"demo-revoked-bcs"}'`,
    response: `{
  "status": "REVOKED",
  "verified": false,
  "checks": {
    "issuerRegistered": true,
    "signatureValid": true,
    "documentSha256": true,
    "ledgerProof": true,
    "signedStatusList": true,
    "credentialActive": false
  },
  "reasons": ["Credential has been revoked"]
}`,
    status: "200",
  },
  expiredRef: {
    title: "Expired diploma",
    request: `POST $BASE/api/v1/verify
Authorization: Bearer mtx_live_demo_verifier_qa_only
Content-Type: application/json

{"ref":"demo-expired-bcs"}`,
    curl: `curl -sS -X POST "$BASE/api/v1/verify" \\
  -H "Authorization: Bearer mtx_live_demo_verifier_qa_only" \\
  -H "Content-Type: application/json" \\
  -d '{"ref":"demo-expired-bcs"}'`,
    response: `{
  "status": "EXPIRED",
  "verified": false,
  "checks": { "credentialActive": false },
  "reasons": ["Credential is expired"]
}`,
    status: "200",
  },
  includeSubject: {
    title: "Opt-in holder display name",
    request: `POST $BASE/api/v1/verify
Authorization: Bearer mtx_live_demo_verifier_qa_only
Content-Type: application/json

{"ref":"demo-valid-bcs","includeSubject":true}`,
    curl: `curl -sS -X POST "$BASE/api/v1/verify" \\
  -H "Authorization: Bearer mtx_live_demo_verifier_qa_only" \\
  -H "Content-Type: application/json" \\
  -d '{"ref":"demo-valid-bcs","includeSubject":true}'`,
    response: `{
  "status": "VALID",
  "verified": true,
  "subject": {
    "name": "Alex Rivera",
    "credentialTitle": "Bachelor of Computer Science"
  }
}`,
    status: "200",
  },
  postedCredential: {
    title: "Posted W3C credential JSON",
    request: `POST $BASE/api/v1/verify
Authorization: Bearer mtx_live_…
Content-Type: application/json

{
  "credential": {
    "@context": ["https://www.w3.org/ns/credentials/v2"],
    "type": ["VerifiableCredential", "UniversityDegreeCredential"],
    "id": "urn:uuid:…",
    "issuer": { "id": "did:key:z6Mk…", "name": "Office of the Registrar" },
    "credentialSubject": { "documentHash": "sha256:…" },
    "proof": { "type": "DataIntegrityProof", "cryptosuite": "eddsa-jcs-2022" }
  }
}`,
    curl: `curl -sS -X POST "$BASE/api/v1/verify" \\
  -H "Authorization: Bearer $MATRIXLY_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"credential":{ "@context":["https://www.w3.org/ns/credentials/v2"], "type":["VerifiableCredential"] }}'`,
    response: `{
  "status": "VALID | INVALID | REVOKED | EXPIRED",
  "verified": true,
  "checks": { "signatureValid": true, "ledgerProof": true }
}`,
    status: "200",
  },
  presentation: {
    title: "Posted verifiable presentation",
    request: `POST $BASE/api/v1/verify
Authorization: Bearer mtx_live_…
Content-Type: application/json

{
  "presentation": {
    "@context": ["https://www.w3.org/ns/credentials/v2"],
    "type": ["VerifiablePresentation"],
    "holder": "did:key:z6Mk…",
    "verifiableCredential": [ { "…inner VC…" } ],
    "proof": { "proofPurpose": "authentication", "cryptosuite": "eddsa-jcs-2022" }
  }
}`,
    curl: `curl -sS -X POST "$BASE/api/v1/verify" \\
  -H "Authorization: Bearer $MATRIXLY_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"presentation":{ "type":["VerifiablePresentation"], "verifiableCredential":[…] }}'`,
    response: `{
  "status": "VALID",
  "checks": {
    "holderPresentationProof": true,
    "signatureValid": true,
    "ledgerProof": true
  }
}`,
    status: "200",
  },
  tamper: {
    title: "One-byte different file",
    request: `POST $BASE/api/v1/verify
Authorization: Bearer mtx_live_demo_verifier_qa_only
Content-Type: application/json

{
  "ref": "demo-valid-bcs",
  "documentB64": "<base64 of a PDF that differs by one byte>"
}`,
    curl: `curl -sS -X POST "$BASE/api/v1/verify" \\
  -H "Authorization: Bearer mtx_live_demo_verifier_qa_only" \\
  -H "Content-Type: application/json" \\
  -d '{"ref":"demo-valid-bcs","documentB64":"'"$TAMPERED_B64"'"}'`,
    response: `{
  "status": "INVALID",
  "verified": false,
  "checks": { "documentSha256": false, "signatureValid": true },
  "reasons": ["Document SHA-256 does not match the bound hash"]
}`,
    status: "200",
  },
  report: {
    title: "Fetch signed verification report",
    request: `GET $BASE/api/v1/reports/{reportRef}
Authorization: Bearer mtx_live_demo_verifier_qa_only`,
    curl: `curl -sS "$BASE/api/v1/reports/$REPORT_REF" \\
  -H "Authorization: Bearer mtx_live_demo_verifier_qa_only"`,
    response: `{
  "resultStatus": "VALID",
  "reportHash": "sha256:…",
  "signatureValid": true,
  "ledgerAnchored": true,
  "report": {
    "type": ["VerifiableCredential", "VerificationReport"],
    "credentialHash": "sha256:…",
    "proof": { "cryptosuite": "eddsa-jcs-2022" }
  }
}`,
    status: "200",
  },
  openapi: {
    title: "OpenAPI document (no key)",
    request: `GET $BASE/api/v1/openapi.json`,
    curl: `curl -sS "$BASE/api/v1/openapi.json"`,
    response: `{
  "openapi": "3.0.3",
  "info": { "title": "Matrixly Trust Verifier API", "version": "1.0.0" },
  "paths": {
    "/api/v1/verify": { "post": {} },
    "/api/v1/reports/{ref}": { "get": {} }
  }
}`,
    status: "200",
  },
} as const;
