-- OpenID4VCI 1.0 pre-authorized_code access tokens. The pre-authorized code is credential_deliveries.claim_token.

create table if not exists oid4vci_access_tokens (
  id text primary key,
  delivery_id text not null references credential_deliveries(id) on delete cascade,
  tenant_id text not null references tenants(id) on delete cascade,
  token_hash text not null unique,
  prefix text not null,
  status text not null default 'ACTIVE',
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  used_at timestamptz
);
create index if not exists oid4vci_tokens_delivery_idx on oid4vci_access_tokens (delivery_id);
