import { responseBodies } from "./examples";

export const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "Matrixly Trust Verifier API",
    version: "1.0.0",
    description:
      "Machine verification of W3C Verifiable Credentials. Authenticity is decided by Ed25519, SHA-256, a signed status list, and a ledger anchor — not by a database VALID flag. API keys are hashed at rest; the secret is shown once.",
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
    "/api/v1/openapi.json": {
      get: {
        summary: "This OpenAPI document",
        security: [],
        responses: { "200": { description: "OpenAPI 3.0" } },
      },
    },
  },
} as const;
