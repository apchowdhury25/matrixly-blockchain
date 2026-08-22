# Fabric Gateway SDK integration (exploration)

**Not implemented.** This is the result of exploring `@hyperledger/fabric-gateway` against Matrixly’s `DistributedLedgerAdapter`. Do not treat this file as a live connection.

## What the Gateway is

From Fabric v2.4 the **peer** exposes a Gateway gRPC service. The client no longer does discovery, endorsement collection, or orderer submit itself. The peer:

1. Evaluates or endorses
2. Collects endorsements per policy
3. Submits to ordering
4. Waits for commit status

The Node client is [`@hyperledger/fabric-gateway`](https://www.npmjs.com/package/@hyperledger/fabric-gateway) (v1.12.x at exploration time) plus `@grpc/grpc-js`. The old `fabric-network` / `fabric-client` SDKs are the wrong stack.

Official API: [Node Gateway API](https://hyperledger.github.io/fabric-gateway/main/api/node/).

## Connection (real, not stubbed)

```ts
import * as grpc from "@grpc/grpc-js";
import { connect, hash, signers } from "@hyperledger/fabric-gateway";
import { createPrivateKey } from "node:crypto";

const client = new grpc.Client(peerEndpoint, grpc.credentials.createSsl(tlsRootCert));
const gateway = connect({
  client,
  identity: { mspId, credentials: clientCertPem },
  signer: signers.newPrivateKeySigner(createPrivateKey(clientKeyPem)),
  hash: hash.sha256,
});
const contract = gateway.getNetwork(channel).getContract(chaincode);
```

If any of `peerEndpoint`, TLS root, client cert, client key, MSP id, channel, or chaincode is missing, **do not call `connect`**. Keep today’s `FabricLedgerAdapter.refuse()`.

Identity here is an **MSP certificate**, not the issuer `did:key`. They are different layers:

| Layer | Identifier | Signs |
|---|---|---|
| Fabric client | X.509 under `FABRIC_MSP_ID` | Gateway proposals / commits |
| Matrixly issuer | `did:key` Ed25519 | W3C VC / status-list / reports |

The platform’s Gateway identity submits hashes. The issuer DID still signs credentials. Do not use the MSP key as a VC assertion key.

## Submit vs evaluate

| Adapter method | Gateway call | Why |
|---|---|---|
| `registerDid` / `registerIssuer` / `registerCredential` / `registerDocumentAnchor` / `registerSchema` / `registerVerificationAnchor` / `setCredentialStatus` | `contract.submitAsync(name, { arguments: [json] })` then `commit.getStatus()` | Must land in a block |
| `getDid` / `getIssuer` / `getCredential` / `getDocumentAnchor` / `getSchema` / `getVerificationAnchor` / `getCredentialStatus` | `contract.evaluateTransaction(name, id)` | Read world state; no orderer |

`submitTransaction` is a one-liner but hides commit status. Use **`submitAsync` + `getStatus()`** so we can fail closed:

```ts
const submitted = await contract.submitAsync("RegisterCredential", { arguments: [payload] });
const status = await submitted.getStatus();
if (!status.successful) {
  throw new Error(`Fabric commit failed tx=${status.transactionId} code=${status.code}`);
}
// status.transactionId: string
// status.blockNumber: bigint
```

`evaluateTransaction` returning empty / `not found` maps to `null` on `get*`. Do not map chaincode errors to a successful empty issuer.

## Mapping `LedgerSubmitResult`

Fabric does **not** give us a SHA-256 previous-hash genesis chain like `HashChainLedgerAdapter`. Honest mapping:

| Field | Hash-chain | Fabric Gateway |
|---|---|---|
| `seq` | monotonic block seq in Postgres | `Number(status.blockNumber)` |
| `blockHash` | SHA-256 of seq\|prev\|payload\|time | `fabric:tx:{transactionId}` until a block-header hash is fetched |
| `previousHash` | previous block SHA-256 | `fabric:unavailable` |
| `payloadHash` | JCS SHA-256 of `{kind,record}` | same JCS hash **computed locally**, stored off-chain for audit; not Fabric’s tx id |
| `timestamp` | ISO we set | ISO we set at submit (Fabric header time is not on `Status`) |

Never copy `transactionId` into `previousHash`. Never claim `verifyChain()` walked genesis.

`Network` can stream **block events** (`getBlockEvents`). It does not expose a simple `getBlockHash(n)`. A later enhancement may subscribe to block events and record header hashes. That is optional and not required to submit anchors.

## `verifyChain` on Fabric (honesty)

Hash-chain: recompute every block hash from genesis.

Fabric: integrity is **endorsement policy + ordering + commit status**. The client should:

1. Confirm the Gateway evaluates (peer reachable).
2. For a credential under verification, `evaluateTransaction('GetCredential', id)` and compare `credentialHash`.
3. Return `{ valid, length: Number(blockNumber) or 0, reason, model: "fabric-endorsement" }`.

If the peer is down, **throw**. Do not return `{ valid: true }`.

The issuer Ledger page must show `adapter: FabricLedgerAdapter` and `model: fabric-endorsement` so this is not mistaken for the hash-chain walk.

## Chaincode names vs TypeScript

Go contract API methods are invoked by **name**. Payloads are JSON strings (already the chaincode style).

| TypeScript | Chaincode today | Gap |
|---|---|---|
| `registerDid` | `RegisterDID` | none |
| `getDid` | `GetDID` | none |
| `registerIssuer` | `RegisterIssuer` | none |
| `getIssuer` | `GetIssuer` | none |
| `registerDocumentAnchor` | `RegisterDocumentAnchor` | none |
| `getDocumentAnchor` | `GetDocumentAnchor` | none |
| `registerCredential` | `RegisterCredential` | none |
| `getCredential` | `GetCredential` | none |
| `setCredentialStatus` | — | **must add** |
| `getCredentialStatus` | — | **must add** |
| `registerVerificationAnchor` | — | **must add** |
| `getVerificationAnchor` | — | **must add** |

Without those four functions, Fabric cannot be the ledger for revoke or verification reports. Hash-chain remains required for Phase 6 features until WP1 lands.

## Errors that must surface

| Gateway error | Application behavior |
|---|---|
| `EndorseError` | Throw; credential is **not** issued |
| `SubmitError` | Throw; do not write `credentials` as anchored |
| `CommitError` / `status.successful === false` | Throw; world state did not accept the tx |
| gRPC UNAVAILABLE | Throw; same as today’s refuse |
| Evaluate `not found` | Return `null` |

Application code (`issueDegree`, `revokeCredential`) already awaits `ledger.register*` and will fail the request if the adapter throws. Keep it that way. Do not catch and mark the diploma issued.

## What this sandbox cannot do

- No Fabric peer, orderer, CA, or channel
- No MSP crypto material
- Installing `@hyperledger/fabric-gateway` without a network only enables **unit tests with a mock `Contract`**

A mock `Contract` is valid for tests (`submitAsync` records the function name + payload; `getStatus` returns a fixture). It is **not** a ledger. Tests must not set `LEDGER_ADAPTER=fabric` in the preview process.

## Implementation order (when approved)

1. Chaincode status + verification anchors (otherwise Gateway mapping is incomplete).
2. `FabricGateway` wrapper: `connectFromEnv()` or `refuse()`.
3. Map adapter methods to submit/evaluate as in the table.
4. Factory `LEDGER_ADAPTER` default `hashchain`.
5. Tests: refuse without env; mock submit/evaluate; existing 42 trust tests still on hash-chain.

See [Phase 7](../phases/phase-07.md) WP0–WP2.
