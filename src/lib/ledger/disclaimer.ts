/** Client-safe copy. Ledger integrity is not diploma VALID. */
export const LEDGER_DIPLOMA_DISCLAIMER =
  "chainValid is ledger integrity only. It does not mean a diploma is VALID. Ed25519, document SHA-256, signed status list, and schema hash must still pass independently via POST /api/v1/verify.";
