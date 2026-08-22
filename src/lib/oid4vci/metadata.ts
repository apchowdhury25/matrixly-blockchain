import { CONFIG_ID, LDP_VC } from "./constants";

export function credentialIssuerMetadata(origin: string) {
  const issuer = origin.replace(/\/$/, "");
  return {
    credential_issuer: issuer,
    credential_endpoint: `${issuer}/api/v1/oid4vci/credential`,
    token_endpoint: `${issuer}/api/v1/oid4vci/token`,
    credential_configurations_supported: {
      [CONFIG_ID]: {
        format: LDP_VC,
        credential_signing_alg_values_supported: ["Ed25519"],
        proof_types_supported: {
          ldp_vp: { proof_signing_alg_values_supported: ["Ed25519"] },
        },
        credential_metadata: {
          display: [
            {
              name: "University Degree",
              locale: "en-US",
              description: "W3C Verifiable Credential 2.0 (Data Integrity eddsa-jcs-2022). Already signed; delivery does not re-sign.",
            },
          ],
          claims: [
            { path: ["credentialSubject", "degree", "name"] },
            { path: ["credentialSubject", "documentHash"] },
          ],
        },
      },
    },
  };
}

export function wellKnownPath(): string {
  return "/.well-known/openid-credential-issuer";
}
