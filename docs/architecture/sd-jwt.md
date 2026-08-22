# SD-JWT support notes

**Status: not implemented. Fail closed.** This is not a roadmap commitment and not HAIP, EUDI, or IETF certification.

Selective Disclosure JWT (SD-JWT) is the credential format many EUDI wallets and HAIP profiles ask for. Matrixly Trust issues **W3C Verifiable Credentials 2.0** with Data Integrity (`eddsa-jcs-2022` over RFC 8785 JCS). Those are different objects. Signing the whole JSON diploma is **not** selective disclosure.

## What SD-JWT is

| Piece | Spec | Role |
|---|---|---|
| SD-JWT | IETF (RFC 9901 family; Selective Disclosure for JWTs) | Issuer signs a JWT whose claims can be hidden; holder releases salted hashes + chosen disclosures |
| SD-JWT VC | IETF `draft-ietf-oauth-sd-jwt-vc` (draft-18 as of Aug 2026 — **not** an RFC) | Profile of SD-JWT as a verifiable credential. Header `typ` / media type `dc+sd-jwt` |
| Key Binding JWT | Same family | Holder proves possession of `cnf` at presentation time |
| HAIP | OpenID Foundation | High-assurance profile of OpenID4VCI/VP that **requires** SD-JWT VC (and/or mdoc), not W3C `ldp_vc` |

Format identifiers wallets send:

| Identifier | Meaning | Matrixly |
|---|---|---|
| `ldp_vc` | W3C VC + Data Integrity | **This runtime** |
| `dc+sd-jwt` | SD-JWT VC (current) | Refused |
| `vc+sd-jwt` | Older OpenID name for the same idea | Refused |
| `mso_mdoc` | ISO/IEC 18013-5 mobile document | Refused |

A compact SD-JWT looks like `header.payload.signature~disclosure~disclosure~` (tilde-separated), not a JSON-LD object with `proof.cryptosuite = eddsa-jcs-2022`.

## What Matrixly does today

- OpenID4VP DCQL with `format: dc+sd-jwt` or `vc+sd-jwt` → **INVALID**, never VALID
- OpenID4VCI credential request with those formats → `unsupported_credential_format`
- Issuer metadata does **not** advertise an SD-JWT configuration
- Compliance control **OID-02** remains `not-claimed`

Ed25519 JCS over the full credential is not SD. `bbs-2023` (W3C Data Integrity BBS) is a different selective-disclosure cryptosuite; it is also not implemented.

## Why we do not dual-write

Issuing the same diploma as both `ldp_vc` and `dc+sd-jwt` would produce **two hashes**. The ledger anchors one credential hash. Dual-writing would either:

1. lie that both formats share a hash, or
2. register two credentials for one PDF without a legal/product reason

Do neither unless a named regulator or customer contract requires SD-JWT **as the issued format**. Then it is a new credential, with its own hash, status entry, and tests — not a JSON wrapper around the existing VC.

## What a real adapter would require

Not a parser that accepts `eyJ` and returns VALID.

1. **Keys.** EUDI/HAIP profiles typically use ECDSA P-256 (`ES256`). Matrixly issuer keys are Ed25519. That is a new key type (or an honest refusal), not a recast of `did:key` Ed25519 as ES256.
2. **Issuance.** Build `_sd` (digests of salted disclosures), issuer-signed JWT, `vct` (not W3C `type`), `cnf` for holder binding. Do not stuff a W3C VC JSON into a JWT payload and call it SD-JWT VC.
3. **Presentation.** Verify the issuer JWT, the disclosed salts, and the Key Binding JWT against the verifier nonce. A presentation without KB-JWT must fail when binding is required.
4. **Status.** SD-JWT VC commonly uses IETF Token Status List, not W3C Bitstring Status List. Do not pretend our bitstring list is a Token Status List.
5. **OpenID.** Advertise `dc+sd-jwt` in credential issuer metadata and in DCQL only after (1)–(4) exist and have tests.
6. **Do not** enroll HAIP by listing the spec.

Until those exist, a wallet that only speaks SD-JWT cannot pull or present a Matrixly diploma. That is the correct outcome.

## Related

- Protocol map: [protocol-standards.md](protocol-standards.md)
- OpenID4VP: [../adr/ADR-011-openid4vp.md](../adr/ADR-011-openid4vp.md)
- OpenID4VCI: [../adr/ADR-012-openid4vci.md](../adr/ADR-012-openid4vci.md)
- Compliance: [../compliance/matrix.md](../compliance/matrix.md) (OID-02)
