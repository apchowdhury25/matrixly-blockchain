# System architecture

```
Issuer console  →  Document (PDF)  →  SHA-256
                                 →  VC 2.0 + Ed25519
                                 →  Ledger anchor (hashes only)
                                 →  Opaque claim token
Holder wallet   →  Claim VC (no re-sign)
                →  W3C VP 2.0 (holder authentication proof)
Verifier        →  holder proof + signature + hash + issuer + status + chain
```

Off-chain: PDF bytes, holder names, tenant records, sealed signing keys.
On-chain / ledger: issuer DID, document hash, credential hash, status.

See `src/lib/verification/pipeline.ts` for the canonical verification algorithm.
