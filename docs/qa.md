# QA module

Step-by-step tests after every shipped phase. Automated proof: `npm run test:trust`, `npm run typecheck`.

Public verification does **not** require an account. Issuer and holder steps do.

How to record a result: **PASS** / **FAIL** / **BLOCKED**. A phase is not done if any required row is FAIL.

---

## Phase 1 — Foundation

| # | Step | Expected | Result |
|---|---|---|---|
| 1.1 | Open home. Run **Valid diploma** | Status `VALID`. Flags: issuer, signature, document SHA-256, ledger, signed status list | |
| 1.2 | Run **Tampered** | `INVALID`. Document SHA-256 FAIL. Other flags may still pass | |
| 1.3 | Run **Revoked** | `REVOKED` | |
| 1.4 | Run **Expired** | `EXPIRED` | |
| 1.5 | Copy an opaque verify URL | No holder name or email in the path | |
| 1.6 | Open `/trust` | Pipeline describes cryptographic evidence, not a database `VALID` flag | |

---

## Phase 2 — Identity

Sign in, then:

| # | Step | Expected | Result |
|---|---|---|---|
| 2.1 | Open `/app/keys` | `did:key` + `publicKeyMultibase` only. No secret key material | |
| 2.2 | Open the public DID document | JSON `@context` / verification method matches the DID | |
| 2.3 | **Rotate signing key** | New DID is current; previous listed `ROTATED` | |
| 2.4 | Verify a diploma issued **before** rotation | Still `VALID` against the old DID | |
| 2.5 | Audit log | Rotation event present | |

---

## Phase 3 — Documents

Sign in → **Documents**:

| # | Step | Expected | Result |
|---|---|---|---|
| 3.1 | Upload a real PDF | `HASHED`. SHA-256 of the **bytes** shown | |
| 3.2 | Upload the same PDF again | One row, same hash | |
| 3.3 | Rename a PDF to `.exe` and upload | **Accepted** (magic bytes) | |
| 3.4 | Rename an `.exe` / ZIP to `.pdf` and upload | **Rejected** | |
| 3.5 | Issue from a `HASHED` row | Document `ISSUED`. Public verify `VALID` with bound file | |
| 3.6 | Issue the same document again | Rejected | |
| 3.7 | Verify with a one-byte-different file | `INVALID` | |
| 3.8 | Issue with generated diploma (no upload) | Still `VALID` | |

---

## Phase 4 — Holder

| # | Step | Expected | Result |
|---|---|---|---|
| 4.1 | Open `/wallet` | Holder `did:key` exists | |
| 4.2 | Open `/wallet/claim/demo-claim-valid-bcs` | Offer for Alex Rivera / BCS | |
| 4.3 | Claim | Wallet shows the credential. Issuer signature unchanged | |
| 4.4 | **Present** | `/present/{ref}` holder proof PASS, inner VC VALID | |
| 4.5 | Claim URL | No holder name in the path | |

Regression: Phase 1 playground still has four independent failure modes.

---

## Phase 5 — Status and policy

| # | Step | Expected | Result |
|---|---|---|---|
| 5.1 | Valid diploma | `VALID` and **Signed status list** PASS | |
| 5.2 | Revoked diploma | `REVOKED` (bit + signed list) | |
| 5.3 | Open `/status/demo` | Signed BitstringStatusListCredential, no holder PII | |
| 5.4 | Issue then revoke a new diploma | Verify becomes `REVOKED`; status-list hash changes | |

---

## Phase 6 — Audit

| # | Step | Expected | Result |
|---|---|---|---|
| 6.1 | Verify valid diploma | Link **Signed verification report** | |
| 6.2 | Open the report | Signature PASS, ledger anchor PASS, **no holder name** | |
| 6.3 | Tampered playground | New report is `INVALID` and still signed | |
| 6.4 | Issuer **Audit** | Chain intact, event hashes listed | |

---

## Phase 7 — Production adapters

Preview (no extra env) must keep working. Fail-closed adapters must not fake success.

| # | Step | Expected | Result |
|---|---|---|---|
| 7.1 | Home playground (default adapters) | Same Phase 1 results | |
| 7.2 | Issuer **Ledger** | Names `HashChainLedgerAdapter` and integrity `hash-chain` | |
| 7.3 | Issuer **Documents** | Storage column present (`DatabaseObjectStore` or `db`) | |
| 7.4 | Issuer **Keys** | Mentions the KMS name (`LocalAesGcmKms`) | |
| 7.5 | Automated: Fabric without Gateway | Throws; never a successful `LedgerSubmitResult` | |
| 7.6 | Automated: mock Gateway submit | `previousHash` is `fabric:unavailable`; world state has hashes, not PDF bytes | |
| 7.7 | Automated: `STORAGE_BACKEND=s3` without bucket | Throws | |
| 7.8 | Automated: filesystem put/get | SHA-256 of get() equals put() | |
| 7.9 | Automated: `KMS_BACKEND=aws` without key id | Throws | |
| 7.10 | `LEDGER_ADAPTER=fabric` in preview without peer | Must **not** serve new anchors as VALID | |

A live Fabric network and S3 bucket are **out of band**. Do not mark 7.10 PASS by pointing at the hash-chain.

---

## Out of scope

- `did:web` / universal resolver
- Mobile wallet / DIDComm / selective disclosure
- Operating a production Fabric consortium from this app
