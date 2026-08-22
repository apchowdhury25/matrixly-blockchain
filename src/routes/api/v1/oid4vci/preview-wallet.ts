import { createFileRoute } from "@tanstack/react-router";
import { corsHeaders, json } from "@/lib/api/http";
import { CONFIG_ID, PRE_AUTH_GRANT } from "@/lib/oid4vci/constants";
import { exchangePreAuthorizedCode, issueCredentialFromToken } from "@/lib/oid4vci/persist";
import { DEMO } from "@/lib/trust/ids";
import { ensureDemoSeed } from "@/lib/trust/seed";

export const Route = createFileRoute("/api/v1/oid4vci/preview-wallet")({
  server: {
    handlers: {
      OPTIONS: () => new Response(null, { status: 204, headers: corsHeaders() }),
      POST: async ({ request }) => {
        await ensureDemoSeed();
        let code: string = DEMO.claimToken;
        try {
          const body = (await request.json()) as { pre_authorized_code?: string };
          if (typeof body.pre_authorized_code === "string" && body.pre_authorized_code.length >= 6) {
            code = body.pre_authorized_code;
          }
        } catch {
          /* demo claim token */
        }
        const token = await exchangePreAuthorizedCode({
          grant_type: PRE_AUTH_GRANT,
          "pre-authorized_code": code,
        });
        if (!token.ok) {
          return json({ error: token.error_description, status: "INVALID", verified: false }, token.status);
        }
        const issued = await issueCredentialFromToken({
          authorization: `Bearer ${token.access_token}`,
          body: { credential_configuration_id: CONFIG_ID },
        });
        if (!issued.ok) {
          return json({ error: issued.error_description, status: "INVALID", verified: false }, issued.status);
        }
        const credential = issued.body.credentials[0]?.credential ?? {};
        const issuer = credential.issuer as { id?: string } | string | undefined;
        return json({
          status: "ISSUED",
          note: "Preview wallet. Not an EUDI or HAIP-certified wallet. Delivery does not re-sign the credential.",
          credentialId: typeof credential.id === "string" ? credential.id : undefined,
          issuerDid: typeof issuer === "string" ? issuer : issuer?.id,
          type: credential.type,
          format: "ldp_vc",
        });
      },
    },
  },
});
