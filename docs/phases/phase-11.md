# Phase 11 — OpenID4VP

**Status: implemented.** Completed 21 August 2026.

Wallets present credentials to Matrixly as a verifier using [OpenID4VP 1.0](https://openid.net/specs/openid-4-verifiable-presentations-1_0.html) (Final, 9 July 2025).

## What shipped

- Authorization request: `response_type=vp_token`, `response_mode=direct_post`, DCQL, nonce, state
- `GET /api/v1/oid4vp/request/{id}` — `request_uri` for wallets
- `POST /api/v1/oid4vp/direct-post/{id}` — `vp_token` object keyed by DCQL id
- Nonce bound as Data Integrity `proof.challenge`; `client_id` as `proof.domain`
- Single-use nonce; replay is INVALID
- DCQL default query: W3C `ldp_vc` UniversityDegreeCredential
- Preview wallet on the request page (not an EUDI wallet) and `POST /api/v1/oid4vp/preview-wallet/{id}`
- Holder wallet can fulfill a request id

## What is refused (never VALID)

- `dc+sd-jwt` / `vc+sd-jwt`
- `mso_mdoc`
- JWT `vp_token` (`eyJ…`)
- Wrong nonce / wrong state / expired request

## What is not claimed

- OpenID Foundation HAIP self-certification
- OpenID4VCI
- SIOPv2
- JAR-signed request objects
- Client Identifier Prefixes (`x509_san_dns`, `decentralized_identifier`)

## Tests

`src/lib/oid4vp/oid4vp.test.ts`
