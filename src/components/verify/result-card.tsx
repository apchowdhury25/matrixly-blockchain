import { Check, Shield, ShieldAlert, ShieldOff, ShieldX } from "lucide-react";
import { cn } from "@/lib/utils";

export type VerifyView = {
  verified: boolean;
  issuerVerified: boolean;
  signatureValid: boolean;
  documentIntegrityValid: boolean | null;
  ledgerProofValid: boolean;
  credentialActive: boolean;
  expired: boolean;
  revoked: boolean;
  superseded: boolean;
  suspended: boolean;
  status: "VALID" | "INVALID" | "REVOKED" | "EXPIRED" | "SUSPENDED" | "SUPERSEDED";
  reasons: string[];
  issuerName?: string;
  issuerDid?: string;
  credentialId?: string;
  credentialType?: string;
  issued?: string;
  documentHash?: string;
  ledgerBlockHash?: string;
  holderName?: string;
  degreeName?: string;
  opaqueRef?: string;
};

const tone: Record<VerifyView["status"], string> = {
  VALID: "border-valid/30 bg-valid/8 text-valid",
  INVALID: "border-invalid/30 bg-invalid/8 text-invalid",
  REVOKED: "border-invalid/30 bg-invalid/8 text-invalid",
  EXPIRED: "border-warn/30 bg-warn/8 text-warn",
  SUSPENDED: "border-warn/30 bg-warn/8 text-warn",
  SUPERSEDED: "border-warn/30 bg-warn/8 text-warn",
};

function Flag({ ok, label, skip }: { ok: boolean | null; label: string; skip?: boolean }) {
  const state = skip ? "skipped" : ok ? "ok" : "fail";
  return (
    <div className="flex items-center justify-between gap-4 border-b border-rule/70 py-3 last:border-0">
      <span className="text-sm text-ink-soft">{label}</span>
      <span
        className={cn(
          "font-mono text-xs tracking-wide",
          state === "ok" && "text-valid",
          state === "fail" && "text-invalid",
          state === "skipped" && "text-stone",
        )}
      >
        {state === "ok" ? "PASS" : state === "fail" ? "FAIL" : "NOT SUPPLIED"}
      </span>
    </div>
  );
}

export function ResultCard({ result }: { result: VerifyView }) {
  const Icon =
    result.status === "VALID" ? Shield : result.status === "REVOKED" ? ShieldOff : result.status === "EXPIRED" ? ShieldAlert : ShieldX;
  return (
    <section className="overflow-hidden rounded-xl border border-rule bg-paper-raised shadow-quiet">
      <div className={cn("flex items-start gap-4 border-b border-rule px-6 py-5", tone[result.status])}>
        <Icon className="mt-0.5 size-7 shrink-0" strokeWidth={1.5} />
        <div>
          <p className="font-mono text-xs tracking-[0.18em] uppercase">{result.status}</p>
          <h2 className="font-display text-2xl text-ink">
            {result.status === "VALID" ? "Document verified" : "Verification did not pass"}
          </h2>
          {result.reasons[0] ? <p className="mt-1 text-sm text-ink-soft">{result.reasons[0]}</p> : null}
        </div>
      </div>
      <div className="grid gap-6 px-6 py-6 md:grid-cols-2">
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="text-stone">Issuer</dt>
            <dd className="text-ink">{result.issuerName ?? "Unknown"}</dd>
          </div>
          <div>
            <dt className="text-stone">Credential</dt>
            <dd className="text-ink">{result.degreeName ?? result.credentialType ?? "Verifiable credential"}</dd>
          </div>
          <div>
            <dt className="text-stone">Holder</dt>
            <dd className="text-ink">{result.holderName ?? "Bound in credential"}</dd>
          </div>
          <div>
            <dt className="text-stone">Issued</dt>
            <dd className="text-ink">
              {result.issued ? new Date(result.issued).toLocaleDateString("en-US", { dateStyle: "long" }) : "—"}
            </dd>
          </div>
        </dl>
        <div>
          <Flag ok={result.issuerVerified} label="Issuer registered" />
          <Flag ok={result.signatureValid} label="Ed25519 signature" />
          <Flag
            ok={result.documentIntegrityValid}
            label="Document SHA-256"
            skip={result.documentIntegrityValid === null}
          />
          <Flag ok={result.ledgerProofValid} label="Ledger proof" />
          <Flag ok={!result.revoked && !result.expired && result.credentialActive} label="Credential status" />
        </div>
      </div>
      {result.reasons.length > 1 ? (
        <ul className="border-t border-rule px-6 py-4 text-sm text-ink-soft">
          {result.reasons.map((r) => (
            <li key={r} className="flex gap-2">
              <Check className="mt-0.5 size-4 shrink-0 opacity-0" />
              {r}
            </li>
          ))}
        </ul>
      ) : null}
      {result.documentHash || result.ledgerBlockHash ? (
        <div className="space-y-2 border-t border-rule bg-paper px-6 py-4 font-mono text-[11px] leading-relaxed break-all text-stone">
          {result.documentHash ? <p>doc {result.documentHash}</p> : null}
          {result.ledgerBlockHash ? <p>ledger {result.ledgerBlockHash}</p> : null}
          {result.issuerDid ? <p>did {result.issuerDid}</p> : null}
        </div>
      ) : null}
    </section>
  );
}
