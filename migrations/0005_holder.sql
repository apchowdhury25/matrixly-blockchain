-- Phase 4: holder wallet, claim delivery, verifiable presentations.
-- Holder secrets are sealed like issuer secrets. Claim tokens are opaque.

create table if not exists holders (
  id text primary key,
  user_id text not null unique,
  did text not null unique,
  display_name text,
  created_at timestamptz not null default now()
);

create table if not exists holder_keys (
  id text primary key,
  holder_id text not null references holders(id) on delete cascade,
  did text not null,
  secret_key_hex text not null,
  public_key_multibase text not null,
  status text not null default 'ACTIVE',
  created_at timestamptz not null default now()
);
create index if not exists holder_keys_holder_idx on holder_keys (holder_id);

create table if not exists credential_deliveries (
  id text primary key,
  credential_id text not null unique references credentials(id) on delete cascade,
  tenant_id text not null references tenants(id) on delete cascade,
  claim_token text not null unique,
  holder_id text references holders(id) on delete set null,
  holder_did text,
  status text not null default 'PENDING',
  claimed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists credential_deliveries_token_idx on credential_deliveries (claim_token);

create table if not exists wallet_items (
  id text primary key,
  holder_id text not null references holders(id) on delete cascade,
  credential_id text not null,
  credential_json text not null,
  issuer_did text not null,
  document_hash text not null,
  holder_name text not null,
  degree_name text not null,
  opaque_ref text not null,
  claimed_at timestamptz not null default now(),
  unique (holder_id, credential_id)
);
create index if not exists wallet_items_holder_idx on wallet_items (holder_id);

create table if not exists presentations (
  id text primary key,
  holder_id text not null references holders(id) on delete cascade,
  opaque_ref text not null unique,
  presentation_json text not null,
  credential_id text not null,
  created_at timestamptz not null default now()
);
create index if not exists presentations_holder_idx on presentations (holder_id);

alter table credentials add column if not exists holder_did text;
