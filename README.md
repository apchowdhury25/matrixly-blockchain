# Matrixly Trust

Enterprise document and credential verification. A verifier decides authenticity from **cryptographic evidence and a distributed ledger**, not from a centralized `verified = true` checkbox.

This repository is the runnable Matrixly Trust platform:

- W3C Verifiable Credentials 2.0
- Ed25519 Data Integrity proofs (`eddsa-jcs-2022` over RFC 8785 JCS)
- SHA-256 document binding (original PDFs stay off-chain)
- W3C Bitstring Status List 1.0 revocation
- Append-only SHA-256 hash-chained ledger
- Hyperledger Fabric adapter that **refuses to fake** a transaction

## What you can do

- Verify the Global University demo diploma: valid, one-byte tamper, revoked, expired
- Sign in as an issuer and issue a new diploma
- Claim a credential into a holder wallet and create a verifiable presentation
- Inspect the ledger hash chain and public keys
- Open an opaque QR verification link with no PII in the code

## Trust chain

```
Issuer → Identity → Document → SHA-256 → VC 2.0 → Ed25519
      → DLT anchor → Holder → Verification → Status → Audit
```

## Prerequisites

- **Node.js 22** (LTS)
- **npm 10+** (ships with Node 22)
- Git

Optional, for a networked database instead of the embedded preview store:

- A Postgres 16+ instance (Neon, RDS, or local Docker)

## Setup

```bash
git clone https://github.com/apchowdhury25/matrixly-blockchain.git
cd matrixly-blockchain
npm install
```

### 1. Run locally (no database required)

```bash
npm run dev
```

Open [http://localhost:8080](http://localhost:8080).

With no `DATABASE_URL`, the app uses **PGLite** (Postgres compiled to WASM). Schema migrations apply on startup. The Global University demo diplomas are seeded automatically.

### 2. Optional — attach Postgres / Neon

Set a connection string in the environment (do not commit it):

```bash
export DATABASE_URL="postgresql://USER:PASSWORD@HOST/DB?sslmode=require"
npm run db:migrate
npm run dev
```

`npm run build` also runs migrations so a production deploy has schema before traffic.

### 3. Sign in (issuer console)

Public verification does **not** require an account.

To issue credentials:

1. Open `/login`
2. Create an issuer account with email and password, **or** continue with Google / X when those providers are configured
3. You are redirected to `/app`

Email/password is enabled in `src/lib/auth/email-password.ts`.

### 4. Production build

```bash
npm run build
npm run preview
```

Preview serves the built output (default Vite preview port **8081**).

## Demo walkthrough

| Path | What it is |
|---|---|
| `/` | Public home + live verification playground |
| `/verify` | Public verifier (paste an opaque reference or scan a QR) |
| `/verify/demo-valid-bcs` | Valid Global University BCS diploma |
| `/login` | Sign in (issuer console or holder wallet) |
| `/wallet` | Holder wallet (claim + present) |
| `/wallet/claim/:token` | Opaque claim delivery |
| `/present/:ref` | Public verifiable presentation |
| `/app` | Issuer workspace |
| `/app/documents` | Ingest and inspect documents (hash only goes on-chain) |
| `/app/issue` | Issue a new diploma or bind an ingested file |
| `/app/credentials` | Issued credentials |
| `/app/ledger` | Hash-chain inspector |
| `/app/status` | Signed Bitstring Status List credential |
| `/status/:id` | Public status list document |
| `/app/keys` | Public keys / DID (private keys never leave the server). Admins can rotate. |
| `/did/:multibase` | Public DID document for a `did:key` |
| `/app/audit` | Audit log |
| `/trust` | Trust model explanation |

The playground covers four independent failure modes. Each check can fail on its own:

- **Valid** — signature, document hash, issuer, ledger, and status all pass
- **Tampered** — one byte of the PDF changed; document hash check fails
- **Revoked** — Bitstring Status List bit is set
- **Expired** — `validUntil` is in the past

## QA

Full checklist: [docs/qa.md](docs/qa.md).

**Documents (Phase 3)** — sign in, open `/app/documents`:

1. Upload a real PDF → status `HASHED`, SHA-256 of the bytes is shown
2. Upload the same file again → one row, same hash (dedup)
3. Rename a PDF to `.exe` and upload → **accepted** (magic bytes, not the name)
4. Rename an `.exe` or ZIP to `.pdf` and upload → **rejected**
5. Issue from the hashed document → public verifier `VALID` with the bound file; a one-byte-different file is `INVALID`

Do not use “upload a `.exe` renamed to `.pdf`” as a positive test. That file is an executable and must fail closed.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Development server on `0.0.0.0:8080` |
| `npm run build` | Production build + database migrate |
| `npm run preview` | Serve the production build |
| `npm run db:migrate` | Apply `migrations/*.sql` |
| `npm test` | Crypto, credential engine, hash-chain, and script tests |
| `npm run typecheck` | TypeScript (`tsc --noEmit`) |
| `npm run lint` | ESLint |
| `npm run format` | Prettier |

## Project layout

```
src/
  lib/crypto/          SHA-256, RFC 8785 JCS, Ed25519, did:key
  lib/identity/        DID resolution, RBAC, key lifecycle
  lib/credentials/     VC 2.0 issuance and Bitstring Status List
  lib/verification/    Independent verification pipeline
  lib/ledger/          Hash-chain adapter + Fabric adapter (refuse-to-fake)
  lib/documents/       Diploma PDF generation, ingest, evidence packages
  lib/trust/           Runtime, seed, server functions, key sealing
  routes/              Public verifier, issuer console, auth
chaincode/
  document-registry/   Hyperledger Fabric chaincode (hashes and status only)
migrations/            Postgres schema (tenants, credentials, ledger_blocks, …)
docs/                  Architecture, trust model, ADRs
```

## Ledger adapters

The running product uses `HashChainLedgerAdapter`: an append-only log whose block hashes recompute from genesis. That is real cryptography, not a mock.

`FabricLedgerAdapter` is a first-class port. It **throws** unless a Hyperledger Fabric Gateway is configured. Application code must not catch that error and treat a credential as anchored.

Chaincode lives in `chaincode/document-registry/`. It stores credential hash, document hash, issuer DID, and status — never original PDFs or unnecessary PII.

## Security notes

- Original PDFs stay off-chain
- Signing keys are AES-256-GCM sealed and are never returned by the API
- Key rotation creates a new `did:key`; historical credentials still verify
- Tenant roles: `TENANT_ADMIN` (rotate + issue), `ISSUER` (issue/revoke), `AUDITOR` (read)
- Issuer APIs are tenant-scoped; public verify uses opaque references only
- Verification never trusts a database `VALID` flag as the source of truth
- Do not claim regulatory compliance from this repository alone

## Environment

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | No | Postgres / Neon. Unset → PGLite |
| `BETTER_AUTH_SECRET` | When `DATABASE_URL` is set | Wraps Ed25519 secrets with AES-256-GCM |
| `VITE_AUTH_ENABLED` | No | `"true"` / `"false"`. Defaults on when unset |

Never commit `.env` files or private keys.

## License

Apache License 2.0. See [LICENSE](LICENSE).
