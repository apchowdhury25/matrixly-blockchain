# Verifier API examples

`$BASE` is the origin of the running Matrixly Trust site.
Preview demonstration key: `mtx_live_demo_verifier_qa_only` (SHA-256 at rest — not a bypass).

Response bodies are **complete JSON** captured from a live call.
Issuer DID, hashes, and `reportRef` change if the demo tenant is re-seeded; field names and check flags do not.

UI catalog: **Developers**. Spec: `GET $BASE/api/v1/openapi.json`.

## Endpoints

| Method | Path | Auth |
|---|---|---|
| POST | `/api/v1/verify` | Bearer `mtx_live_…` |
| GET | `/api/v1/reports/{ref}` | Bearer `mtx_live_…` |
| GET | `/api/v1/openapi.json` | None |

## Missing key — must be 401, never VALID

HTTP `401`

### Request

```http
POST $BASE/api/v1/verify
Content-Type: application/json

{"ref":"demo-valid-bcs"}
```

### curl

```bash
curl -sS -X POST "$BASE/api/v1/verify" \
  -H "Content-Type: application/json" \
  -d '{"ref":"demo-valid-bcs"}'
```

### Response

```json
{
  "error": "Missing or invalid API key",
  "status": "UNAUTHORIZED",
  "verified": false
}
```

## Valid diploma by opaque ref

HTTP `200`

### Request

```http
POST $BASE/api/v1/verify
Authorization: Bearer mtx_live_demo_verifier_qa_only
Content-Type: application/json

{"ref":"demo-valid-bcs"}
```

### curl

```bash
curl -sS -X POST "$BASE/api/v1/verify" \
  -H "Authorization: Bearer mtx_live_demo_verifier_qa_only" \
  -H "Content-Type: application/json" \
  -d '{"ref":"demo-valid-bcs"}'
```

### Response

```json
{
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
  "issuerDid": "did:key:z6Mkm3txuAz9BY1LFnnyvkDP4qjUMP55QEmDgWPrg5X2yGFA",
  "credentialId": "urn:uuid:demo-valid-bcs",
  "credentialHash": "sha256:ec1a279acff22be6f1c7b0ad1e787455f250b83b91f4505e391c40cc21b83a04",
  "documentHash": "sha256:7ffcf2aac17f0577c665f651d480d1b5a7157c5ad405fb9abf7201b8f353d82e",
  "reportRef": "WWKAPed4Y2Ye",
  "reportHash": "sha256:3b59d2c3a6e1cb5f4d1e461536d23daa55d3c1b201d0ec1a668e4fca1f001c97",
  "reasons": []
}
```

## Revoked diploma

HTTP `200`

### Request

```http
POST $BASE/api/v1/verify
Authorization: Bearer mtx_live_demo_verifier_qa_only
Content-Type: application/json

{"ref":"demo-revoked-bcs"}
```

### curl

```bash
curl -sS -X POST "$BASE/api/v1/verify" \
  -H "Authorization: Bearer mtx_live_demo_verifier_qa_only" \
  -H "Content-Type: application/json" \
  -d '{"ref":"demo-revoked-bcs"}'
```

### Response

```json
{
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
  "issuerDid": "did:key:z6Mkm3txuAz9BY1LFnnyvkDP4qjUMP55QEmDgWPrg5X2yGFA",
  "credentialId": "urn:uuid:demo-revoked-bcs",
  "credentialHash": "sha256:1c4fbd89e2eeddbbd26307cee9a1425aac9f9189398be965da110ed4bda39740",
  "documentHash": "sha256:3641747ec3f0715fc43d1d9450bb82f007cc52fc98a73d0a6febb5849ed3b7c5",
  "reportRef": "YNBsED6i45ZC",
  "reportHash": "sha256:d5828a1fe66c5baddefee82e9f41e9d8b07153d6a1aed0a7b453fe377ed779da",
  "reasons": [
    "Credential has been revoked",
    "Policy matrixly.default.v1: revoked credentials are not accepted"
  ]
}
```

## Expired diploma

HTTP `200`

### Request

```http
POST $BASE/api/v1/verify
Authorization: Bearer mtx_live_demo_verifier_qa_only
Content-Type: application/json

{"ref":"demo-expired-bcs"}
```

### curl

```bash
curl -sS -X POST "$BASE/api/v1/verify" \
  -H "Authorization: Bearer mtx_live_demo_verifier_qa_only" \
  -H "Content-Type: application/json" \
  -d '{"ref":"demo-expired-bcs"}'
```

### Response

```json
{
  "status": "EXPIRED",
  "verified": false,
  "checks": {
    "issuerRegistered": true,
    "signatureValid": true,
    "documentSha256": true,
    "ledgerProof": true,
    "signedStatusList": true,
    "credentialActive": false
  },
  "issuerDid": "did:key:z6Mkm3txuAz9BY1LFnnyvkDP4qjUMP55QEmDgWPrg5X2yGFA",
  "credentialId": "urn:uuid:demo-expired-bcs",
  "credentialHash": "sha256:44eca22918971d7609577817b19ebebc92da4f005651432eb132524e7037d354",
  "documentHash": "sha256:3eb7955165bbf2ba98fdfb327348b5de6ba0c717244d5899fc60c5ec5aedba1a",
  "reportRef": "Ds9K-448tHBi",
  "reportHash": "sha256:cd41b26c41f7fc0916713059e72df1bcab0cc2974a3bf6fb447dc6a937493414",
  "reasons": [
    "Credential validity period has ended",
    "Policy matrixly.default.v1: expired credentials are not accepted"
  ]
}
```

## Opt-in holder display name

HTTP `200`

### Request

```http
POST $BASE/api/v1/verify
Authorization: Bearer mtx_live_demo_verifier_qa_only
Content-Type: application/json

{"ref":"demo-valid-bcs","includeSubject":true}
```

### curl

```bash
curl -sS -X POST "$BASE/api/v1/verify" \
  -H "Authorization: Bearer mtx_live_demo_verifier_qa_only" \
  -H "Content-Type: application/json" \
  -d '{"ref":"demo-valid-bcs","includeSubject":true}'
```

### Response

```json
{
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
  "issuerDid": "did:key:z6Mkm3txuAz9BY1LFnnyvkDP4qjUMP55QEmDgWPrg5X2yGFA",
  "credentialId": "urn:uuid:demo-valid-bcs",
  "credentialHash": "sha256:ec1a279acff22be6f1c7b0ad1e787455f250b83b91f4505e391c40cc21b83a04",
  "documentHash": "sha256:7ffcf2aac17f0577c665f651d480d1b5a7157c5ad405fb9abf7201b8f353d82e",
  "reportRef": "v-VhL19zcyhT",
  "reportHash": "sha256:74734568dd3615eebd76db312ac98d5bf8a944fdb0929e669fdebd7ffbc803b8",
  "reasons": [],
  "subject": {
    "name": "Alex Rivera",
    "credentialTitle": "Bachelor of Computer Science"
  }
}
```

## Unknown opaque ref

HTTP `200`

### Request

```http
POST $BASE/api/v1/verify
Authorization: Bearer mtx_live_demo_verifier_qa_only
Content-Type: application/json

{"ref":"does-not-exist"}
```

### curl

```bash
curl -sS -X POST "$BASE/api/v1/verify" \
  -H "Authorization: Bearer mtx_live_demo_verifier_qa_only" \
  -H "Content-Type: application/json" \
  -d '{"ref":"does-not-exist"}'
```

### Response

```json
{
  "status": "INVALID",
  "verified": false,
  "checks": {
    "issuerRegistered": false,
    "signatureValid": false,
    "documentSha256": null,
    "ledgerProof": false,
    "signedStatusList": null,
    "credentialActive": false
  },
  "reasons": [
    "No credential is registered for this verification link."
  ]
}
```

## One-byte different file

HTTP `200`

### Request

```http
POST $BASE/api/v1/verify
Authorization: Bearer mtx_live_demo_verifier_qa_only
Content-Type: application/json

{"ref":"demo-valid-bcs","documentB64":"<base64 of a PDF that differs by one byte>"}
```

### curl

```bash
curl -sS -X POST "$BASE/api/v1/verify" \
  -H "Authorization: Bearer mtx_live_demo_verifier_qa_only" \
  -H "Content-Type: application/json" \
  -d '{"ref":"demo-valid-bcs","documentB64":"'"$TAMPERED_B64"'"}'
```

### Response

```json
{
  "status": "INVALID",
  "verified": false,
  "checks": {
    "issuerRegistered": true,
    "signatureValid": true,
    "documentSha256": false,
    "ledgerProof": true,
    "signedStatusList": true,
    "credentialActive": true
  },
  "issuerDid": "did:key:z6Mkm3txuAz9BY1LFnnyvkDP4qjUMP55QEmDgWPrg5X2yGFA",
  "credentialId": "urn:uuid:demo-valid-bcs",
  "credentialHash": "sha256:ec1a279acff22be6f1c7b0ad1e787455f250b83b91f4505e391c40cc21b83a04",
  "documentHash": "sha256:7ffcf2aac17f0577c665f651d480d1b5a7157c5ad405fb9abf7201b8f353d82e",
  "reasons": [
    "Document bytes do not match the bound SHA-256 hash"
  ]
}
```

## Posted credential JSON that fails structure

HTTP `200`

### Request

```http
POST $BASE/api/v1/verify
Authorization: Bearer mtx_live_demo_verifier_qa_only
Content-Type: application/json

{"credential":{}}
```

### curl

```bash
curl -sS -X POST "$BASE/api/v1/verify" \
  -H "Authorization: Bearer mtx_live_demo_verifier_qa_only" \
  -H "Content-Type: application/json" \
  -d '{"credential":{}}'
```

### Response

```json
{
  "status": "INVALID",
  "verified": false,
  "checks": {
    "issuerRegistered": false,
    "signatureValid": false,
    "documentSha256": null,
    "ledgerProof": false,
    "signedStatusList": null,
    "credentialActive": false
  },
  "credentialHash": "sha256:44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a",
  "reportRef": "snG1Miyq2_us",
  "reportHash": "sha256:49214cf54d27e703eaa8cfbed36e1702033adcfec9ff1aac4e06c6a1a0654f6f",
  "reasons": [
    "Missing required @context https://www.w3.org/ns/credentials/v2",
    "type must include VerifiableCredential",
    "id is required",
    "issuer is required",
    "validFrom is required",
    "credentialSubject is required",
    "proof is required"
  ]
}
```

## Posted presentation missing holder DID

HTTP `200`

### Request

```http
POST $BASE/api/v1/verify
Authorization: Bearer mtx_live_demo_verifier_qa_only
Content-Type: application/json

{"presentation":{"type":["VerifiablePresentation"],"verifiableCredential":[]}}
```

### curl

```bash
curl -sS -X POST "$BASE/api/v1/verify" \
  -H "Authorization: Bearer mtx_live_demo_verifier_qa_only" \
  -H "Content-Type: application/json" \
  -d '{"presentation":{"type":["VerifiablePresentation"],"verifiableCredential":[]}}'
```

### Response

```json
{
  "status": "INVALID",
  "verified": false,
  "checks": {
    "issuerRegistered": false,
    "signatureValid": false,
    "documentSha256": null,
    "ledgerProof": false,
    "signedStatusList": null,
    "credentialActive": false,
    "holderPresentationProof": false
  },
  "reportRef": "Fhv1J2Bf8QBQ",
  "reportHash": "sha256:9f54a291278352e5f5642f44931796c6e2bc1516a275041207747b2b4323472b",
  "reasons": [
    "Presentation holder DID is missing"
  ]
}
```

## Fetch signed verification report

HTTP `200`

### Request

```http
GET $BASE/api/v1/reports/WWKAPed4Y2Ye
Authorization: Bearer mtx_live_demo_verifier_qa_only
```

### curl

```bash
curl -sS "$BASE/api/v1/reports/WWKAPed4Y2Ye" \
  -H "Authorization: Bearer mtx_live_demo_verifier_qa_only"
```

### Response

```json
{
  "resultStatus": "VALID",
  "report": {
    "@context": [
      "https://www.w3.org/ns/credentials/v2"
    ],
    "type": [
      "VerificationReport"
    ],
    "id": "urn:uuid:1ae0c338-602b-494b-9780-eafb4e604b94",
    "verifier": {
      "id": "did:key:z6Mkva52oayqR7xtLiCcr4iZEdQsDyR68Vi7AGrJrG1pdwR9"
    },
    "created": "2026-08-21T17:47:27.865Z",
    "credentialId": "urn:uuid:demo-valid-bcs",
    "credentialHash": "sha256:ec1a279acff22be6f1c7b0ad1e787455f250b83b91f4505e391c40cc21b83a04",
    "policyId": "matrixly.default.v1",
    "result": "VALID",
    "checks": {
      "issuerVerified": true,
      "signatureValid": true,
      "documentIntegrityValid": true,
      "ledgerProofValid": true,
      "statusListValid": true
    },
    "documentHash": "sha256:7ffcf2aac17f0577c665f651d480d1b5a7157c5ad405fb9abf7201b8f353d82e",
    "ledgerHead": "sha256:a17717a81f493764b5344db380ade89dc2ca265c9eea880c4589e6af832d2618",
    "proof": {
      "type": "DataIntegrityProof",
      "cryptosuite": "eddsa-jcs-2022",
      "created": "2026-08-21T17:47:27.865Z",
      "verificationMethod": "did:key:z6Mkva52oayqR7xtLiCcr4iZEdQsDyR68Vi7AGrJrG1pdwR9#z6Mkva52oayqR7xtLiCcr4iZEdQsDyR68Vi7AGrJrG1pdwR9",
      "proofPurpose": "assertionMethod",
      "proofValue": "z5GdwrZVkevkyU15AcvW3bGoUxyFcoEBTMS475MKj3kXwacdWw4gc8WP2WV6Nus2y51gb8mt6Wr1TXmTiYXvdaSJV"
    }
  },
  "reportHash": "sha256:3b59d2c3a6e1cb5f4d1e461536d23daa55d3c1b201d0ec1a668e4fca1f001c97",
  "signatureValid": true,
  "ledgerAnchored": true
}
```

## OpenAPI document (no key)

HTTP `200`

### Request

```http
GET $BASE/api/v1/openapi.json
```

### curl

```bash
curl -sS "$BASE/api/v1/openapi.json"
```

### Response

```json
{
  "openapi": "3.0.3",
  "info": {
    "title": "Matrixly Trust Verifier API",
    "version": "1.0.0",
    "description": "Machine verification of W3C Verifiable Credentials. Authenticity is decided by Ed25519, SHA-256, a signed status list, and a ledger anchor — not by a database VALID flag. API keys are hashed at rest; the secret is shown once."
  },
  "servers": [
    {
      "url": "/",
      "description": "This deployment"
    }
  ],
  "paths": {
    "/api/v1/verify": {
      "post": {}
    },
    "/api/v1/reports/{ref}": {
      "get": {}
    },
    "/api/v1/openapi.json": {
      "get": {}
    }
  }
}
```
