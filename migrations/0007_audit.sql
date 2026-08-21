-- Phase 6: signed verification reports and hash-chained audit events.

create table if not exists platform_verifiers (
  id text primary key,
  did text not null unique,
  secret_key_hex text not null,
  public_key_multibase text not null,
  created_at timestamptz not null default now()
);

alter table verification_requests add column if not exists report_json text;
alter table verification_requests add column if not exists report_hash text;
alter table verification_requests add column if not exists opaque_report_ref text;
alter table verification_requests add column if not exists verifier_did text;
alter table verification_requests add column if not exists ledger_block_hash text;
create unique index if not exists verification_requests_report_ref_uidx
  on verification_requests (opaque_report_ref)
  where opaque_report_ref is not null;

alter table audit_events add column if not exists prev_hash text;
alter table audit_events add column if not exists event_hash text;
