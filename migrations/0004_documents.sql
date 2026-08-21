-- Phase 3: document evidence metadata. Original bytes stay off-chain (content_b64).
-- The ledger only ever receives `hash`. Filename is not evidence.

alter table documents add column if not exists origin text not null default 'GENERATED';
alter table documents add column if not exists inspected_kind text;
alter table documents add column if not exists evidence_json text;
alter table documents add column if not exists original_name text;

create unique index if not exists documents_tenant_hash_uidx on documents (tenant_id, hash);
