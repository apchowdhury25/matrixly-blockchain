-- Phase 14: tenant scope on verification exports.

alter table verification_requests add column if not exists tenant_id text;
create index if not exists verification_requests_tenant_idx on verification_requests (tenant_id);
