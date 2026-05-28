create table if not exists public.company_invite_links (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  role_id uuid not null references public.roles(id),
  token_hash text not null unique,
  note text,
  max_uses integer not null default 100,
  used_count integer not null default 0,
  expires_at timestamptz not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  is_deleted boolean not null default false
);

create index if not exists idx_company_invite_links_company on public.company_invite_links(company_id);
create index if not exists idx_company_invite_links_expires on public.company_invite_links(expires_at);
create index if not exists idx_company_invite_links_active on public.company_invite_links(active, is_deleted);

create trigger trg_updated_company_invite_links
before update on public.company_invite_links
for each row execute function public.set_updated_at();

alter table public.company_invite_links enable row level security;

create policy company_isolation_rw_company_invite_links
on public.company_invite_links
for all
using (is_super_admin() or company_id = current_company_id())
with check (is_super_admin() or company_id = current_company_id());
