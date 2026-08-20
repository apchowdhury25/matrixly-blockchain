export const VC_CONTEXT_V2 = "https://www.w3.org/ns/credentials/v2";

export type CredentialStatusCode =
  | "ACTIVE"
  | "REVOKED"
  | "EXPIRED"
  | "SUPERSEDED"
  | "SUSPENDED";

export type UniversityDegreeSubject = {
  id?: string;
  name: string;
  degree: {
    type: string;
    name: string;
  };
};

export type UnsecuredCredential = {
  "@context": string[];
  type: string[];
  id: string;
  issuer: { id: string; name: string };
  validFrom: string;
  validUntil?: string;
  credentialSubject: UniversityDegreeSubject & Record<string, unknown>;
  credentialSchema?: { id: string; type: string };
  credentialStatus?: {
    id: string;
    type: string;
    statusPurpose: string;
    statusListIndex: string;
    statusListCredential: string;
  };
};

export type IssuedCredential = UnsecuredCredential & {
  proof: {
    type: string;
    cryptosuite: string;
    created: string;
    verificationMethod: string;
    proofPurpose: string;
    proofValue: string;
  };
};
