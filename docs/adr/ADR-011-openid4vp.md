# ADR-011 OpenID4VP 1.0

## Context

Phase 10 hosted `did:web`. Banks and EUDI wallets present over OpenID4VP, not a custom JSON POST.

## Decision

1. Implement OpenID4VP 1.0 `direct_post` + DCQL for W3C Data Integrity presentations (`ldp_vc` / `ldp_vp`).
2. Bind the request `nonce` in the VP proof `challenge` and `client_id` in `domain` so replay fails the signature or the explicit check.
3. Refuse SD-JWT and mdoc formats. Do not coerce them into VALID.
4. Do not claim HAIP or OpenID Foundation certification.

## Consequences

- A wallet that only speaks SD-JWT cannot present here yet (honest INVALID).
- Unsigned `request_uri` JSON is preview-grade; production should add JAR.
