-- OpenID4VP 1.0 authorization requests (DCQL + direct_post). Nonce is single-use.

create table if not exists oid4vp_requests (
  id text primary key,
  tenant_id text,
  nonce text not null unique,
  state text not null,
  client_id text not null,
  response_uri text not null,
  request_json text not null,
  dcql_json text not null,
  status text not null default 'OPEN',
  vp_token_json text,
  result_json text,
  wallet_uri text,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  received_at timestamptz
);
create index if not exists oid4vp_requests_status_idx on oid4vp_requests (status, expires_at);
