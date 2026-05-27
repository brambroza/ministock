alter table public.products
  add column if not exists image_url text;

comment on column public.products.image_url is 'Public URL of product image stored in Supabase Storage';
    