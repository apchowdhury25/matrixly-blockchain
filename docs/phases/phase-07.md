# Phase 7 — Production adapters

**Status: implemented on the preview path (fail-closed).** Completed 21 August 2026.

Live Fabric peers, S3 buckets, and AWS KMS are **operator infrastructure**. This phase ships the ports, factory, chaincode gaps, and tests that prove refuse-to-fake. Default runtime remains hash-chain + database bytes + local AES.

## What was implemented

- `LEDGER_ADAPTER=hashchain|fabric` factory (`src/lib/ledger/factory.ts`)
- Fabric adapter: Gateway `submitAsync` / `evaluate` mapping, honest `previousHash = fabric:unavailable`
- Injected `GatewayContract` test double (not a ledger)
- Unconfigured Fabric **throws**
- Chaincode: `SetCredentialStatus`, `GetCredentialStatus`, `RegisterVerificationAnchor`, `GetVerificationAnchor`
- Object storage port: db / filesystem / S3-refuse
- KMS port: local AES-GCM / AWS-refuse
- Ledger / Documents / Keys pages name the real adapters
- Schema `0008_storage.sql`

## Tests

See `src/lib/ledger/fabric.test.ts`, `factory.test.ts`, `src/lib/storage/storage.test.ts`, `src/lib/crypto/kms.test.ts`.

## Not in this phase

- A running Fabric network in this environment
- Real AWS S3 / KMS SDK sessions
- Replay job from hash-chain onto Fabric (cutover runbook remains in this document below)


---

## Goal

Swap three boundaries behind the interfaces that already exist:

| Boundary today | Production target | Honesty rule |
|---|---|---|
| `HashChainLedgerAdapter` (Postgres-backed) | Hyperledger Fabric Gateway → `document-registry` chaincode | Refuse if the Gateway is not connected. Never return `true`. |
| `documents.content_b64` in Postgres | Object store (S3 / GCS / Azure Blob / filesystem) | Ledger still stores **SHA-256 only**. |
| AES-256-GCM wrapping key derived from `BETTER_AUTH_SECRET` | Cloud KMS (or a dedicated wrapping secret) | Sealed Ed25519 secrets never leave the KMS envelope. |

The verifier pipeline, VC format, DID method, status-list credential, and verification reports **do not change**.

---

## Non-negotiable

1. **Do not fake Fabric.** If `LEDGER_ADAPTER=fabric` and the Gateway is unreachable, issuance and anchoring must throw. Verification of already-issued credentials may still use the hash-chain adapter if that is the ledger they were anchored on — do not silently retarget.
2. **Do not dual-write and call both “the ledger.”** One adapter is authoritative per deployment. A migration window may **copy** hashes onto Fabric, then cut over. Until cutover, `getLedger()` returns the hash-chain.
3. **Do not put original files on-chain.** Object storage holds bytes; world state holds hashes, DIDs, status, report hashes.
4. **Do not claim Fabric `verifyChain()` walks a SHA-256 genesis chain.** Fabric integrity is endorsement + ordering. The adapter must document that, and map `LedgerSubmitResult` to **transaction id + block number**, not invented previous-hashes.
5. **Do not depend on one cloud.** Storage and KMS are interfaces. S3 is one implementation.
6. **Fail closed.** Missing `STORAGE_BACKEND`, empty bucket credentials, or missing KMS key is an error in production (`DATABASE_URL` set). Preview without those env vars keeps today’s behavior.

---

## Current contracts (do not redesign)

Ledger port: [`src/lib/ledger/adapter.ts`](../../src/lib/ledger/adapter.ts)

| Adapter method | Chaincode function (Go) | World-state key |
|---|---|---|
| `registerDid` | `RegisterDID` | `DID:{did}` |
| `getDid` | `GetDID` | `DID:{did}` |
| `registerIssuer` | `RegisterIssuer` | `ISSUER:{issuerDid}` |
| `getIssuer` | `GetIssuer` | `ISSUER:{issuerDid}` |
| `registerDocumentAnchor` | `RegisterDocumentAnchor` | `DOCUMENT:{documentHash}` |
| `getDocumentAnchor` | `GetDocumentAnchor` | `DOCUMENT:{documentHash}` |
| `registerCredential` | `RegisterCredential` | `CREDENTIAL:{credentialId}` |
| `getCredential` | `GetCredential` | `CREDENTIAL:{credentialId}` |
| `setCredentialStatus` | **missing — add** `SetCredentialStatus` | `CREDENTIAL:{id}` + `STATUS:{id}` |
| `getCredentialStatus` | **missing — add** `GetCredentialStatus` | `STATUS:{id}` |
| `registerVerificationAnchor` | **missing — add** `RegisterVerificationAnchor` | `VREPORT:{reportHash}` |
| `getVerificationAnchor` | **missing — add** `GetVerificationAnchor` | `VREPORT:{reportHash}` |
| `getLatestBlock` | Fabric `GetBlockByTxID` / QSCC | n/a |
| `verifyChain` | See “Fabric integrity” below | n/a |

Chaincode source: [`chaincode/document-registry/document_registry.go`](../../chaincode/document-registry/document_registry.go)

Evidence package (already hash-only on-chain): [`src/lib/documents/evidence.ts`](../../src/lib/documents/evidence.ts)

Key wrap today: [`src/lib/trust/seal.ts`](../../src/lib/trust/seal.ts)

---

## Work packages

### WP0 — Adapter factory (small, first)

File: `src/lib/trust/runtime.ts` `getLedger()`.

```
LEDGER_ADAPTER=hashchain | fabric   # default hashchain
```

- `hashchain` → current `HashChainLedgerAdapter` (preview and tests).
- `fabric` → `FabricLedgerAdapter.connect(env)`. If connect fails, **throw**. Do not fall back to hash-chain while claiming Fabric.
- Log the adapter **name** on the issuer Ledger page (already shown).

Tests: factory unit tests with mocked env; Fabric still refuses without config.

### WP1 — Complete chaincode

Add to `document_registry.go` (and Go tests with the Fabric mock stub):

1. `SetCredentialStatus` — append-only status; never delete the credential record.
2. `GetCredentialStatus`
3. `RegisterVerificationAnchor` — `{ reportId, reportHash, credentialHash, resultStatus, verifierDid, at }`. **No report body, no holder name.**
4. `GetVerificationAnchor`
5. Events: `credential.status`, `verification.anchored`

Endorse policy (network, not code): `AND('Org1MSP.peer','Org2MSP.peer')` for production; single-org only for a lab.

### WP2 — Fabric Gateway adapter (real SDK)

Package: `@hyperledger/fabric-gateway` (v1.12.x explored) + `@grpc/grpc-js`.

Do **not** use `fabric-network` / `fabric-client`.

Connection and mapping: [docs/architecture/fabric-gateway.md](../architecture/fabric-gateway.md).

Required env (all must be present or `connect` is never called — `refuse()`):

| Variable | Purpose |
|---|---|
| `FABRIC_PEER_ENDPOINT` | `hostname:port` |
| `FABRIC_MSP_ID` | Client MSP |
| `FABRIC_CHANNEL` | Channel name |
| `FABRIC_CHAINCODE` | Default `document-registry` |
| `FABRIC_TLS_ROOT_CERT` | PEM path or PEM contents |
| `FABRIC_CLIENT_CERT` | Client TLS/identity cert |
| `FABRIC_CLIENT_KEY` | Client private key |
| `FABRIC_TIMEOUT_MS` | Submit timeout (default 15000) |

Implementation notes:

- Submit (`submitTransaction`) for all `register*` / `set*`.
- Evaluate (`evaluateTransaction`) for all `get*`.
- Map submit result: `txId` → `payloadHash`, block number → `seq`, block hash if the Gateway exposes it → `blockHash`. If previous-block hash is unavailable, set `previousHash` to `fabric:unavailable` **and never pretend it is a SHA-256 genesis link**.
- `verifyChain`: ping the peer, evaluate `GetIssuer`/`GetCredential` for the record under check. Do **not** recompute hash-chain blocks. Return `{ valid, length, reason, model: "fabric-endorsement" }`.
- Extend `VerificationResult` / ledger inspector UI to show `adapter: FabricLedgerAdapter` vs hash-chain so operators cannot confuse the two.

Network topology (out of this repo, documented for operators):

```
Org1 peer + CA     Org2 peer + CA
        \           /
         orderer(s)
              |
         channel `trust`
              |
     chaincode document-registry
```

This sandbox **cannot** run that network. Implementation of WP2 is code + tests against a mock Gateway / recorded gRPC. Connecting a live network is an ops task after this phase’s code lands.

### WP3 — Object storage

New port: `src/lib/storage/adapter.ts`

```ts
export interface ObjectStorageAdapter {
  readonly name: string;
  put(objectName: string, bytes: Uint8Array, mime: string): Promise<void>;
  get(objectName: string): Promise<Uint8Array>;
  head(objectName: string): Promise<{ byteLength: number; mime: string } | null>;
}
```

Implementations:

| Class | When | Behavior |
|---|---|---|
| `DatabaseObjectStore` | default / preview | Today’s `documents.content_b64` |
| `FilesystemObjectStore` | `STORAGE_BACKEND=fs` `STORAGE_PATH=` | Local disk, still not on-chain |
| `S3ObjectStore` | `STORAGE_BACKEND=s3` | Real AWS SDK. **Refuse** without bucket + credentials |
| `GcsObjectStore` | `STORAGE_BACKEND=gcs` | Same honesty rule |

`objectName` is already generated in `buildEvidence` (random, not the filename). Put uses that key. Postgres keeps the evidence row (hash, mime, kind, byteLength, objectName) and **drops `content_b64` after a backfill**.

Migration `0008_storage.sql`:

- `documents.storage_backend text`
- `documents.content_b64` nullable
- Backfill job: for each row with `content_b64`, `put(objectName, bytes)`, then null the column.

Verification `downloadDocument` / bound-file checks call `storage.get(objectName)`, then SHA-256 the bytes. Filename still ignored.

### WP4 — KMS wrapping

New port: `src/lib/crypto/kms.ts`

```ts
export interface KeyWrappingAdapter {
  readonly name: string;
  wrap(plainHex: string): Promise<string>;
  unwrap(sealed: string): Promise<string>;
}
```

| Class | When |
|---|---|
| `LocalAesGcmKms` | default (current `seal.ts`) |
| `AwsKmsWrapping` | `KMS_BACKEND=aws` + `KMS_KEY_ID` |
| `GcpKmsWrapping` | `KMS_BACKEND=gcp` + key resource name |

Production (`DATABASE_URL` set) already refuses a missing `BETTER_AUTH_SECRET`. Phase 7 additionally refuses `KMS_BACKEND=aws` without a key id.

Sealed material in `key_secrets.secret_key_hex` stays ciphertext. Unwrap only in issue / revoke / status-list re-sign paths.

### WP5 — Operator UI and docs

- Ledger page: adapter name, channel, chaincode, last tx id (Fabric) **or** genesis walk (hash-chain). Never mix the two columns.
- Documents page: `storage: s3` / `db` / `fs` next to hash.
- Keys page: `kms: local-aes` / `aws` — still no secret material.
- README production section: env table, fail-closed examples.
- Runbook: `docs/runbooks/fabric.md` (network bring-up is external).

### WP6 — Tests (phase is not complete without these)

| Test | Must prove |
|---|---|
| Fabric adapter without env | Throws; does not return a success `LedgerSubmitResult` |
| Fabric adapter with mock Gateway | `registerCredential` submits the JSON payload; `getCredential` returns it |
| Chaincode `SetCredentialStatus` | Status changes; credential hash unchanged |
| Storage S3 without bucket | Throws |
| Round-trip put/get | SHA-256 of `get()` equals evidence hash |
| KMS unwrap mismatch | Issue path fails closed |
| Verification unchanged | Existing 42 trust tests still pass on hash-chain + db store |

---

## Cutover sequence (production)

1. Deploy WP0–WP4 with `LEDGER_ADAPTER=hashchain` still on.
2. Stand up Fabric lab; install `document-registry`.
3. **Replay job** (one-shot): for each hash-chain `ISSUER` / `DID` / `DOCUMENT_ANCHOR` / `CREDENTIAL` / `CREDENTIAL_STATUS` / `VERIFICATION_ANCHOR` block, submit the same record to Fabric. Do not replay document bytes.
4. Compare counts: world state vs hash-chain.
5. Flip `LEDGER_ADAPTER=fabric`. New issues go to Fabric only.
6. Keep the hash-chain table as an archive. Do not delete it in this phase.
7. Object-store backfill, then null `content_b64`.
8. Point wrapping at KMS; re-wrap secrets (admin-only job). Old local wraps must fail to unwrap after the flip unless a dual-read window is explicit.

---

## Environment matrix

| Variable | Preview | Production |
|---|---|---|
| `DATABASE_URL` | unset (PGLite) | Neon / RDS |
| `LEDGER_ADAPTER` | `hashchain` | `fabric` |
| `STORAGE_BACKEND` | `db` | `s3` or `gcs` |
| `KMS_BACKEND` | `local` | `aws` or `gcp` |
| Fabric / bucket / KMS secrets | unset | required |

If production env is mixed (e.g. `LEDGER_ADAPTER=fabric` but no peer endpoint), **process must not serve “VALID” for new anchors**.

---

## Files this phase will create or change

```
chaincode/document-registry/document_registry.go   # status + verification anchors
chaincode/document-registry/document_registry_test.go
src/lib/ledger/fabric.ts                           # real Gateway, still refuse if unconfigured
src/lib/ledger/factory.ts                          # LEDGER_ADAPTER
src/lib/storage/adapter.ts
src/lib/storage/database.ts
src/lib/storage/s3.ts
src/lib/storage/fs.ts
src/lib/crypto/kms.ts
src/lib/trust/seal.ts                              # delegate to KMS adapter
src/lib/trust/runtime.ts                           # getLedger + getStorage
migrations/0008_storage.sql
docs/runbooks/fabric.md
docs/adr/ADR-007-production-adapters.md
```

---

## Acceptance

Phase 7 is complete only when:

1. `LEDGER_ADAPTER=fabric` with no Gateway **throws** (already true today; must remain true after SDK wiring).
2. A mock or lab Fabric network can register a DID, document hash, credential, status change, and verification-report hash; `get*` round-trips.
3. Object storage put/get preserves SHA-256; bound-file verification still fails on a one-byte mutation.
4. Original PDF bytes are not in any ledger payload and not in Fabric world state.
5. All existing `npm run test:trust` tests pass against hash-chain + db store (preview path unbroken).
6. README documents env and the fail-closed behavior.

---

## Out of scope (later)

- Additional DLT adapters (Besu, Corda) — same port, new class
- DIDComm / mobile wallet
- Selective disclosure (BBS+/SD-JWT)
- Multi-cloud failover
- Managed Fabric-as-a-service provisioning from this app

---

## What this preview will still be after Phase 7 code lands

Until operators attach a Fabric network and a bucket, the live product remains:

- Hash-chain ledger
- Database object bytes
- Local AES wrapping

That is correct. It is not Fabric. The UI and logs must keep saying so.
