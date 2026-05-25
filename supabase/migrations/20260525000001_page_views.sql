create table public.page_views (
  id uuid primary key default gen_random_uuid(),
  path text not null,
  referrer text,
  source text,
  device text check (device in ('mobile', 'desktop')),
  country text,
  created_at timestamptz default now() not null
);

create index page_views_created_at_idx on public.page_views (created_at desc);
create index page_views_source_idx on public.page_views (source);
create index page_views_path_idx on public.page_views (path);

alter table public.page_views enable row level security;

create policy "admins can read page_views" on public.page_views
  for select using (is_platform_admin());
