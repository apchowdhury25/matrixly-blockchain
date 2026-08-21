# Phase 10 — did:web

**Status: implemented.** Completed 21 August 2026.

Issuers need a DID they host, not only `did:key`. Phase 10 adds the CCG `did:web` method: HTTPS DID documents, fail-closed fetch, and a demo credential whose issuer is the hosted DID.

## What shipped

- `did:web:{host}:issuers:{slug}` → `https://{host}/issuers/{slug}/did.json`
- Public document at `/did-web/global-university` and `GET /api/v1/did-web/global-university`
- Resolver: `did:key` (local), `did:web` (HTTPS or in-process for `*.example.test`)
- Loopback, RFC1918, and `169.254.169.254` refused
- Document `id` must match the identifier
- Demo ref `demo-valid-didweb` — issuer is `did:web:matrixly.example.test:issuers:global-university`, same Ed25519 key as the registrar `did:key` (`alsoKnownAs`)
- Unknown methods still fail closed (never VALID)

## What did not change

- Default issuance is still `did:key`
- OpenID4VP / OpenID4VCI / SD-JWT / mdoc / Matrix.org are not implemented
- This is not a universal resolver

## Tests

`src/lib/identity/did-web.test.ts`
