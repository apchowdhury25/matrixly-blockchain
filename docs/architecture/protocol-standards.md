# Protocol standards investigation

This is an engineering map, **not a certification**. Matrixly Trust does not become
eIDAS-, EUDI-, or OpenID-certified by listing these documents. The control list is
[docs/compliance/matrix.md](../compliance/matrix.md).

There are two different “Matrix” protocols in circulation. This note covers both.

## 1. Matrix.org (chat federation) — not this product

[Matrix](https://spec.matrix.org/) is an open standard for real-time messaging.
Current spec: **v1.19**.

| API | Role |
|---|---|
| Client–Server | Apps talk to a homeserver |
| Server–Server | Federation between homeservers |
| Identity Service | Optional 3PID (email/phone) → Matrix ID |
| Application Service | Bridges/bots |
| Olm / Megolm | E2E device encryption |

Identity in Matrix is `@user:server`, not `did:key`. Crypto is Olm/Megolm, not
Ed25519 Data Integrity proofs. **Matrixly Trust does not implement Matrix.org.**
A future adapter could *notify* a Matrix room of a verification event the same
way webhooks do today. That would still not make a diploma a Matrix event.

## 2. What Matrixly Trust implements today

| Standard | Status in the industry | Matrixly |
|---|---|---|
| [W3C VC Data Model 2.0](https://www.w3.org/TR/vc-data-model-2.0/) | Recommendation (15 May 2025) | Implemented (issuance + verify) |
| [W3C Data Integrity 1.0](https://www.w3.org/TR/vc-data-integrity/) | Recommendation (15 May 2025) | Implemented |
| [Data Integrity EdDSA Cryptosuites](https://www.w3.org/TR/vc-di-eddsa/) (`eddsa-jcs-2022`) | Recommendation | Implemented |
| [RFC 8785 JCS](https://www.rfc-editor.org/rfc/rfc8785) | IETF | Implemented (canonicalization before sign/verify) |
| [Bitstring Status List 1.0](https://www.w3.org/TR/vc-bitstring-status-list/) | Recommendation (15 May 2025) | Implemented as a **signed VC**, not a DB flag |
| [DID Core 1.0](https://www.w3.org/TR/did-core/) | Recommendation (19 Jul 2022) | Partial: `did:key` + `did:web` |
| [did:key](https://w3c-ccg.github.io/did-key-spec/) | CCG draft, **not** a W3C REC | Implemented (Ed25519). Long-lived use wants HSM |
| [did:web](https://w3c-ccg.github.io/did-method-web/) | CCG draft, **not** a W3C REC | Implemented (HTTPS documents; private hosts fail closed) |
| SHA-256 of exact bytes | FIPS 180-4 / industry | Implemented; filename is not evidence |
| HMAC-SHA256 webhooks | IETF HMAC | Implemented (`matrixly-signature`) |
| Hyperledger Fabric | Linux Foundation | Adapter **refuses** without a real Gateway |

Independent checks (hash, signature, issuer, ledger, status) must each be able
to fail. A green badge that skipped a failed check is a defect, not a profile.

## 3. Adjacent protocols we do **not** implement

These are the ones banks, EUDI wallets, and governments actually ask for next.

| Standard | Body | What it is | Why it is not Matrixly yet |
|---|---|---|---|
| [OpenID4VCI 1.0](https://openid.net/specs/openid-4-verifiable-credential-issuance-1_0.html) | OpenID Foundation (Final, Sep 2025) | OAuth API to **issue** credentials into a wallet | Our issue path is a server function, not OID4VCI |
| [OpenID4VP 1.0](https://openid.net/specs/openid-4-verifiable-presentations-1_0.html) | OpenID Foundation (Final, Jul 2025) | OAuth flow to **present** a VP to a verifier | Our VP is posted JSON / claim link, not `vp_token` |
| [HAIP 1.0](https://openid.net/specs/openid4vc-high-assurance-interoperability-profile-1_0.html) | OpenID Foundation | High-assurance profile of the above | Conformance tests opened 2026; we are not enrolled |
| SIOPv2 | OpenID Foundation | Self-issued OpenID Provider | Holder DID is not an OIDC OP |
| IETF SD-JWT VC | IETF (draft) | Selective disclosure JWT credentials | We sign the whole JSON VC; no SD |
| ISO/IEC 18013-5 mdoc / mDL | ISO | CBOR + COSE mobile documents | Different encoding entirely |
| [DID Core 1.1](https://www.w3.org/TR/did-1.1/) | W3C CR (Mar 2026) | Successor to DID 1.0 | Pin 1.0 until 1.1 is REC |
| [did:web](https://w3c-ccg.github.io/did-method-web/) | CCG | DID hosted at `https://{domain}/.well-known/did.json` | **Implemented** (Phase 10). Still not a W3C REC |
| DID Resolution 1.0 | W3C WD | Universal resolver | We only expand `did:key` |
| DIDComm / Aries RFC 0809 | DIF / Hyperledger | Wallet-to-wallet messaging of VCs | Out of scope |
| eIDAS 2 / EUDI ARF | EU | Legal + technical wallet framework | Uses OID4VP + SD-JWT/mdoc; we do not claim it |

OpenID Foundation opened **self-certification** for OpenID4VP / OpenID4VCI / HAIP
in 2026. That is a real program. Listing the specs is not enrollment.

## 4. Cryptosuite choice

W3C Data Integrity defines two EdDSA suites:

| Suite | Canonicalization | Matrixly |
|---|---|---|
| `eddsa-jcs-2022` | RFC 8785 JSON | **This runtime** |
| `eddsa-rdfc-2022` | RDF Dataset Canonicalization | Not implemented |

JCS is the right default for JSON credentials that are not RDF-first.
RDFC is required if a verifier is a JSON-LD RDF processor. Supporting both is
an adapter, not a rewrite of the hash of the diploma.

`bbs-2023` (selective disclosure) is a different cryptosuite. Do not pretend
Ed25519 JCS is selective disclosure.

## 5. Ledger vs credential standards

Fabric, Ethereum, and a hash-chain are **anchoring transports**. They are not
credential formats. The W3C VC remains valid if the ledger adapter is
hash-chain today and Fabric later, provided the **hash of the credential** is
what gets appended. Putting the PDF on-chain would violate both privacy and
the W3C “keep claims off unnecessary ledgers” guidance.

## 6. Recommended adapters (not scheduled)

If interoperability is the next product goal, order of value:

1. **`did:web`** — institutions need a DID they host, not only `did:key`.
2. **OpenID4VP** — so an EUDI / commercial wallet can present to Matrixly.
3. **OpenID4VCI** — so a wallet can pull a diploma from Matrixly.
4. **SD-JWT or mdoc** — only if a regulator names that format; do not dual-write by default.

Do not implement Matrix.org federation to “look decentralized.” It solves chat,
not document authenticity.

## 7. Sources (pinned)

- W3C VC 2.0 / Data Integrity / Bitstring Status List — REC 15 May 2025
- DID Core 1.0 — REC 19 July 2022
- OpenID4VCI 1.0 — Final 16 September 2025
- OpenID4VP 1.0 — Final 9 July 2025
- Matrix spec v1.19 — https://spec.matrix.org/v1.19/
