import { signDocument, verificationMethodId } from "../crypto/ed25519";
import { sha256Utf8 } from "../crypto/hash";
import { UNIVERSITY_DEGREE_SCHEMA_ID, validateCredentialSchema } from "../schema/university-degree";
import { canonicalize } from "../crypto/jcs";
import { VC_CONTEXT_V2, type IssuedCredential, type UnsecuredCredential } from "./types";

export type IssueInput = {
  credentialId: string;
  issuerDid: string;
  issuerName: string;
  subjectName: string;
  subjectId?: string;
  degreeType?: string;
  degreeName: string;
  validFrom: string;
  validUntil?: string;
  documentHash: string;
  schemaId?: string | null;
  statusListCredentialId: string;
  statusListIndex: number;
  secretKey: Uint8Array;
  verificationMethod?: string;
};

export function buildUnsecuredCredential(input: IssueInput): UnsecuredCredential {
  const credential: UnsecuredCredential = {
    "@context": [VC_CONTEXT_V2],
    type: ["VerifiableCredential", "UniversityDegreeCredential"],
    id: input.credentialId,
    issuer: { id: input.issuerDid, name: input.issuerName },
    validFrom: input.validFrom,
    credentialSubject: {
      ...(input.subjectId ? { id: input.subjectId } : {}),
      name: input.subjectName,
      degree: {
        type: input.degreeType ?? "BachelorDegree",
        name: input.degreeName,
      },
      documentHash: input.documentHash,
    },
    credentialStatus: {
      id: `${input.statusListCredentialId}#${input.statusListIndex}`,
      type: "BitstringStatusListEntry",
      statusPurpose: "revocation",
      statusListIndex: String(input.statusListIndex),
      statusListCredential: input.statusListCredentialId,
    },
  };
  if (input.validUntil) credential.validUntil = input.validUntil;
  if (input.schemaId !== null) {
    credential.credentialSchema = {
      id: input.schemaId ?? UNIVERSITY_DEGREE_SCHEMA_ID,
      type: "JsonSchema",
    };
  }
  return credential;
}

export function issueCredential(input: IssueInput): IssuedCredential {
  if (!input.verificationMethod && !input.issuerDid.startsWith("did:key:")) {
    throw new Error("verificationMethod is required when issuer DID is not did:key");
  }
  const unsecured = buildUnsecuredCredential(input);
  const schemaErrors = validateCredentialSchema(unsecured as unknown as Record<string, unknown>);
  if (schemaErrors.length) {
    throw new Error(`Refusing to issue a credential that fails JsonSchema: ${schemaErrors.join("; ")}`);
  }
  const signed = signDocument(unsecured, input.secretKey, {
    created: input.validFrom,
    verificationMethod: input.verificationMethod ?? verificationMethodId(input.issuerDid),
  });
  return signed as IssuedCredential;
}

export function credentialHash(credential: Record<string, unknown>): string {
  return sha256Utf8(canonicalize(credential)).prefixed;
}

export function validateCredentialStructure(raw: unknown): string[] {
  const errors: string[] = [];
  if (!raw || typeof raw !== "object") return ["Credential is not a JSON object"];
  const c = raw as Record<string, unknown>;
  const ctx = c["@context"];
  if (!Array.isArray(ctx) || !ctx.includes(VC_CONTEXT_V2)) {
    errors.push("Missing required @context https://www.w3.org/ns/credentials/v2");
  }
  const types = c.type;
  if (!Array.isArray(types) || !types.includes("VerifiableCredential")) {
    errors.push("type must include VerifiableCredential");
  }
  if (typeof c.id !== "string" || c.id.length < 8) errors.push("id is required");
  const issuer = c.issuer as { id?: string } | string | undefined;
  const issuerId = typeof issuer === "string" ? issuer : issuer?.id;
  if (!issuerId) errors.push("issuer is required");
  if (typeof c.validFrom !== "string") errors.push("validFrom is required");
  if (!c.credentialSubject || typeof c.credentialSubject !== "object") {
    errors.push("credentialSubject is required");
  }
  if (!c.proof || typeof c.proof !== "object") errors.push("proof is required");
  return errors;
}
