import { getSql } from "@/lib/db";
import { decodeSecretKeyHex } from "@/lib/crypto/ed25519";
import { credentialHash } from "@/lib/credentials/issue";
import { getLedger, getPlatformVerifier } from "@/lib/trust/runtime";
import { openSecret } from "@/lib/trust/seal";
import { newId, opaqueRef } from "@/lib/trust/ids";
import type { VerificationResult } from "./pipeline";
import {
  buildVerificationReport,
  signVerificationReport,
  verificationReportHash,
} from "./report";

export async function persistVerificationReport(input: {
  result: VerificationResult;
  credential: Record<string, unknown>;
  opaqueRef?: string | null;
  credentialRowId?: string | null;
  tenantId?: string | null;
  apiKeyId?: string | null;
  source?: "ui" | "api" | "oid4vp";
}): Promise<{ reportRef: string; reportHash: string }> {
  const verifier = await getPlatformVerifier();
  const secretKey = decodeSecretKeyHex(openSecret(verifier.secretKeyHex));
  const reportId = `urn:uuid:${crypto.randomUUID()}`;
  const report = signVerificationReport(
    buildVerificationReport({
      reportId,
      verifierDid: verifier.did,
      credentialId: String(input.credential.id ?? input.credentialRowId ?? reportId),
      credentialHash: credentialHash(input.credential),
      documentHash: input.result.documentHash,
      result: input.result,
    }),
    secretKey,
  );
  const reportHashValue = verificationReportHash(report as unknown as Record<string, unknown>);
  const ledger = await getLedger();
  const anchored = await ledger.registerVerificationAnchor({
    reportId,
    reportHash: reportHashValue,
    credentialHash: report.credentialHash,
    resultStatus: report.result,
    verifierDid: verifier.did,
    at: report.created,
  });
  const reportRef = opaqueRef();
  const sql = await getSql();
  await sql`
    insert into verification_requests (
      id, opaque_ref, credential_id, result_status, result_json,
      report_json, report_hash, opaque_report_ref, verifier_did, ledger_block_hash,
      api_key_id, source, tenant_id
    ) values (
      ${newId("vrf")}, ${input.opaqueRef ?? null}, ${input.credentialRowId ?? null}, ${input.result.status},
      ${JSON.stringify(input.result)}, ${JSON.stringify(report)}, ${reportHashValue}, ${reportRef},
      ${verifier.did}, ${anchored.blockHash},
      ${input.apiKeyId ?? null}, ${input.source ?? "ui"}, ${input.tenantId ?? null}
    )`;
  if (input.tenantId) {
    try {
      const { dispatchVerificationWebhooks } = await import("@/lib/webhooks/deliver");
      const { toMachineResult } = await import("@/lib/api/machine");
      await dispatchVerificationWebhooks({
        tenantId: input.tenantId,
        source: input.source ?? "ui",
        result: toMachineResult(input.result, {
          reportRef,
          reportHash: reportHashValue,
          credentialId: String(input.credential.id ?? input.credentialRowId ?? ""),
          credentialHash: credentialHash(input.credential),
        }),
      });
    } catch {
      /* Webhook failure must not change the verification outcome. */
    }
  }
  return { reportRef, reportHash: reportHashValue };
}
