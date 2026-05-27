create table if not exists public.expense_documents (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null,
  image_url text not null,
  image_path text,
  file_hash text not null,
  normalized_fingerprint text,
  ocr_provider text,
  ocr_status text not null default 'PENDING_OCR',
  ocr_raw_text text,
  ocr_payload jsonb,
  parse_payload jsonb,
  duplicate_of uuid references public.expense_documents(id),
  confidence_score numeric(5,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  is_deleted boolean not null default false,
  unique(company_id, file_hash)
);

create table if not exists public.expense_claims (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null,
  document_id uuid references public.expense_documents(id),
  expense_date date not null,
  vendor_name text,
  tax_id text,
  invoice_no text,
  subtotal_amount numeric(14,2) not null default 0,
  vat_amount numeric(14,2) not null default 0,
  total_amount numeric(14,2) not null default 0,
  currency text not null default 'THB',
  payment_method text,
  category text,
  remark text,
  status text not null default 'CONFIRMED',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  is_deleted boolean not null default false
);

create index if not exists idx_expense_documents_company_created_at on public.expense_documents(company_id, created_at desc);
create index if not exists idx_expense_documents_fingerprint on public.expense_documents(company_id, normalized_fingerprint);
create index if not exists idx_expense_claims_company_date on public.expense_claims(company_id, expense_date desc);
create index if not exists idx_expense_claims_invoice on public.expense_claims(company_id, invoice_no);
create index if not exists idx_expense_claims_is_deleted on public.expense_claims(is_deleted);

create or replace function public.get_monthly_expense_summary(p_company_id uuid, p_month date)
returns table(month_key date, total_expense numeric, tx_count bigint)
language sql
stable
as $$
  select date_trunc('month', p_month)::date as month_key,
         coalesce(sum(ec.total_amount), 0) as total_expense,
         count(*)::bigint as tx_count
  from public.expense_claims ec
  where ec.company_id = p_company_id
    and ec.is_deleted = false
    and date_trunc('month', ec.expense_date) = date_trunc('month', p_month);
$$;

create or replace function public.get_monthly_expense_compare(p_company_id uuid, p_month date)
returns table(current_month date, current_total numeric, previous_month date, previous_total numeric)
language sql
stable
as $$
  with current_data as (
    select date_trunc('month', p_month)::date as m,
           coalesce(sum(total_amount),0) as total
    from public.expense_claims
    where company_id = p_company_id and is_deleted = false
      and date_trunc('month', expense_date) = date_trunc('month', p_month)
  ),
  previous_data as (
    select (date_trunc('month', p_month) - interval '1 month')::date as m,
           coalesce(sum(total_amount),0) as total
    from public.expense_claims
    where company_id = p_company_id and is_deleted = false
      and date_trunc('month', expense_date) = date_trunc('month', p_month) - interval '1 month'
  )
  select c.m, c.total, p.m, p.total from current_data c cross join previous_data p;
$$;

create trigger trg_updated_expense_documents before update on public.expense_documents for each row execute function public.set_updated_at();
create trigger trg_updated_expense_claims before update on public.expense_claims for each row execute function public.set_updated_at();

alter table public.expense_documents enable row level security;
alter table public.expense_claims enable row level security;

create policy company_isolation_read_expense_documents
  on public.expense_documents for select
  using (is_super_admin() or company_id = current_company_id());

create policy company_isolation_write_expense_documents
  on public.expense_documents for all
  using (is_super_admin() or company_id = current_company_id())
  with check (is_super_admin() or company_id = current_company_id());

create policy company_isolation_read_expense_claims
  on public.expense_claims for select
  using (is_super_admin() or company_id = current_company_id());

create policy company_isolation_write_expense_claims
  on public.expense_claims for all
  using (is_super_admin() or company_id = current_company_id())
  with check (is_super_admin() or company_id = current_company_id());
