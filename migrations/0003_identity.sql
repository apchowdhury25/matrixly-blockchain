-- Phase 2: DID registry metadata and key lifecycle.
-- Existing rows receive ACTIVE defaults. Public key material already lives in dids.

alter table dids add column if not exists status text not null default 'ACTIVE';
alter table dids add column if not exists document_hash text;
alter table dids add column if not exists superseded_by text;
alter table dids add column if not exists rotated_at timestamptz;

alter table key_secrets add column if not exists public_key_multibase text;
alter table key_secrets add column if not exists purpose text not null default 'assertionMethod';
alter table key_secrets add column if not exists rotated_at timestamptz;
alter table key_secrets add column if not exists rotated_to_did text;

alter table memberships add column if not exists status text not null default 'ACTIVE';

create index if not exists dids_tenant_status_idx on dids (tenant_id, status);
create index if not exists key_secrets_tenant_status_idx on key_secrets (tenant_id, status);
