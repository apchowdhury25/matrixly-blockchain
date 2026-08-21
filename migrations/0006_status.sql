-- Phase 5: status lists are signed BitstringStatusListCredentials, not raw bitstrings.

alter table status_lists add column if not exists credential_json text;
alter table status_lists add column if not exists credential_hash text;
