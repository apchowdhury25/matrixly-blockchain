-- Matrixly Trust core schema. Tenant-scoped except the append-only ledger.
-- Private key material lives only in key_secrets and is never selected by public APIs.

create table if not exists tenants (
  id text primary key,
  slug text not null unique,
  name text not null,
  kind text not null default 'CUSTOMER',
  created_at timestamptz not null default now()
);

create table if not exists memberships (
  id text primary key,
  tenant_id text not null references tenants(id) on delete cascade,
  user_id text not null,
  role text not null,
  created_at timestamptz not null default now(),
  unique (tenant_id, user_id)
);
create index if not exists memberships_user_id_idx on memberships (user_id);

create table if not exists organizations (
  id text primary key,
  tenant_id text not null references tenants(id) on delete cascade,
  name text not null,
  org_type text not null default 'UNIVERSITY',
  status text not null default 'ACTIVE',
  created_at timestamptz not null default now()
);
create index if not exists organizations_tenant_idx on organizations (tenant_id);

create table if not exists issuers (
  id text primary key,
  tenant_id text not null references tenants(id) on delete cascade,
  organization_id text not null references organizations(id) on delete cascade,
  name text not null,
  did text not null unique,
  status text not null default 'ACTIVE',
  created_at timestamptz not null default now()
);
create index if not exists issuers_tenant_idx on issuers (tenant_id);

create table if not exists dids (
  id text primary key,
  tenant_id text not null references tenants(id) on delete cascade,
  did text not null unique,
  document_json text not null,
  public_key_multibase text not null,
  created_at timestamptz not null default now()
);

create table if not exists key_secrets (
  id text primary key,
  tenant_id text not null references tenants(id) on delete cascade,
  did text not null,
  secret_key_hex text not null,
  status text not null default 'ACTIVE',
  created_at timestamptz not null default now()
);
create index if not exists key_secrets_did_idx on key_secrets (did);

create table if not exists documents (
  id text primary key,
  tenant_id text not null references tenants(id) on delete cascade,
  issuer_id text references issuers(id) on delete set null,
  object_name text not null,
  mime text not null,
  byte_length integer not null,
  hash_algorithm text not null,
  hash text not null,
  status text not null default 'HASHED',
  content_b64 text not null,
  created_at timestamptz not null default now()
);
create index if not exists documents_hash_idx on documents (hash);
create index if not exists documents_tenant_idx on documents (tenant_id);

create table if not exists credentials (
  id text primary key,
  tenant_id text not null references tenants(id) on delete cascade,
  issuer_id text not null references issuers(id) on delete cascade,
  document_id text references documents(id) on delete set null,
  opaque_ref text not null unique,
  holder_name text not null,
  degree_name text not null,
  credential_json text not null,
  credential_hash text not null,
  document_hash text not null,
  status text not null default 'ACTIVE',
  valid_from timestamptz not null,
  valid_until timestamptz,
  status_list_index integer not null,
  idempotency_key text,
  issued_at timestamptz not null default now(),
  revoked_at timestamptz,
  version integer not null default 1,
  unique (tenant_id, idempotency_key)
);
create index if not exists credentials_tenant_idx on credentials (tenant_id);
create index if not exists credentials_issuer_idx on credentials (issuer_id);

create table if not exists status_lists (
  id text primary key,
  tenant_id text not null references tenants(id) on delete cascade,
  issuer_id text not null references issuers(id) on delete cascade,
  encoded_list text not null,
  next_index integer not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists ledger_blocks (
  seq integer primary key,
  previous_hash text not null,
  payload_json text not null,
  payload_hash text not null,
  block_hash text not null unique,
  timestamp_iso text not null,
  created_at timestamptz not null default now()
);

create table if not exists verification_requests (
  id text primary key,
  opaque_ref text,
  credential_id text,
  result_status text not null,
  result_json text not null,
  created_at timestamptz not null default now()
);

create table if not exists audit_events (
  id text primary key,
  tenant_id text,
  actor_user_id text,
  action text not null,
  resource_type text not null,
  resource_id text,
  metadata_json text not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists audit_events_tenant_idx on audit_events (tenant_id, created_at desc);
