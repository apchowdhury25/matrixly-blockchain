# QA

Manual checks after each shipped phase. Automated proof is `npm run test:trust`.

Public verification does **not** require an account. Issuer and holder steps do.

## Phase 1 — Foundation

- [ ] Home playground **Valid diploma** → `VALID` (signature, hash, issuer, ledger, status)
- [ ] **Tampered** → `INVALID` (document hash mismatch)
- [ ] **Revoked** → `REVOKED`
- [ ] **Expired** → `EXPIRED`
- [ ] Opaque verify link has no holder name or email in the URL
- [ ] `/trust` describes cryptographic evidence, not a database `VALID` flag

## Phase 2 — Identity

Sign in, then:

- [ ] `/app/keys` shows a `did:key` and `publicKeyMultibase` only — no secret key material
- [ ] Open the public DID document from that page (`/did/{multibase}`)
- [ ] Tenant admin can **Rotate signing key**. New DID is current; previous DID stays listed as `ROTATED`
- [ ] A diploma issued **before** rotation still verifies as `VALID`
- [ ] `/app/audit` records the rotation

## Phase 3 — Documents

Sign in, then **Documents**:

| Action | Expected |
|---|---|
| Upload a real PDF | Status `HASHED`. SHA-256 of the **bytes** is shown. Filename is metadata only. |
| Upload the same PDF again | Deduped. Same hash, one row. |
| Rename a PDF to `.exe` and upload | **Accepted as PDF.** Inspection uses magic bytes, not the name. |
| Rename an `.exe` / ZIP to `.pdf` and upload | **Rejected.** MZ and PK signatures fail closed. |
| Issue from a `HASHED` row | Credential created. Document becomes `ISSUED`. Public verifier → `VALID` with the bound file. |
| Issue the same document again | Rejected (“already bound”). |
| Supply a one-byte-different file at verify | `INVALID` (hash mismatch). |
| Issue with no upload (generate diploma) | Still works. New PDF is hashed and anchored. |

## Phase 4 — Holder

Sign in, then:

| Action | Expected |
|---|---|
| Open `/wallet` | Holder `did:key` is created. Empty wallet is OK. |
| From issuer **Credentials**, copy claim link | Opaque path `/wallet/claim/…` — no holder name in the URL |
| Open `/wallet/claim/demo-claim-valid-bcs` | Offer shows Alex Rivera / BCS |
| Claim | Credential appears in the wallet. Signature is unchanged. |
| **Present** | Public `/present/{ref}` shows holder proof PASS and inner VC VALID |

Also confirm:

- [ ] Phase 1 playground still has four independent failure modes
- [ ] Phase 3 document ingest still hashes bytes, not filenames
- [ ] Issuer key rotation from Phase 2 still leaves old diplomas VALID

## Phase 5 — Status and policy

- [ ] Home **Valid diploma** still `VALID`, and **Signed status list** is PASS
- [ ] **Revoked** diploma is `REVOKED` (bit + signed list, not only a table flag)
- [ ] Issuer **Status** page shows a signed list; public `/status/demo` opens the document
- [ ] After revoking a newly issued diploma, public verify becomes `REVOKED` and the status list hash changes

## Phase 6 — Audit

- [ ] Verify the valid diploma; open **Signed verification report**
- [ ] Report page: signature PASS, ledger anchor PASS, no holder name on the page
- [ ] Tamper the playground; a new report is `INVALID` and still signed
- [ ] Issuer **Audit**: chain intact, event hashes present

## Out of scope until a later phase

- S3 / IPFS object storage
- `did:web` and a universal resolver
- Mobile wallet / DIDComm / selective disclosure
- A live Hyperledger Fabric network
