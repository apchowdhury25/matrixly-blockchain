# Phase 12 — OpenID4VCI

**Status: implemented.** Completed 21 August 2026.

Wallets pull an already-signed diploma from Matrixly using [OpenID4VCI 1.0](https://openid.net/specs/openid-4-verifiable-credential-issuance-1_0.html) (Final, 16 September 2025) **pre-authorized code** flow.

## What shipped

- `GET /.well-known/openid-credential-issuer` (and `/api/v1/oid4vci/metadata`)
- Credential offer: `openid-credential-offer://` with `pre-authorized_code` = existing claim token
- `POST /api/v1/oid4vci/token` — grant `urn:ietf:params:oauth:grant-type:pre-authorized_code`
- `POST /api/v1/oid4vci/credential` — Bearer `mtx_vci_…`, response `{ credentials: [{ credential }] }`
- Delivery does **not** re-sign the W3C VC
- Preview wallet on `/oid4vci` (not an EUDI wallet)
- Format: `ldp_vc` only

## What is refused (never a credential)

- `authorization_code` grant
- `dc+sd-jwt` / `vc+sd-jwt` / `mso_mdoc`
- Missing or reused access token
- Reused pre-authorized code

## What is not claimed

- OpenID Foundation HAIP self-certification
- Authorization code flow, DPoP, deferred issuance, notification endpoint
- Holder key binding at issuance (`credentialSubject.id` is not rewritten)

## Tests

`src/lib/oid4vci/oid4vci.test.ts`
