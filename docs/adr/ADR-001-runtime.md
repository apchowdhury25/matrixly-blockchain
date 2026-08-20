# ADR-001 Runtime and monorepo shape

## Context

The platform specification calls for a pnpm + Turborepo monorepo (Next.js, NestJS, Fabric, Helm). This workspace must also serve a live product on TanStack Start / Vite at a single preview origin.

## Decision

1. Ship a production-capable TanStack Start application with domain modules under `src/lib/{crypto,credentials,identity,ledger,verification,trust}`.
2. Keep a `DistributedLedgerAdapter` port. Default implementation: `HashChainLedgerAdapter` (real SHA-256 linked log). `FabricLedgerAdapter` refuses to run without a Gateway endpoint — it does not return true.
3. Defer Next.js/NestJS process split until a Fabric network and Kubernetes environment exist outside this preview.

## Alternatives

- Generate an inert Next.js/NestJS tree that does not run here. Rejected: the specification forbids claiming operational security that is not running.
- Fake Fabric with `verifyBlockchain() { return true }`. Rejected.

## Consequences

- Live issuance, hashing, signing, anchoring, and verification work today.
- Fabric chaincode can be added beside the adapter without rewriting credential/verification code.
