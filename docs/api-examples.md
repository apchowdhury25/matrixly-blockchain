# Verifier API examples

`$BASE` is the origin of the running Matrixly Trust site. The preview demonstration key is `mtx_live_demo_verifier_qa_only` (SHA-256 at rest — not a bypass).

Full click-through copy lives on **Developers**. Machine spec: `GET $BASE/api/v1/openapi.json`.

## Endpoints

| Method | Path | Auth |
|---|---|---|
| POST | `/api/v1/verify` | Bearer `mtx_live_…` |
| GET | `/api/v1/reports/{ref}` | Bearer `mtx_live_…` |
| GET | `/api/v1/openapi.json` | None |

## 1. Missing key — 401, never VALID

```http
POST $BASE/api/v1/verify
Content-Type: application/json

{"ref":"demo-valid-bcs"}
```

```bash
curl -sS -X POST "$BASE/api/v1/verify" \
  -H "Content-Type: application/json" \
  -d '{"ref":"demo-valid-bcs"}'
```

```json
{
  "error": "Missing or invalid API key",
  "status": "UNAUTHORIZED",
  "verified": false
}
```

## 2. Valid diploma

```bash
curl -sS -X POST "$BASE/api/v1/verify" \
  -H "Authorization: Bearer mtx_live_demo_verifier_qa_only" \
  -H "Content-Type: application/json" \
  -d '{"ref":"demo-valid-bcs"}'
```

Expected: `"status": "VALID"`, all checks `true`, **no** holder name, `reportRef` present.

## 3. Revoked

```bash
curl -sS -X POST "$BASE/api/v1/verify" \
  -H "Authorization: Bearer mtx_live_demo_verifier_qa_only" \
  -H "Content-Type: application/json" \
  -d '{"ref":"demo-revoked-bcs"}'
```

Expected: `"status": "REVOKED"`.

## 4. Expired

```bash
curl -sS -X POST "$BASE/api/v1/verify" \
  -H "Authorization: Bearer mtx_live_demo_verifier_qa_only" \
  -H "Content-Type: application/json" \
  -d '{"ref":"demo-expired-bcs"}'
```

Expected: `"status": "EXPIRED"`.

## 5. Include holder display name (opt-in)

```bash
curl -sS -X POST "$BASE/api/v1/verify" \
  -H "Authorization: Bearer mtx_live_demo_verifier_qa_only" \
  -H "Content-Type: application/json" \
  -d '{"ref":"demo-valid-bcs","includeSubject":true}'
```

## 6. Posted credential JSON

```bash
curl -sS -X POST "$BASE/api/v1/verify" \
  -H "Authorization: Bearer $MATRIXLY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"credential":{ "@context":["https://www.w3.org/ns/credentials/v2"], "type":["VerifiableCredential"], "id":"urn:uuid:…", "proof": { "cryptosuite":"eddsa-jcs-2022" } }}'
```

## 7. Posted presentation

```bash
curl -sS -X POST "$BASE/api/v1/verify" \
  -H "Authorization: Bearer $MATRIXLY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"presentation":{ "type":["VerifiablePresentation"], "holder":"did:key:z6Mk…", "verifiableCredential":[{}] }}'
```

Holder proof is `checks.holderPresentationProof`. Inner VC is verified independently.

## 8. One-byte different file

```bash
curl -sS -X POST "$BASE/api/v1/verify" \
  -H "Authorization: Bearer mtx_live_demo_verifier_qa_only" \
  -H "Content-Type: application/json" \
  -d '{"ref":"demo-valid-bcs","documentB64":"'"$TAMPERED_B64"'"}'
```

Expected: `"status": "INVALID"`, `checks.documentSha256: false`. Signature may still pass.

## 9. Signed report

Use `reportRef` from a verify response:

```bash
curl -sS "$BASE/api/v1/reports/$REPORT_REF" \
  -H "Authorization: Bearer mtx_live_demo_verifier_qa_only"
```

Expected: `signatureValid: true`, `ledgerAnchored: true`, no holder name in `report`.

## 10. OpenAPI

```bash
curl -sS "$BASE/api/v1/openapi.json"
```
