alter table public.user_profiles
  add column if not exists line_display_name text,
  add column if not exists line_picture_url text;
