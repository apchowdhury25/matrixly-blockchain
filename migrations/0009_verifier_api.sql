-- Phase 8: hashed verifier API keys. Secrets are never stored.

create table if not exists verifier_api_keys (
  id text primary key,
  tenant_id text not null references tenants(id) on delete cascade,
  created_by_user_id text,
  name text not null,
  prefix text not null,
  secret_hash text not null unique,
  status text not null default 'ACTIVE',
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);
create index if not exists verifier_api_keys_tenant_idx on verifier_api_keys (tenant_id);

alter table verification_requests add column if not exists api_key_id text;
alter table verification_requests add column if not exists source text not null default 'ui';
