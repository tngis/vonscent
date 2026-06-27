-- CMS content (admin A8): blog, FAQ, hero banners + content settings keys.

-- ── Blog posts ─────────────────────────────────────────────────────────
create table if not exists blog_posts (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  excerpt text default '',
  body text default '',
  cover_url text,
  category text default '',
  tags text[] not null default '{}',
  is_published boolean not null default true,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists blog_posts_published_idx
  on blog_posts (is_published, published_at desc);

create trigger blog_posts_updated_at
  before update on blog_posts
  for each row execute function set_updated_at();

-- ── FAQ ────────────────────────────────────────────────────────────────
create table if not exists faqs (
  id uuid primary key default gen_random_uuid(),
  category text not null default '',
  question text not null,
  answer text not null,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists faqs_active_idx on faqs (is_active, sort_order);

-- ── Hero banners (home) ────────────────────────────────────────────────
create table if not exists hero_banners (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subtitle text default '',
  cta_label text default '',
  cta_href text default '/catalog',
  image_url text,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists hero_banners_active_idx on hero_banners (is_active, sort_order);

-- ── Content settings (popup / social / about) ──────────────────────────
insert into settings (key, value) values
  ('popup', jsonb_build_object(
     'enabled', false,
     'title', '',
     'body', '',
     'ctaLabel', '',
     'ctaHref', '/catalog',
     'frequencyHours', 24)),
  ('social', jsonb_build_object(
     'instagram', '',
     'facebook', '',
     'phone', '',
     'email', 'hello@vonscent.mn')),
  ('about', jsonb_build_object(
     'story', '',
     'values', jsonb_build_array(),
     'team', jsonb_build_array()))
on conflict (key) do nothing;

-- ── RLS: public read (published/active), staff write ───────────────────
alter table blog_posts enable row level security;
create policy "blog read" on blog_posts for select using (is_published or is_staff());
create policy "blog write" on blog_posts for all using (is_staff()) with check (is_staff());

alter table faqs enable row level security;
create policy "faq read" on faqs for select using (is_active or is_staff());
create policy "faq write" on faqs for all using (is_staff()) with check (is_staff());

alter table hero_banners enable row level security;
create policy "banner read" on hero_banners for select using (is_active or is_staff());
create policy "banner write" on hero_banners for all using (is_staff()) with check (is_staff());
