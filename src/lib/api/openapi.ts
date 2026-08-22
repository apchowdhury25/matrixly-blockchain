import { responseBodies } from "./examples";
import { LEDGER_DIPLOMA_DISCLAIMER } from "../ledger/disclaimer";
import { LEGAL_LIABILITY_SHORT } from "../legal/liability";

export const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "Matrixly Trust Verifier API",
    version: "1.0.0",
    description:
      "Machine verification of W3C Verifiable Credentials. Authenticity is decided by Ed25519, SHA-256, a signed status list, and a ledger anchor — not by a database VALID flag. A VALID result is not a legal determination. See /legal. API keys are hashed at rest; the secret is shown once.",
  },
  servers: [{ url: "/", description: "This deployment" }],
  security: [{ bearerAuth: [] }],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "mtx_live",
        description: "Verifier API key issued in the issuer console. Never logged.",
      },
    },
  },
  paths: {
    "/api/v1/verify": {
      post: {
        summary: "Verify a credential or presentation",
        description: `${LEGAL_LIABILITY_SHORT} checks.schemaValid is instance validation against the published JsonSchema.`,
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  ref: { type: "string", description: "Opaque credential ref, e.g. demo-valid-bcs" },
                  credential: { type: "object", description: "W3C VC 2.0 document" },
                  presentation: { type: "object", description: "W3C VP 2.0 document" },
                  documentB64: { type: "string", description: "Optional original file bytes (base64)" },
                  mode: { type: "string", enum: ["bound", "none"] },
                  includeSubject: {
                    type: "boolean",
                    description: "If true, include holder display name. Default false.",
                  },
                },
              },
              examples: {
                validRef: {
                  summary: "Valid diploma",
                  value: { ref: "demo-valid-bcs" },
                },
                revokedRef: {
                  summary: "Revoked diploma",
                  value: { ref: "demo-revoked-bcs" },
                },
                expiredRef: {
                  summary: "Expired diploma",
                  value: { ref: "demo-expired-bcs" },
                },
                includeSubject: {
                  summary: "Include holder display name",
                  value: { ref: "demo-valid-bcs", includeSubject: true },
                },
                postedCredential: {
                  summary: "Posted VC JSON",
                  value: {
                    credential: {
                      "@context": ["https://www.w3.org/ns/credentials/v2"],
                      type: ["VerifiableCredential"],
                    },
                  },
                },
                presentation: {
                  summary: "Posted VP JSON",
                  value: {
                    presentation: {
                      type: ["VerifiablePresentation"],
                      verifiableCredential: [],
                    },
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Verification ran. Read `status` — UNAUTHORIZED is never 200.",
            content: {
              "application/json": {
                examples: {
                  valid: { summary: "Valid diploma", value: responseBodies.validRef },
                  revoked: { summary: "Revoked diploma", value: responseBodies.revokedRef },
                  expired: { summary: "Expired diploma", value: responseBodies.expiredRef },
                  includeSubject: {
                    summary: "Valid with holder display name",
                    value: responseBodies.includeSubject,
                  },
                  unknown: { summary: "Unknown ref", value: responseBodies.unknownRef },
                  emptyCredential: {
                    summary: "Posted empty credential",
                    value: responseBodies.emptyCredential,
                  },
                  emptyPresentation: {
                    summary: "Posted empty presentation",
                    value: responseBodies.emptyPresentation,
                  },
                  tamper: { summary: "Document hash mismatch", value: responseBodies.tamper },
                },
              },
            },
          },
          "401": {
            description: "Missing or invalid API key. Does not return VALID.",
            content: {
              "application/json": { example: responseBodies.missingKey },
            },
          },
          "400": { description: "Malformed body." },
        },
      },
    },
    "/api/v1/reports/{ref}": {
      get: {
        summary: "Fetch a signed verification report (hashes and flags only)",
        parameters: [{ name: "ref", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": {
            description: "Signed report",
            content: {
              "application/json": { example: responseBodies.report },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": { example: responseBodies.missingKey },
            },
          },
        },
      },
    },
    "/api/v1/evidence/{ref}": {
      get: {
        summary: "Evidence pack (hashes + signed report, no PDF, no holder name)",
        parameters: [{ name: "ref", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "MatrixlyEvidencePack JSON" },
          "401": { description: "Unauthorized" },
        },
      },
    },
    "/api/v1/openapi.json": {
      get: {
        summary: "This OpenAPI document",
        security: [],
        responses: { "200": { description: "OpenAPI 3.0" } },
      },
    },
    "/api/v1/oid4vp/requests": {
      post: {
        summary: "Create an OpenID4VP 1.0 authorization request (DCQL + direct_post)",
        security: [],
        responses: { "200": { description: "request_uri, wallet_uri, dcql_query, nonce" } },
      },
    },
    "/api/v1/oid4vp/request/{id}": {
      get: {
        summary: "Fetch the authorization request object (request_uri)",
        security: [],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "OpenID4VP authorization request JSON" } },
      },
    },
    "/api/v1/oid4vp/direct-post/{id}": {
      post: {
        summary: "Wallet direct_post of vp_token",
        security: [],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  vp_token: { type: "object" },
                  state: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Verification of the presented VP. Never VALID if nonce mismatches." },
          "400": { description: "Closed, expired, or unsupported format" },
        },
      },
    },
    "/api/v1/ledger/chain": {
      get: {
        summary: "Export the hash-chain (hashes and DIDs). Not a diploma VALID.",
        description: LEDGER_DIPLOMA_DISCLAIMER,
        security: [],
        responses: {
          "200": {
            description: "matrixly.ledger.v1. diplomaEvaluated is always false. No credential status field.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    format: { type: "string", example: "matrixly.ledger.v1" },
                    chainValid: { type: "boolean" },
                    merkleRoot: { type: "string" },
                    diplomaEvaluated: { type: "boolean", enum: [false] },
                    disclaimer: { type: "string", example: LEDGER_DIPLOMA_DISCLAIMER },
                  },
                },
                example: responseBodies.ledgerChain,
              },
            },
          },
          "503": { description: "Fabric adapter has no independent dump" },
        },
      },
    },
    "/api/v1/ledger/verify": {
      post: {
        summary: "Recompute block hashes of a ledger export. Never diploma VALID.",
        description: LEDGER_DIPLOMA_DISCLAIMER,
        security: [],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { type: "object" } } },
        },
        responses: {
          "200": {
            description: "chainValid, merkleRoot, diplomaEvaluated=false, disclaimer. No status: VALID.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    chainValid: { type: "boolean" },
                    diplomaEvaluated: { type: "boolean", enum: [false] },
                    disclaimer: { type: "string", example: LEDGER_DIPLOMA_DISCLAIMER },
                    merkleRoot: { type: "string" },
                    reason: { type: "string" },
                  },
                },
                example: responseBodies.ledgerVerify,
              },
            },
          },
          "400": {
            description: "Not JSON. Does not return credential status INVALID.",
            content: { "application/json": { example: responseBodies.ledgerVerifyBadJson } },
          },
        },
      },
    },
    "/healthz": {
      get: {
        summary: "Liveness. Does not imply the ledger is reachable.",
        security: [],
        responses: { "200": { description: "{ status: ok }" } },
      },
    },
    "/readyz": {
      get: {
        summary: "Readiness. 503 if the database or configured ledger adapter is down.",
        security: [],
        responses: {
          "200": { description: "ready" },
          "503": { description: "Not ready. Fabric without Gateway is not ready." },
        },
      },
    },
    "/.well-known/openid-credential-issuer": {
      get: {
        summary: "OpenID4VCI 1.0 Credential Issuer metadata",
        security: [],
        responses: { "200": { description: "credential_configurations_supported (ldp_vc only)" } },
      },
    },
    "/api/v1/oid4vci/token": {
      post: {
        summary: "Exchange a pre-authorized_code for a Bearer access token",
        security: [],
        responses: {
          "200": { description: "access_token, token_type=Bearer, expires_in" },
          "400": { description: "invalid_grant or unsupported_grant_type (authorization_code is refused)" },
        },
      },
    },
    "/api/v1/oid4vci/credential": {
      post: {
        summary: "Deliver the already-signed W3C VC. Does not re-sign.",
        responses: {
          "200": { description: "{ credentials: [{ credential }] }" },
          "401": { description: "invalid_token" },
          "400": { description: "unsupported_credential_format (SD-JWT/mdoc)" },
        },
      },
    },
    "/credentials/status/{id}": {
      get: {
        summary: "Published Bitstring Status List credential (JSON)",
        security: [],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "W3C BitstringStatusListCredential" }, "404": { description: "Not found" } },
      },
    },
    "/schemas/university-degree-credential.json": {
      get: {
        summary: "UniversityDegreeCredential JsonSchema",
        security: [],
        responses: { "200": { description: "JSON Schema document" } },
      },
    },
  },
} as const;
