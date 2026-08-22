import { LEDGER_DIPLOMA_DISCLAIMER } from "../ledger/disclaimer";

/** Copy-paste examples. `$BASE` is this site’s origin.
 *  Response bodies are complete JSON captured from the live verifier API.
 *  DID / hashes / reportRef change if the demo tenant is re-seeded.
 */

export const DEMO_API_KEY = "mtx_live_demo_verifier_qa_only";

export const responseBodies = {
  missingKey: {
    error: "Missing or invalid API key",
    status: "UNAUTHORIZED",
    verified: false,
  },
  validRef: {
    status: "VALID",
    verified: true,
    checks: {
      issuerRegistered: true,
      signatureValid: true,
      documentSha256: true,
      ledgerProof: true,
      signedStatusList: true,
      credentialActive: true,
    },
    issuerDid: "did:key:z6Mkm3txuAz9BY1LFnnyvkDP4qjUMP55QEmDgWPrg5X2yGFA",
    credentialId: "urn:uuid:demo-valid-bcs",
    credentialHash: "sha256:ec1a279acff22be6f1c7b0ad1e787455f250b83b91f4505e391c40cc21b83a04",
    documentHash: "sha256:7ffcf2aac17f0577c665f651d480d1b5a7157c5ad405fb9abf7201b8f353d82e",
    reportRef: "WWKAPed4Y2Ye",
    reportHash: "sha256:3b59d2c3a6e1cb5f4d1e461536d23daa55d3c1b201d0ec1a668e4fca1f001c97",
    reasons: [] as string[],
  },
  revokedRef: {
    status: "REVOKED",
    verified: false,
    checks: {
      issuerRegistered: true,
      signatureValid: true,
      documentSha256: true,
      ledgerProof: true,
      signedStatusList: true,
      credentialActive: false,
    },
    issuerDid: "did:key:z6Mkm3txuAz9BY1LFnnyvkDP4qjUMP55QEmDgWPrg5X2yGFA",
    credentialId: "urn:uuid:demo-revoked-bcs",
    credentialHash: "sha256:1c4fbd89e2eeddbbd26307cee9a1425aac9f9189398be965da110ed4bda39740",
    documentHash: "sha256:3641747ec3f0715fc43d1d9450bb82f007cc52fc98a73d0a6febb5849ed3b7c5",
    reportRef: "YNBsED6i45ZC",
    reportHash: "sha256:d5828a1fe66c5baddefee82e9f41e9d8b07153d6a1aed0a7b453fe377ed779da",
    reasons: [
      "Credential has been revoked",
      "Policy matrixly.default.v1: revoked credentials are not accepted",
    ],
  },
  expiredRef: {
    status: "EXPIRED",
    verified: false,
    checks: {
      issuerRegistered: true,
      signatureValid: true,
      documentSha256: true,
      ledgerProof: true,
      signedStatusList: true,
      credentialActive: false,
    },
    issuerDid: "did:key:z6Mkm3txuAz9BY1LFnnyvkDP4qjUMP55QEmDgWPrg5X2yGFA",
    credentialId: "urn:uuid:demo-expired-bcs",
    credentialHash: "sha256:44eca22918971d7609577817b19ebebc92da4f005651432eb132524e7037d354",
    documentHash: "sha256:3eb7955165bbf2ba98fdfb327348b5de6ba0c717244d5899fc60c5ec5aedba1a",
    reportRef: "Ds9K-448tHBi",
    reportHash: "sha256:cd41b26c41f7fc0916713059e72df1bcab0cc2974a3bf6fb447dc6a937493414",
    reasons: [
      "Credential validity period has ended",
      "Policy matrixly.default.v1: expired credentials are not accepted",
    ],
  },
  includeSubject: {
    status: "VALID",
    verified: true,
    checks: {
      issuerRegistered: true,
      signatureValid: true,
      documentSha256: true,
      ledgerProof: true,
      signedStatusList: true,
      credentialActive: true,
    },
    issuerDid: "did:key:z6Mkm3txuAz9BY1LFnnyvkDP4qjUMP55QEmDgWPrg5X2yGFA",
    credentialId: "urn:uuid:demo-valid-bcs",
    credentialHash: "sha256:ec1a279acff22be6f1c7b0ad1e787455f250b83b91f4505e391c40cc21b83a04",
    documentHash: "sha256:7ffcf2aac17f0577c665f651d480d1b5a7157c5ad405fb9abf7201b8f353d82e",
    reportRef: "v-VhL19zcyhT",
    reportHash: "sha256:74734568dd3615eebd76db312ac98d5bf8a944fdb0929e669fdebd7ffbc803b8",
    reasons: [] as string[],
    subject: {
      name: "Alex Rivera",
      credentialTitle: "Bachelor of Computer Science",
    },
  },
  unknownRef: {
    status: "INVALID",
    verified: false,
    checks: {
      issuerRegistered: false,
      signatureValid: false,
      documentSha256: null,
      ledgerProof: false,
      signedStatusList: null,
      credentialActive: false,
    },
    reasons: ["No credential is registered for this verification link."],
  },
  emptyCredential: {
    status: "INVALID",
    verified: false,
    checks: {
      issuerRegistered: false,
      signatureValid: false,
      documentSha256: null,
      ledgerProof: false,
      signedStatusList: null,
      credentialActive: false,
    },
    credentialHash: "sha256:44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a",
    reportRef: "snG1Miyq2_us",
    reportHash: "sha256:49214cf54d27e703eaa8cfbed36e1702033adcfec9ff1aac4e06c6a1a0654f6f",
    reasons: [
      "Missing required @context https://www.w3.org/ns/credentials/v2",
      "type must include VerifiableCredential",
      "id is required",
      "issuer is required",
      "validFrom is required",
      "credentialSubject is required",
      "proof is required",
    ],
  },
  emptyPresentation: {
    status: "INVALID",
    verified: false,
    checks: {
      issuerRegistered: false,
      signatureValid: false,
      documentSha256: null,
      ledgerProof: false,
      signedStatusList: null,
      credentialActive: false,
      holderPresentationProof: false,
    },
    reportRef: "Fhv1J2Bf8QBQ",
    reportHash: "sha256:9f54a291278352e5f5642f44931796c6e2bc1516a275041207747b2b4323472b",
    reasons: ["Presentation holder DID is missing"],
  },
  tamper: {
    status: "INVALID",
    verified: false,
    checks: {
      issuerRegistered: true,
      signatureValid: true,
      documentSha256: false,
      ledgerProof: true,
      signedStatusList: true,
      credentialActive: true,
    },
    issuerDid: "did:key:z6Mkm3txuAz9BY1LFnnyvkDP4qjUMP55QEmDgWPrg5X2yGFA",
    credentialId: "urn:uuid:demo-valid-bcs",
    credentialHash: "sha256:ec1a279acff22be6f1c7b0ad1e787455f250b83b91f4505e391c40cc21b83a04",
    documentHash: "sha256:7ffcf2aac17f0577c665f651d480d1b5a7157c5ad405fb9abf7201b8f353d82e",
    reasons: ["Document bytes do not match the bound SHA-256 hash"],
  },
  report: {
    resultStatus: "VALID",
    report: {
      "@context": ["https://www.w3.org/ns/credentials/v2"],
      type: ["VerificationReport"],
      id: "urn:uuid:1ae0c338-602b-494b-9780-eafb4e604b94",
      verifier: { id: "did:key:z6Mkva52oayqR7xtLiCcr4iZEdQsDyR68Vi7AGrJrG1pdwR9" },
      created: "2026-08-21T17:47:27.865Z",
      credentialId: "urn:uuid:demo-valid-bcs",
      credentialHash: "sha256:ec1a279acff22be6f1c7b0ad1e787455f250b83b91f4505e391c40cc21b83a04",
      policyId: "matrixly.default.v1",
      result: "VALID",
      checks: {
        issuerVerified: true,
        signatureValid: true,
        documentIntegrityValid: true,
        ledgerProofValid: true,
        statusListValid: true,
      },
      documentHash: "sha256:7ffcf2aac17f0577c665f651d480d1b5a7157c5ad405fb9abf7201b8f353d82e",
      ledgerHead: "sha256:a17717a81f493764b5344db380ade89dc2ca265c9eea880c4589e6af832d2618",
      proof: {
        type: "DataIntegrityProof",
        cryptosuite: "eddsa-jcs-2022",
        created: "2026-08-21T17:47:27.865Z",
        verificationMethod:
          "did:key:z6Mkva52oayqR7xtLiCcr4iZEdQsDyR68Vi7AGrJrG1pdwR9#z6Mkva52oayqR7xtLiCcr4iZEdQsDyR68Vi7AGrJrG1pdwR9",
        proofPurpose: "assertionMethod",
        proofValue:
          "z5GdwrZVkevkyU15AcvW3bGoUxyFcoEBTMS475MKj3kXwacdWw4gc8WP2WV6Nus2y51gb8mt6Wr1TXmTiYXvdaSJV",
      },
    },
    reportHash: "sha256:3b59d2c3a6e1cb5f4d1e461536d23daa55d3c1b201d0ec1a668e4fca1f001c97",
    signatureValid: true,
    ledgerAnchored: true,
  },
  ledgerChain: {
    format: "matrixly.ledger.v1",
    model: "hash-chain",
    merkleAlgorithm: "rfc6962-sha256",
    merkleRoot: "sha256:e4087ea8ef27f000000000000000000000000000000000000000000000000000",
    diplomaEvaluated: false,
    disclaimer: LEDGER_DIPLOMA_DISCLAIMER,
    chainValid: true,
    length: 2,
  },
  ledgerVerify: {
    chainValid: true,
    diplomaEvaluated: false,
    disclaimer: LEDGER_DIPLOMA_DISCLAIMER,
    length: 2,
    model: "hash-chain",
    merkleRoot: "sha256:e4087ea8ef27f000000000000000000000000000000000000000000000000000",
  },
  ledgerVerifyBadJson: {
    chainValid: false,
    diplomaEvaluated: false,
    disclaimer: LEDGER_DIPLOMA_DISCLAIMER,
    reason: "JSON body required",
  },
  openapi: {
    openapi: "3.0.3",
    info: {
      title: "Matrixly Trust Verifier API",
      version: "1.0.0",
      description:
        "Machine verification of W3C Verifiable Credentials. Authenticity is decided by Ed25519, SHA-256, a signed status list, and a ledger anchor — not by a database VALID flag. API keys are hashed at rest; the secret is shown once.",
    },
    servers: [{ url: "/", description: "This deployment" }],
    paths: {
      "/api/v1/verify": { post: {} },
      "/api/v1/reports/{ref}": { get: {} },
      "/api/v1/openapi.json": { get: {} },
    },
  },
} as const;

function pretty(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

export const examples = {
  missingKey: {
    title: "Missing key — must be 401, never VALID",
    request: `POST $BASE/api/v1/verify
Content-Type: application/json

{"ref":"demo-valid-bcs"}`,
    curl: `curl -sS -X POST "$BASE/api/v1/verify" \\
  -H "Content-Type: application/json" \\
  -d '{"ref":"demo-valid-bcs"}'`,
    response: pretty(responseBodies.missingKey),
    status: "401",
  },
  validRef: {
    title: "Valid diploma by opaque ref",
    request: `POST $BASE/api/v1/verify
Authorization: Bearer mtx_live_demo_verifier_qa_only
Content-Type: application/json

{"ref":"demo-valid-bcs"}`,
    curl: `curl -sS -X POST "$BASE/api/v1/verify" \\
  -H "Authorization: Bearer mtx_live_demo_verifier_qa_only" \\
  -H "Content-Type: application/json" \\
  -d '{"ref":"demo-valid-bcs"}'`,
    response: pretty(responseBodies.validRef),
    status: "200",
  },
  revokedRef: {
    title: "Revoked diploma",
    request: `POST $BASE/api/v1/verify
Authorization: Bearer mtx_live_demo_verifier_qa_only
Content-Type: application/json

{"ref":"demo-revoked-bcs"}`,
    curl: `curl -sS -X POST "$BASE/api/v1/verify" \\
  -H "Authorization: Bearer mtx_live_demo_verifier_qa_only" \\
  -H "Content-Type: application/json" \\
  -d '{"ref":"demo-revoked-bcs"}'`,
    response: pretty(responseBodies.revokedRef),
    status: "200",
  },
  expiredRef: {
    title: "Expired diploma",
    request: `POST $BASE/api/v1/verify
Authorization: Bearer mtx_live_demo_verifier_qa_only
Content-Type: application/json

{"ref":"demo-expired-bcs"}`,
    curl: `curl -sS -X POST "$BASE/api/v1/verify" \\
  -H "Authorization: Bearer mtx_live_demo_verifier_qa_only" \\
  -H "Content-Type: application/json" \\
  -d '{"ref":"demo-expired-bcs"}'`,
    response: pretty(responseBodies.expiredRef),
    status: "200",
  },
  includeSubject: {
    title: "Opt-in holder display name",
    request: `POST $BASE/api/v1/verify
Authorization: Bearer mtx_live_demo_verifier_qa_only
Content-Type: application/json

{"ref":"demo-valid-bcs","includeSubject":true}`,
    curl: `curl -sS -X POST "$BASE/api/v1/verify" \\
  -H "Authorization: Bearer mtx_live_demo_verifier_qa_only" \\
  -H "Content-Type: application/json" \\
  -d '{"ref":"demo-valid-bcs","includeSubject":true}'`,
    response: pretty(responseBodies.includeSubject),
    status: "200",
  },
  unknownRef: {
    title: "Unknown opaque ref",
    request: `POST $BASE/api/v1/verify
Authorization: Bearer mtx_live_demo_verifier_qa_only
Content-Type: application/json

{"ref":"does-not-exist"}`,
    curl: `curl -sS -X POST "$BASE/api/v1/verify" \\
  -H "Authorization: Bearer mtx_live_demo_verifier_qa_only" \\
  -H "Content-Type: application/json" \\
  -d '{"ref":"does-not-exist"}'`,
    response: pretty(responseBodies.unknownRef),
    status: "200",
  },
  tamper: {
    title: "One-byte different file",
    request: `POST $BASE/api/v1/verify
Authorization: Bearer mtx_live_demo_verifier_qa_only
Content-Type: application/json

{"ref":"demo-valid-bcs","documentB64":"<base64 of a PDF that differs by one byte>"}`,
    curl: `curl -sS -X POST "$BASE/api/v1/verify" \\
  -H "Authorization: Bearer mtx_live_demo_verifier_qa_only" \\
  -H "Content-Type: application/json" \\
  -d '{"ref":"demo-valid-bcs","documentB64":"'"$TAMPERED_B64"'"}'`,
    response: pretty(responseBodies.tamper),
    status: "200",
  },
  postedCredential: {
    title: "Posted credential JSON that fails structure",
    request: `POST $BASE/api/v1/verify
Authorization: Bearer mtx_live_demo_verifier_qa_only
Content-Type: application/json

{"credential":{}}`,
    curl: `curl -sS -X POST "$BASE/api/v1/verify" \\
  -H "Authorization: Bearer mtx_live_demo_verifier_qa_only" \\
  -H "Content-Type: application/json" \\
  -d '{"credential":{}}'`,
    response: pretty(responseBodies.emptyCredential),
    status: "200",
  },
  presentation: {
    title: "Posted presentation missing holder DID",
    request: `POST $BASE/api/v1/verify
Authorization: Bearer mtx_live_demo_verifier_qa_only
Content-Type: application/json

{"presentation":{"type":["VerifiablePresentation"],"verifiableCredential":[]}}`,
    curl: `curl -sS -X POST "$BASE/api/v1/verify" \\
  -H "Authorization: Bearer mtx_live_demo_verifier_qa_only" \\
  -H "Content-Type: application/json" \\
  -d '{"presentation":{"type":["VerifiablePresentation"],"verifiableCredential":[]}}'`,
    response: pretty(responseBodies.emptyPresentation),
    status: "200",
  },
  report: {
    title: "Fetch signed verification report",
    request: `GET $BASE/api/v1/reports/WWKAPed4Y2Ye
Authorization: Bearer mtx_live_demo_verifier_qa_only`,
    curl: `curl -sS "$BASE/api/v1/reports/WWKAPed4Y2Ye" \\
  -H "Authorization: Bearer mtx_live_demo_verifier_qa_only"`,
    response: pretty(responseBodies.report),
    status: "200",
  },
  ledgerChain: {
    title: "Hash-chain export — not a diploma VALID",
    request: `GET $BASE/api/v1/ledger/chain`,
    curl: `curl -sS "$BASE/api/v1/ledger/chain"`,
    response: pretty(responseBodies.ledgerChain),
    status: "200",
  },
  ledgerVerify: {
    title: "Recompute Merkle root — diplomaEvaluated is false",
    request: `POST $BASE/api/v1/ledger/verify
Content-Type: application/json

{"format":"matrixly.ledger.v1","model":"hash-chain","merkleRoot":"sha256:…","blocks":[]}`,
    curl: `curl -sS -X POST "$BASE/api/v1/ledger/verify" \\
  -H "Content-Type: application/json" \\
  -d @chain.json`,
    response: pretty(responseBodies.ledgerVerify),
    status: "200",
  },
  ledgerVerifyBadJson: {
    title: "Ledger verify bad JSON — no credential status field",
    request: `POST $BASE/api/v1/ledger/verify
Content-Type: application/json

not-json`,
    curl: `curl -sS -X POST "$BASE/api/v1/ledger/verify" \\
  -H "Content-Type: application/json" \\
  -d 'not-json'`,
    response: pretty(responseBodies.ledgerVerifyBadJson),
    status: "400",
  },
  openapi: {
    title: "OpenAPI document (no key)",
    request: `GET $BASE/api/v1/openapi.json`,
    curl: `curl -sS "$BASE/api/v1/openapi.json"`,
    response: pretty(responseBodies.openapi),
    status: "200",
  },
} as const;
