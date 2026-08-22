-- Phase 16: hashed email invites. Memberships already exist; this adds pending invites.

create table if not exists membership_invites (
  id text primary key,
  tenant_id text not null references tenants(id) on delete cascade,
  email text not null,
  role text not null,
  token_hash text not null unique,
  invited_by_user_id text not null,
  status text not null default 'PENDING',
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists membership_invites_tenant_idx on membership_invites (tenant_id, status);
create unique index if not exists membership_invites_pending_email_uidx
  on membership_invites (tenant_id, email)
  where status = 'PENDING';
