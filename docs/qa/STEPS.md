# Detailed QA test steps

Use this when you sit down with the live Matrixly Trust preview. Record **PASS** / **FAIL** / **BLOCKED** on each step. A FAIL on an independent check (hash, signature, issuer, ledger, status) is a product defect even if the overall badge looks “close enough.”

How to score a result card:

| Badge on the card | Meaning |
|---|---|
| `VALID` | All required checks passed. Headline: **Document verified**. |
| `INVALID` | At least one integrity check failed (tamper, unknown issuer, bad proof, missing signed status list). |
| `REVOKED` | Credential is revoked. Must not read as valid. |
| `EXPIRED` | `validUntil` is in the past. Must not read as valid. |

Flags on the right of the card: **PASS** / **FAIL** / **NOT SUPPLIED**. Each flag is allowed to fail on its own.

---

## Before you start

1. Public tests (Phase 1, most of 5–6) need **no account**.
2. Issuer and holder tests need **Sign in**.
3. Use a fresh issuer account for issue/revoke so you do not collide with the Global University demo rows.
4. Do **not** treat a database row that says VALID as proof. The card must show cryptographic flags.

### Sign in (issuer or holder)

1. Open **Sign in**.
2. Switch to create-account if you do not have one.
3. Enter email, password, and a name. Submit.
4. You land on the issuer **Overview** (`/app`). The same account also owns a holder wallet (`/wallet`).

Demo claim token (no issuer console needed): `/wallet/claim/demo-claim-valid-bcs`.

---

## Phase 1 — Foundation (public playground)

Start on **Home**. The block **Live demonstration** is Global University → Alex Rivera, Bachelor of Computer Science.

### 1.1 Original PDF — expect VALID

1. Click **Original PDF**.
2. Wait for the result card.

**PASS if all of these are true:**

- Status badge `VALID`
- Headline **Document verified**
- Issuer is Global University / Office of the Registrar
- Holder is Alex Rivera
- Flags:
  - Issuer registered **PASS**
  - Ed25519 signature **PASS**
  - Document SHA-256 **PASS**
  - Ledger proof **PASS**
  - Signed status list **PASS**
  - Credential status **PASS**
- A **Signed verification report** link is present (Phase 6)

**FAIL if** any of those flags is FAIL, or the badge is not `VALID`.

### 1.2 One-byte tamper — expect INVALID

1. Click **One-byte tamper**.
2. Same credential, mutated PDF bytes.

**PASS if:**

- Badge `INVALID`
- Headline **Verification did not pass**
- **Document SHA-256** is **FAIL**
- Signature may still PASS (the credential was not rewritten — the file was)

**FAIL if** the card still says `VALID`. That would mean the product trusted a filename or skipped hashing.

### 1.3 Revoked — expect REVOKED

1. Click **Revoked**.

**PASS if** badge is `REVOKED` and Credential status is FAIL. Must not be `VALID`.

### 1.4 Expired — expect EXPIRED

1. Click **Expired**.

**PASS if** badge is `EXPIRED`. Must not be `VALID`.

### 1.5 Opaque link and QR

1. On **Original PDF**, read the QR caption and the monospace URL under it.
2. Open **Open public verifier** or the path `/verify/demo-valid-bcs`.

**PASS if:**

- The path looks like `/verify/demo-valid-bcs` (opaque token)
- The path does **not** contain `Alex`, `Rivera`, or an email
- The public verifier page still shows `VALID` for the original

### 1.6 Trust model

1. Open **Trust model** (nav or home button).

**PASS if** the page says a verifier decides from cryptographic evidence and a ledger, not because an application row says VALID. It must mention DID resolution, Ed25519, SHA-256, signed status list, and verification reports.

---

## Phase 2 — Identity (signed in)

1. Sign in.
2. Open **Keys**.

### 2.1 Public material only

**PASS if** you see:

- A `did:key:…` identifier
- `publicKeyMultibase`
- DID document hash
- Status `ACTIVE` / **Current signer**
- Copy that says secrets are sealed by the KMS name (preview: `LocalAesGcmKms`)

**FAIL if** any hex secret, seed, or `secretKey` is shown.

### 2.2 Public DID document

1. Follow the public DID link on the Keys page (`/did/{multibase}`).

**PASS if** JSON includes `@context`, `id` equal to the `did:key`, and an Ed25519 verification method. No private key.

### 2.3 Rotate

1. On **Keys**, as tenant admin, click **Rotate signing key**.
2. Confirm the dialog.

**PASS if:**

- A notice shows the new DID
- The new DID is **Current signer**
- The previous DID remains, status `ROTATED`

### 2.4 Old diploma still verifies

1. Open Home.
2. Run **Original PDF** again (Global University demo was issued on the demo DID, independent of your new tenant).
3. Optionally: issue a diploma on your tenant **before** rotation, rotate, then open that diploma’s verify link.

**PASS if** credentials signed by the old DID are still `VALID`. Rotation must not rewrite history.

### 2.5 Audit of rotation

1. Open **Audit**.

**PASS if** an event for the rotation exists and the page says the chain is intact.

---

## Phase 3 — Documents (signed in)

Open **Documents**.

### 3.1 Upload a real PDF

1. Click **Upload a document**.
2. Choose a small real PDF.

**PASS if:**

- Status `HASHED`
- A `sha256:…` hash is shown
- Type is PDF (from magic bytes)
- Storage column is present (`DatabaseObjectStore` in this preview)

### 3.2 Dedup

1. Upload the **same file** again.

**PASS if** you still have one row and the notice says it is already on file / same hash.

### 3.3 Filename is not evidence (positive)

1. Copy a PDF, rename it to `malware.exe`, upload.

**PASS if** it is **accepted** as PDF. Inspection uses magic bytes, not the name.

### 3.4 Filename is not evidence (negative)

1. Take a real `.exe` or a ZIP, rename to `diploma.pdf`, upload.

**PASS if** upload is **rejected**. MZ / ZIP signatures fail closed.

**FAIL if** you used 3.4 as a “should succeed” test. That was the old misleading case.

### 3.5 Issue from a hashed document

1. On the `HASHED` row, choose **Issue**.
2. Keep or change holder name / title. Submit.

**PASS if:**

- You land on a public verify page with badge `VALID`
- Back on **Documents**, that row is `ISSUED`

### 3.6 Already bound

1. Issue from the same document again.

**PASS if** the app refuses (already bound).

### 3.7 One-byte different file at verify

1. Open the public verify link for the credential you just issued.
2. If the page allows uploading a file, supply a PDF that is one byte different.

**PASS if** **Document SHA-256** FAILs and status is `INVALID`.

### 3.8 Generated diploma (no upload)

1. Open **Issue** with no `documentId`.
2. Do not attach a file. Submit (default Alex Rivera / BCS is fine).

**PASS if** verify is `VALID` and a new document row exists.

---

## Phase 4 — Holder

You can use the demo claim **or** a claim link from your issuer credentials.

### 4.1 Wallet shell

1. Open **Wallet**.

**PASS if** a holder `did:key:…` is shown. Empty wallet is OK.

### 4.2 Demo claim offer

1. Open `/wallet/claim/demo-claim-valid-bcs`.

**PASS if** the offer is the Global University BCS for Alex Rivera. The path contains only `demo-claim-valid-bcs` — no name.

### 4.3 Claim

1. Click **Claim**.
2. You return to **Wallet**.

**PASS if** the credential appears. Claiming copies the signed VC; it must not re-sign it as the holder.

### 4.4 Present

1. On the wallet row, create a presentation.
2. Open **Open public presentation**.

**PASS if:**

- **Holder presentation proof** PASS
- Inner credential still `VALID` (or whatever the inner status truly is)
- A valid envelope cannot hide a tampered inner credential (if you ever paste a tampered VC into a VP, inner signature must FAIL)

### 4.5 Issuer-issued claim link

1. In **Credentials**, click **Copy claim link** on a row you issued.
2. Open that link while signed in, claim it.

**PASS if** the URL is `/wallet/claim/{opaque-token}` with no holder name.

---

## Phase 5 — Status and policy

### 5.1 Signed status list on a valid diploma

Repeat **1.1**. **Signed status list** must be **PASS**, not NOT SUPPLIED.

### 5.2 Revoked uses the list, not only a table flag

Repeat **1.3**. Badge `REVOKED`.

### 5.3 Public status list document

1. Open `/status/demo`.

**PASS if:**

- Page title is a status list credential
- Signed = yes
- Issuer DID present
- Proof cryptosuite shown (`eddsa-jcs-2022`)
- **No** holder name

### 5.4 Revoke something you issued

1. **Issue** a new diploma (3.8).
2. Note the verify link.
3. **Credentials** → **Revoke**.
4. Reload the verify link.
5. Open **Status**. Note the list hash, then revoke, then refresh Status.

**PASS if** verify becomes `REVOKED` and the status-list hash changes (the list was re-signed).

---

## Phase 6 — Audit

### 6.1 Report link

After **1.1**, click **Signed verification report**.

### 6.2 Report contents

**PASS if:**

- Report signature PASS
- Ledger anchor PASS
- Policy id present (`matrixly.default.v1`)
- Credential hash / report hash shown
- **No holder name, no email, no PDF bytes**

### 6.3 Tampered still gets a signed report

1. Click **One-byte tamper**.
2. Open the new report.

**PASS if** result is `INVALID` and the report signature still PASSes (the verifier signed an honest failure).

### 6.4 Tenant audit chain

1. Sign in → **Audit**.

**PASS if** “Chain intact”, hashed events listed, payloads are action names — not diploma PDFs.

---

## Phase 7 — Adapters (what you can see in the preview)

This preview **must** stay on hash-chain + database bytes + local AES. Fabric/S3/AWS without credentials must not silently succeed.

### 7.1 Regression

Repeat Phase 1. All four playground outcomes must still hold.

### 7.2 Ledger page

1. Sign in → **Ledger**.

**PASS if** it names `HashChainLedgerAdapter` and integrity `hash-chain`. Storage and KMS names are visible. Blocks are ISSUER / DID / CREDENTIAL / DOCUMENT_ANCHOR / VERIFICATION_ANCHOR / etc. No PDF text in hashes.

**FAIL if** it claims `FabricLedgerAdapter` while no Fabric network is attached.

### 7.3 Documents storage column

**PASS if** a Storage column exists. Preview value is `DatabaseObjectStore` (or `db` on older rows).

### 7.4 Keys KMS name

**PASS if** Keys copy names `LocalAesGcmKms` (preview). No secret key.

### 7.5–7.9 Automated fail-closed tests

From the repo: `npm run test:trust`.

**PASS if** 56/56 (or current total) including:

- Fabric without Gateway throws (“Refusing to fake”)
- Mock Gateway `previousHash` is `fabric:unavailable`
- World state has hashes, not `%PDF`
- S3 without bucket throws
- Filesystem put/get preserves SHA-256
- AWS KMS without key id throws

### 7.10 Do not fake Fabric

**PASS if** the running preview is still hash-chain.  
**FAIL if** the UI says Fabric confirmed a transaction without a Gateway.  
**BLOCKED** (expected) for “submit to a real peer” — there is no Fabric network in this environment.

---

## Regression pack (run after every later change)

Minimum 8 clicks:

1. Original PDF → `VALID`
2. One-byte tamper → `INVALID` (hash FAIL)
3. Revoked → `REVOKED`
4. Expired → `EXPIRED`
5. `/trust` still denies “database says VALID”
6. `/status/demo` still signed, no PII
7. `/wallet` still shows a holder DID
8. **Ledger** still says `HashChainLedgerAdapter`

---

## Phase 8 — Verifier API

Public docs: **Developers**. Keys: sign in as tenant admin → **API keys**.

### 8.1 No key must not be VALID

`POST /api/v1/verify` with `{ "ref": "demo-valid-bcs" }` and no Authorization.

**PASS if** HTTP 401, `verified: false`, `status: "UNAUTHORIZED"`.  
**FAIL if** the body says `VALID`.

### 8.2 Garbage bearer

`Authorization: Bearer mtx_live_not-a-real-key` → 401, not VALID.

### 8.3 OpenAPI is public

Open `/api/v1/openapi.json` (no key). JSON `openapi` is `3.0.3`, path `/api/v1/verify` exists.

### 8.4 Developers page

Header **Developers**. States a missing key is 401 never VALID.

### 8.5 Create a key

**API keys** → name “QA verifier” → **Create key**. Secret `mtx_live_…` shown once. Table shows prefix only. Reload must not reveal the secret.

### 8.6 Authenticated verify

This preview seeds `mtx_live_demo_verifier_qa_only` (hashed at rest, same as any other key). Or use a key you created in 8.5.

`POST /api/v1/verify` with `Authorization: Bearer <secret>` and `{ "ref": "demo-valid-bcs" }`.

**PASS if** 200, `status: "VALID"`, checks for signature / ledger / signed status list true, JSON has no `Alex`/`Rivera`, `reportRef` present.

### 8.7 Tamper via API

Same key, `{ "ref": "demo-valid-bcs", "documentB64": "<one-byte-different PDF>" }` → `INVALID`, `checks.documentSha256` false.

### 8.8 Revoke key

**Revoke** on the key, repeat 8.6 → 401.

### 8.9 RBAC

`manageApiKeys` is TENANT_ADMIN only. Auditor cannot mint keys.

### 8.10 Regression

Phase 1 four outcomes still hold. Ledger still `HashChainLedgerAdapter`.

---

## Phase 9 — Webhooks, evidence, compliance

### 9.1 Compliance page is not a certificate

Open **Compliance**.

**PASS if** the disclaimer says this is **not** SOC 2 / ISO 27001 / eIDAS / GDPR certification.  
**PASS if** `REG-01` is `not-claimed`.  
**PASS if** `DLT-02` (Fabric) is `fail-closed`, not a live Fabric claim.

### 9.2 Evidence pack from a valid verify

1. Home → **Original PDF**.
2. Open **Evidence pack**.

**PASS if** JSON `type` is `MatrixlyEvidencePack`, report signature PASS, ledger anchor PASS, **no** holder name, **no** PDF bytes.

### 9.3 Evidence API

`GET /api/v1/evidence/{reportRef}` without a key → **401**.  
With `mtx_live_demo_verifier_qa_only` → 200 pack, no `Alex`.

### 9.4 Create webhook (signed in, tenant admin)

**Webhooks** → name + `https://hooks.example.test/matrixly` → **Create endpoint**.

**PASS if** `mtx_whsec_…` shown once. HTTP to a non-https public URL is rejected.

### 9.5 Delivery after verify

Verify the valid diploma (UI or API). Refresh **Webhooks** deliveries.

**PASS if** a row exists with a payload hash. Status may be `FAILED` if the bank URL is unreachable — that is honest. **FAIL if** the payload JSON (if shown) contains a holder name, or if a delivery is marked DELIVERED with no signature.

### 9.6 HMAC

Automated: sign/verify round-trip; tampered body fails; unsigned secret refused; `https://169.254.169.254` refused.

### 9.7 Regression

Phase 1 four outcomes and Phase 8 401-never-VALID still hold.

---

## Traps (do not mis-score)

| Action | Wrong reading | Correct |
|---|---|---|
| Rename PDF to `.exe` | “Executables are allowed” | Magic bytes say PDF → accept |
| Rename `.exe` to `.pdf` | “Upload should work” | Magic bytes say MZ → reject |
| Tamper: signature still PASS | “Verification is broken” | File changed, credential did not |
| Holder VP VALID | “Issuer signature was replaced” | Holder signs the envelope; inner VC is separate |
| Audit row `credential.verified` | “That’s the proof” | Proof is the signed report + ledger hash |
| Ledger adapter HashChain | “Phase 7 failed” | Preview default is hash-chain. Fabric refuse is the Phase 7 property |
| Verify API 401 | “API is broken” | No key must never return VALID |
| Compliance page | “We are SOC 2 certified” | Matrix is engineering controls; REG-01 is not-claimed |
| Webhook FAILED | “Phase 9 is broken” | Unreachable HTTPS is FAILED; the signature must still exist |

