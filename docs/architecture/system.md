# System architecture

```
Issuer console  →  Document (PDF)  →  SHA-256
                                 →  VC 2.0 + Ed25519
                                 →  Ledger anchor (hashes only)
Holder / QR     →  Public verifier
Verifier        →  signature + hash + issuer + status + chain
```

Off-chain: PDF bytes, holder names, tenant records, sealed signing keys.
On-chain / ledger: issuer DID, document hash, credential hash, status.

See `src/lib/verification/pipeline.ts` for the canonical verification algorithm.
