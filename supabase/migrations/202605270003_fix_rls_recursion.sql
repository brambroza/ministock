-- Fix RLS recursion causing "stack depth limit exceeded"
-- Root cause: policies call functions that query user_profiles,
-- while user_profiles itself is protected by policies using those same functions.

create or replace function public.current_app_user_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select up.id
  from public.user_profiles up
  where up.auth_user_id = auth.uid()
    and up.active = true
    and up.is_deleted = false
  limit 1;
$$;

create or replace function public.current_company_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select up.company_id
  from public.user_profiles up
  where up.auth_user_id = auth.uid()
    and up.active = true
    and up.is_deleted = false
  limit 1;
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_profiles up
    join public.roles r on r.id = up.role_id
    where up.auth_user_id = auth.uid()
      and r.role_code = 'SUPER_ADMIN'
      and up.active = true
      and up.is_deleted = false
  );
$$;

revoke all on function public.current_app_user_id() from public;
revoke all on function public.current_company_id() from public;
revoke all on function public.is_super_admin() from public;

grant execute on function public.current_app_user_id() to anon, authenticated, service_role;
grant execute on function public.current_company_id() to anon, authenticated, service_role;
grant execute on function public.is_super_admin() to anon, authenticated, service_role;

-- Replace recursive user_profiles policies with non-recursive ones

drop policy if exists company_isolation_read_generic on public.user_profiles;
drop policy if exists company_isolation_write_generic on public.user_profiles;

create policy user_profiles_select_policy
on public.user_profiles
for select
using (
  is_super_admin()
  or auth.uid() = auth_user_id
  or company_id = current_company_id()
);

create policy user_profiles_insert_policy
on public.user_profiles
for insert
with check (
  is_super_admin()
  or company_id = current_company_id()
);

create policy user_profiles_update_policy
on public.user_profiles
for update
using (
  is_super_admin()
  or auth.uid() = auth_user_id
  or company_id = current_company_id()
)
with check (
  is_super_admin()
  or auth.uid() = auth_user_id
  or company_id = current_company_id()
);

create policy user_profiles_delete_policy
on public.user_profiles
for delete
using (
  is_super_admin()
);
