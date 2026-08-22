# Phase 13 — Status list resolution and credential schema

**Status: implemented.** Completed 21 August 2026.

## What shipped

- Verifiers resolve `credentialStatus.statusListCredential` **from its URL**, not from an `issuer_id` table join
- `GET /credentials/status/{id}` publishes the signed Bitstring Status List credential as JSON
- SSRF: loopback, link-local, RFC1918 hosts fail closed
- W3C `credentialSchema` (`JsonSchema`) for UniversityDegreeCredential
- `GET /schemas/university-degree-credential.json` and human page `/schemas/university-degree`
- Unknown schema ids fail closed and never return VALID
- New diplomas include the published schema id by default

## What is not claimed

- Full JSON Schema 2020-12 processor (this runtime checks the published university-degree rules)
- Fetching arbitrary remote status lists as a CDN cache
- SD-JWT / mdoc schemas

## Tests

`src/lib/status/resolve.test.ts`, `src/lib/schema/university-degree.test.ts`, engine URL + unknown-schema cases
