# QA

Manual checks after each shipped phase. Automated proof is `npm run test:trust` (28 tests as of Phase 3).

Public verification does **not** require an account. Issuer steps do.

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

Also confirm:

- [ ] Ledger inspector shows document hashes, not PDF bytes or holder names
- [ ] Demo diplomas from Phase 1 still pass the four failure modes
- [ ] `/app/keys` and DID rotation from Phase 2 still work

## Out of scope until a later phase

- S3 / IPFS object storage
- `did:web` and a universal resolver
- Holder wallet / credential delivery
- A live Hyperledger Fabric network
