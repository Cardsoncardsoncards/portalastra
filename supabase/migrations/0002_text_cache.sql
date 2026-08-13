-- Durable cache for generated text (ritual prompts, simplified APOD copy).
--
-- Apply this in the Supabase SQL editor (or via the CLI). It is NOT applied
-- automatically by a deploy. See MAINTENANCE.md.

create table if not exists public.portal_astra_text_cache (
  cache_key  text        primary key,
  value      text        not null,
  created_at timestamptz not null default now()
);

create index if not exists portal_astra_text_cache_created_at_idx
  on public.portal_astra_text_cache (created_at);

-- Written only by server routes using the service key, which bypasses RLS.
alter table public.portal_astra_text_cache enable row level security;
