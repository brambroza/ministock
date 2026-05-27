create extension if not exists "uuid-ossp";

create type public.app_role as enum ('SUPER_ADMIN','COMPANY_ADMIN','MANAGER','STAFF','VIEWER');
create type public.movement_type as enum ('OPENING','RECEIVE','ISSUE','ADJUST_IN','ADJUST_OUT','TRANSFER_IN','TRANSFER_OUT');

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.current_app_user_id()
returns uuid language sql stable as $$
  select id from public.user_profiles where auth_user_id = auth.uid() limit 1;
$$;

create or replace function public.current_company_id()
returns uuid language sql stable as $$
  select company_id from public.user_profiles where auth_user_id = auth.uid() and active = true limit 1;
$$;

create or replace function public.is_super_admin()
returns boolean language sql stable as $$
  select exists (
    select 1
    from public.user_profiles up
    join public.roles r on r.id = up.role_id
    where up.auth_user_id = auth.uid() and r.role_code = 'SUPER_ADMIN' and up.active = true
  );
$$;

create table public.companies (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null,
  company_code text not null unique,
  company_name text not null,
  tax_id text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  is_deleted boolean not null default false,
  unique(company_id)
);

create table public.roles (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null,
  role_code public.app_role not null,
  role_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  is_deleted boolean not null default false,
  unique(company_id, role_code)
);

create table public.permissions (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null,
  permission_code text not null,
  permission_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  is_deleted boolean not null default false,
  unique(company_id, permission_code)
);

create table public.role_permissions (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null,
  role_id uuid not null references public.roles(id),
  permission_id uuid not null references public.permissions(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  is_deleted boolean not null default false,
  unique(company_id, role_id, permission_id)
);

create table public.user_profiles (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null,
  auth_user_id uuid not null unique,
  line_user_id text,
  display_name text not null,
  email text,
  phone text,
  role_id uuid not null references public.roles(id),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  is_deleted boolean not null default false
);

create table public.company_users (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null,
  user_profile_id uuid not null references public.user_profiles(id),
  invited_email text,
  invite_status text not null default 'ACCEPTED',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  is_deleted boolean not null default false,
  unique(company_id, user_profile_id)
);

create table public.units (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null,
  unit_code text not null,
  unit_name text not null,
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  is_deleted boolean not null default false,
  unique(company_id, unit_code)
);

create table public.storage_locations (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null,
  location_code text not null,
  location_name text not null,
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  is_deleted boolean not null default false,
  unique(company_id, location_code)
);

create table public.products (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null,
  barcode text not null,
  sku text,
  product_name text not null,
  description text,
  unit_id uuid not null references public.units(id),
  price numeric(14,2) not null default 0,
  cost numeric(14,2) not null default 0,
  storage_location_id uuid references public.storage_locations(id),
  min_stock_qty numeric(14,2) not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  is_deleted boolean not null default false,
  unique(company_id, barcode)
);

create table public.stock_movements (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null,
  movement_date timestamptz not null default now(),
  product_id uuid not null references public.products(id),
  location_id uuid not null references public.storage_locations(id),
  movement_type public.movement_type not null,
  qty_in numeric(14,2) not null default 0,
  qty_out numeric(14,2) not null default 0,
  balance_qty numeric(14,2) not null default 0,
  unit_cost numeric(14,2) not null default 0,
  reference_type text,
  reference_no text,
  remark text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  is_deleted boolean not null default false
);

create table public.stock_monthly_balances (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null,
  month_key date not null,
  product_id uuid not null references public.products(id),
  location_id uuid not null references public.storage_locations(id),
  opening_balance numeric(14,2) not null default 0,
  qty_in numeric(14,2) not null default 0,
  qty_out numeric(14,2) not null default 0,
  ending_balance numeric(14,2) not null default 0,
  ending_stock_value numeric(14,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  is_deleted boolean not null default false,
  unique(company_id, month_key, product_id, location_id)
);

create table public.audit_logs (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null,
  action text not null,
  table_name text not null,
  record_id uuid,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  is_deleted boolean not null default false
);

create index idx_company on public.products(company_id);
create index idx_product_barcode on public.products(company_id, barcode);
create index idx_stock_movement_product on public.stock_movements(company_id, product_id);
create index idx_stock_movement_location on public.stock_movements(company_id, location_id);
create index idx_stock_movement_date on public.stock_movements(company_id, movement_date);
create index idx_is_deleted_products on public.products(is_deleted);
create index idx_is_deleted_stock_movements on public.stock_movements(is_deleted);

create or replace view public.stock_on_hand_view as
select
  p.id as product_id,
  p.company_id,
  p.barcode,
  p.product_name,
  u.unit_name,
  l.location_name,
  coalesce(sum(sm.qty_in - sm.qty_out), 0) as qty_on_hand,
  p.min_stock_qty,
  p.price,
  coalesce(sum(sm.qty_in - sm.qty_out),0) * p.price as stock_value,
  case
    when coalesce(sum(sm.qty_in - sm.qty_out), 0) <= 0 then 'Out of Stock'
    when coalesce(sum(sm.qty_in - sm.qty_out), 0) <= p.min_stock_qty then 'Low Stock'
    else 'Normal'
  end as status
from public.products p
join public.units u on u.id = p.unit_id
left join public.storage_locations l on l.id = p.storage_location_id
left join public.stock_movements sm on sm.product_id = p.id and sm.company_id = p.company_id and sm.is_deleted = false
where p.is_deleted = false
group by p.id, p.company_id, p.barcode, p.product_name, u.unit_name, l.location_name, p.min_stock_qty, p.price;

create or replace function public.get_stock_balance(p_company_id uuid, p_product_id uuid, p_location_id uuid)
returns numeric language sql stable as $$
  select coalesce(sum(qty_in - qty_out), 0)
  from public.stock_movements
  where company_id = p_company_id and product_id = p_product_id and location_id = p_location_id and is_deleted = false;
$$;

create or replace function public.get_monthly_purchase_summary(p_company_id uuid, p_month date)
returns table(month_key date, product_id uuid, product_name text, total_received_qty numeric, total_purchase_amount numeric, average_cost numeric)
language sql stable as $$
  select date_trunc('month', p_month)::date, p.id, p.product_name,
         sum(sm.qty_in), sum(sm.qty_in * sm.unit_cost),
         case when sum(sm.qty_in)=0 then 0 else sum(sm.qty_in * sm.unit_cost)/sum(sm.qty_in) end
  from public.stock_movements sm
  join public.products p on p.id = sm.product_id
  where sm.company_id = p_company_id
    and sm.movement_type = 'RECEIVE'
    and date_trunc('month', sm.movement_date) = date_trunc('month', p_month)
    and sm.is_deleted = false
  group by p.id, p.product_name;
$$;

create or replace function public.get_monthly_stock_balance(p_company_id uuid, p_month date)
returns table(month_key date, product_id uuid, product_name text, opening_balance numeric, total_in numeric, total_out numeric, ending_balance numeric, ending_stock_value numeric)
language sql stable as $$
  with m as (
    select sm.product_id, p.product_name,
      sum(case when sm.movement_date < date_trunc('month', p_month) then sm.qty_in - sm.qty_out else 0 end) as opening_balance,
      sum(case when date_trunc('month', sm.movement_date) = date_trunc('month', p_month) then sm.qty_in else 0 end) as total_in,
      sum(case when date_trunc('month', sm.movement_date) = date_trunc('month', p_month) then sm.qty_out else 0 end) as total_out,
      max(p.price) as price
    from public.stock_movements sm
    join public.products p on p.id = sm.product_id
    where sm.company_id = p_company_id and sm.is_deleted = false
    group by sm.product_id, p.product_name
  )
  select date_trunc('month', p_month)::date, product_id, product_name,
         opening_balance, total_in, total_out,
         (opening_balance + total_in - total_out) as ending_balance,
         (opening_balance + total_in - total_out) * price as ending_stock_value
  from m;
$$;

create or replace function public.get_stock_card(p_product_id uuid, p_date_from timestamptz, p_date_to timestamptz)
returns table(id uuid, movement_date timestamptz, movement_type public.movement_type, qty_in numeric, qty_out numeric, balance_qty numeric, reference_no text, remark text)
language sql stable as $$
  select id, movement_date, movement_type, qty_in, qty_out, balance_qty, reference_no, remark
  from public.stock_movements
  where product_id = p_product_id and movement_date between p_date_from and p_date_to and is_deleted = false
  order by movement_date asc, created_at asc;
$$;

create or replace function public.prevent_negative_stock()
returns trigger language plpgsql as $$
declare
  current_balance numeric;
  role_code public.app_role;
begin
  select get_stock_balance(new.company_id, new.product_id, new.location_id) into current_balance;
  select r.role_code into role_code from public.user_profiles up join public.roles r on r.id = up.role_id where up.id = new.created_by;

  if (coalesce(current_balance,0) + new.qty_in - new.qty_out) < 0 and role_code not in ('MANAGER','COMPANY_ADMIN','SUPER_ADMIN') then
    raise exception 'negative stock is not allowed for this role';
  end if;

  new.balance_qty = coalesce(current_balance,0) + new.qty_in - new.qty_out;
  return new;
end;
$$;

create trigger trg_updated_companies before update on public.companies for each row execute function public.set_updated_at();
create trigger trg_updated_roles before update on public.roles for each row execute function public.set_updated_at();
create trigger trg_updated_permissions before update on public.permissions for each row execute function public.set_updated_at();
create trigger trg_updated_role_permissions before update on public.role_permissions for each row execute function public.set_updated_at();
create trigger trg_updated_user_profiles before update on public.user_profiles for each row execute function public.set_updated_at();
create trigger trg_updated_company_users before update on public.company_users for each row execute function public.set_updated_at();
create trigger trg_updated_units before update on public.units for each row execute function public.set_updated_at();
create trigger trg_updated_storage_locations before update on public.storage_locations for each row execute function public.set_updated_at();
create trigger trg_updated_products before update on public.products for each row execute function public.set_updated_at();
create trigger trg_updated_stock_movements before update on public.stock_movements for each row execute function public.set_updated_at();
create trigger trg_updated_stock_monthly_balances before update on public.stock_monthly_balances for each row execute function public.set_updated_at();
create trigger trg_updated_audit_logs before update on public.audit_logs for each row execute function public.set_updated_at();
create trigger trg_prevent_negative_stock before insert on public.stock_movements for each row execute function public.prevent_negative_stock();

alter table public.companies enable row level security;
alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.user_profiles enable row level security;
alter table public.company_users enable row level security;
alter table public.units enable row level security;
alter table public.storage_locations enable row level security;
alter table public.products enable row level security;
alter table public.stock_movements enable row level security;
alter table public.stock_monthly_balances enable row level security;
alter table public.audit_logs enable row level security;

create policy company_isolation_read on public.units for select using (is_super_admin() or company_id = current_company_id());
create policy company_isolation_write on public.units for all using (is_super_admin() or company_id = current_company_id()) with check (is_super_admin() or company_id = current_company_id());

create policy company_isolation_read_locations on public.storage_locations for select using (is_super_admin() or company_id = current_company_id());
create policy company_isolation_write_locations on public.storage_locations for all using (is_super_admin() or company_id = current_company_id()) with check (is_super_admin() or company_id = current_company_id());

create policy company_isolation_read_products on public.products for select using (is_super_admin() or company_id = current_company_id());
create policy company_isolation_write_products on public.products for all using (is_super_admin() or company_id = current_company_id()) with check (is_super_admin() or company_id = current_company_id());

create policy company_isolation_read_stock_movements on public.stock_movements for select using (is_super_admin() or company_id = current_company_id());
create policy company_isolation_write_stock_movements on public.stock_movements for insert with check (is_super_admin() or company_id = current_company_id());
create policy company_isolation_update_stock_movements on public.stock_movements for update using (is_super_admin() or company_id = current_company_id()) with check (is_super_admin() or company_id = current_company_id());

create policy company_isolation_read_generic on public.user_profiles for select using (is_super_admin() or company_id = current_company_id());
create policy company_isolation_write_generic on public.user_profiles for all using (is_super_admin() or company_id = current_company_id()) with check (is_super_admin() or company_id = current_company_id());
create policy company_isolation_rw_company_users on public.company_users for all using (is_super_admin() or company_id = current_company_id()) with check (is_super_admin() or company_id = current_company_id());
create policy company_isolation_rw_roles on public.roles for all using (is_super_admin() or company_id = current_company_id()) with check (is_super_admin() or company_id = current_company_id());
create policy company_isolation_rw_permissions on public.permissions for all using (is_super_admin() or company_id = current_company_id()) with check (is_super_admin() or company_id = current_company_id());
create policy company_isolation_rw_role_permissions on public.role_permissions for all using (is_super_admin() or company_id = current_company_id()) with check (is_super_admin() or company_id = current_company_id());
create policy company_isolation_rw_companies on public.companies for all using (is_super_admin() or company_id = current_company_id()) with check (is_super_admin() or company_id = current_company_id());
create policy company_isolation_rw_monthly on public.stock_monthly_balances for all using (is_super_admin() or company_id = current_company_id()) with check (is_super_admin() or company_id = current_company_id());
create policy company_isolation_rw_audit on public.audit_logs for all using (is_super_admin() or company_id = current_company_id()) with check (is_super_admin() or company_id = current_company_id());
