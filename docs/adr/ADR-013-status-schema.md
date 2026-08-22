# ADR-013 Status list URL resolution and JsonSchema

## Context

Revocation was proven by a signed bitstring list, but the verifier loaded that list with `WHERE issuer_id = ?`. A third party with only the VC JSON still depended on our database.

Credentials had an optional `credentialSchema` field that was never published or checked.

## Decision

1. The verifier fetches `credentialStatus.statusListCredential`. For `https://trust.matrixly.ai/credentials/status/…` it loads the **published document** by that id. It does not join on issuer_id.
2. Loopback and private hosts are refused.
3. New university degrees carry `credentialSchema.id` of the published JsonSchema. Unknown ids fail closed.
4. Missing schema on legacy credentials is not automatically INVALID.

## Consequences

- Tampering the published status list JSON is a signature failure, not a row update.
- We do not claim a generic JSON Schema 2020-12 engine.
