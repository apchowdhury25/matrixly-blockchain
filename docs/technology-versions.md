# Technology versions

Recorded 20 August 2026 against current stable documentation and this runtime.

| Component | Version in this product | Notes |
|---|---|---|
| Node.js | 22.23.2 (LTS line) | Sandbox and Vercel Node 22 |
| TypeScript | 5.7.x | Workspace compiler |
| React | 19.2.x | |
| TanStack Start / Router | 1.168+ / 1.170+ | Runnable full-stack app in this environment |
| Tailwind CSS | 4.3.x | |
| Zod | 4.4.x | |
| PostgreSQL | Neon in production, PGLite in preview | |
| Better Auth | 1.6.x | Google, X, email/password |
| @noble/ed25519 | 3.1.0 | RFC 8032 Ed25519 |
| @noble/hashes | 2.3.0 | SHA-512 for Ed25519 |
| pdf-lib | current | Diploma generation |
| Hyperledger Fabric | 3.1 line (SmartBFT since 3.0) | Adapter only until a network is attached |
| Fabric CA | 1.5.22 (July 2026) | |
| W3C VC Data Model | 2.0 Recommendation | `https://www.w3.org/ns/credentials/v2` |
| W3C Data Integrity EdDSA | eddsa-jcs-2022 | |
| W3C Bitstring Status List | 1.0 | 16 KiB bitstring, gzip + multibase |

Next.js 16.x and NestJS 11.x remain valid targets for a later split of `apps/web` and `apps/api`. This repository ships a working verification product on TanStack Start because that is the supported runtime here. Domain modules (crypto, credentials, ledger, verification) are framework-independent.
