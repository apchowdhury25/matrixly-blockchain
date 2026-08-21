-- Phase 7: object storage metadata. Bytes may leave content_b64 for fs/s3.

alter table documents add column if not exists storage_backend text not null default 'db';
alter table documents alter column content_b64 drop not null;

create table if not exists object_blobs (
  object_name text primary key,
  mime text not null,
  content_b64 text not null,
  created_at timestamptz not null default now()
);
