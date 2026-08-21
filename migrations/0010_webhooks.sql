-- Phase 9: HMAC webhook endpoints. Signing secrets are sealed, never returned after create.

create table if not exists webhook_endpoints (
  id text primary key,
  tenant_id text not null references tenants(id) on delete cascade,
  created_by_user_id text,
  name text not null,
  url text not null,
  secret_sealed text not null,
  prefix text not null,
  status text not null default 'ACTIVE',
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);
create index if not exists webhook_endpoints_tenant_idx on webhook_endpoints (tenant_id);

create table if not exists webhook_deliveries (
  id text primary key,
  endpoint_id text not null references webhook_endpoints(id) on delete cascade,
  tenant_id text not null,
  event_type text not null,
  payload_json text not null,
  payload_hash text not null,
  signature text not null,
  status text not null,
  http_status integer,
  error_text text,
  created_at timestamptz not null default now()
);
create index if not exists webhook_deliveries_endpoint_idx on webhook_deliveries (endpoint_id);
