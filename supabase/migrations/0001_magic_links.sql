-- Magic-link tokens for premium access.
--
-- Apply this in the Supabase SQL editor (or via the CLI) before the premium
-- unlock flow will work. It is NOT applied automatically by a deploy.
-- See MAINTENANCE.md.

create table if not exists public.portal_astra_magic_links (
  token_hash  text        primary key,
  email       text        not null,
  expires_at  timestamptz not null,
  used_at     timestamptz,
  created_at  timestamptz not null default now()
);

-- Supports the expiry prune and any "recent links for this email" lookup.
create index if not exists portal_astra_magic_links_expires_at_idx
  on public.portal_astra_magic_links (expires_at);

create index if not exists portal_astra_magic_links_email_idx
  on public.portal_astra_magic_links (email);

-- The table is only ever touched by server routes using the service key, which
-- bypasses RLS. Enabling RLS with no policies means that if the anon key is
-- ever pointed at this table by mistake, it reads nothing rather than reading
-- every token hash and subscriber email.
alter table public.portal_astra_magic_links enable row level security;
