/** SOC 2 investigation. Not a report, not an opinion, not certification. */

export type Soc2Coverage = "software-support" | "organization-gap" | "not-in-scope";

export type Soc2Criterion = {
  id: string;
  category: string;
  name: string;
  auditorLooksFor: string;
  matrixly: string;
  coverage: Soc2Coverage;
};

export const SOC2_DISCLAIMER =
  "SOC 2 is an AICPA attestation issued by a licensed CPA firm. This product is not SOC 2 Type I or Type II certified. Mapping software to Trust Services Criteria is readiness evidence, not an audit opinion.";

export const SOC2_CRITERIA: Soc2Criterion[] = [
  {
    id: "CC1",
    category: "Security (required)",
    name: "Control environment",
    auditorLooksFor: "Tone at the top, ethics, board/oversight, accountability, HR screening",
    matrixly: "No board, policy set, or HR process ships in this repository",
    coverage: "organization-gap",
  },
  {
    id: "CC2",
    category: "Security (required)",
    name: "Communication and information",
    auditorLooksFor: "Policies, training, internal reporting of control failures",
    matrixly: "Hash-chained audit events and signed webhooks exist; policy manuals do not",
    coverage: "organization-gap",
  },
  {
    id: "CC3",
    category: "Security (required)",
    name: "Risk assessment",
    auditorLooksFor: "Recurring risk register, fraud consideration, change of objectives",
    matrixly: "ADRs record engineering risks; there is no living risk register or review cadence",
    coverage: "organization-gap",
  },
  {
    id: "CC4",
    category: "Security (required)",
    name: "Monitoring activities",
    auditorLooksFor: "Ongoing evaluations, log review, management follow-up",
    matrixly: "/ops, /healthz, /readyz, and audit hash-chain support telemetry — not scheduled review",
    coverage: "software-support",
  },
  {
    id: "CC5",
    category: "Security (required)",
    name: "Control activities",
    auditorLooksFor: "Documented activities that meet control objectives",
    matrixly: "RBAC, fail-closed adapters, tenant-scoped exports, independent verify checks",
    coverage: "software-support",
  },
  {
    id: "CC6",
    category: "Security (required)",
    name: "Logical and physical access",
    auditorLooksFor: "MFA, least privilege, access reviews, datacenter/physical controls",
    matrixly: "Hashed API keys, sealed secrets, tenant RBAC. MFA/access reviews/physical DC are the operator’s",
    coverage: "software-support",
  },
  {
    id: "CC7",
    category: "Security (required)",
    name: "System operations",
    auditorLooksFor: "Detection, incident response, vulnerability management, backups",
    matrixly: "Rate limits, fail-closed Fabric/KMS, readiness probe. No IR runbook or vuln scanner ships here",
    coverage: "software-support",
  },
  {
    id: "CC8",
    category: "Security (required)",
    name: "Change management",
    auditorLooksFor: "Authorized, tested, reviewed production changes over the period",
    matrixly: "Automated tests exist. Change tickets, CAB, and production deploy evidence are the operator’s",
    coverage: "organization-gap",
  },
  {
    id: "CC9",
    category: "Security (required)",
    name: "Risk mitigation",
    auditorLooksFor: "Vendor risk, business continuity, recovery tests",
    matrixly: "Missing Gateway/KMS/S3 refuses instead of faking success. No BCP or vendor due-diligence file",
    coverage: "software-support",
  },
  {
    id: "A1",
    category: "Availability (optional)",
    name: "Availability commitments",
    auditorLooksFor: "SLA, capacity, backup restoration tests",
    matrixly: "Readiness only. No SLA or restore test in this repository",
    coverage: "organization-gap",
  },
  {
    id: "PI1",
    category: "Processing integrity (optional)",
    name: "Complete, accurate, timely processing",
    auditorLooksFor: "Controls that processing is authorized and correct",
    matrixly: "Verifier never returns VALID if signature, hash, status list, or ledger check fails",
    coverage: "software-support",
  },
  {
    id: "C1",
    category: "Confidentiality (optional)",
    name: "Confidential information",
    auditorLooksFor: "Classification, encryption, disposal",
    matrixly: "Holder PII omitted from reports by default; secrets sealed. Full classification program is the operator’s",
    coverage: "software-support",
  },
  {
    id: "P",
    category: "Privacy (optional)",
    name: "GAPP / privacy notice, choice, retention",
    auditorLooksFor: "Notice, consent, access, disclosure, retention, disposal of personal data",
    matrixly: "Opaque verify links and minimized evidence packs. Not a privacy program or GDPR DPIA",
    coverage: "not-in-scope",
  },
];

export function soc2IsCertified(): boolean {
  return false;
}
