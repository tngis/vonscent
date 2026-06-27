-- Products, images, variants (Phase 1).

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  brand text not null,
  description text default '',
  notes_top text[] not null default '{}',
  notes_heart text[] not null default '{}',
  notes_base text[] not null default '{}',
  gender gender_t not null default 'unisex',
  concentration concentration_t not null default 'EDP',
  scent_family scent_family_t,
  origin_country text,
  release_year int,
  -- Pricing inputs (development.md §5). Money is integer ₮.
  bottle_price int not null check (bottle_price >= 0),
  bottle_ml int not null check (bottle_ml > 0),
  sample_available boolean not null default true,
  rating_avg numeric(2,1) not null default 0,
  rating_count int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists products_brand_idx on products (brand);
create index if not exists products_gender_idx on products (gender);
create index if not exists products_family_idx on products (scent_family);
create index if not exists products_active_idx on products (is_active);

create trigger products_updated_at
  before update on products
  for each row execute function set_updated_at();

create table if not exists product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  url text not null,
  alt text default '',
  sort_order int not null default 0
);
create index if not exists product_images_product_idx on product_images (product_id, sort_order);

-- Decant size variants. auto_price is computed from bottle price + tier coeff;
-- override_price (when set) wins (development.md §5).
create table if not exists product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  ml int not null check (ml > 0),
  auto_price int not null default 0 check (auto_price >= 0),
  override_price int check (override_price is null or override_price >= 0),
  is_active boolean not null default true,
  unique (product_id, ml)
);
create index if not exists product_variants_product_idx on product_variants (product_id);

-- Effective charged price: override wins over auto (mirrors lib/pricing).
create or replace function variant_price(v product_variants)
returns int language sql immutable as $$
  select coalesce(v.override_price, v.auto_price);
$$;

-- Tags / hashtags (new / hot / sale).
create table if not exists tags (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  kind tag_kind_t not null
);

create table if not exists product_tags (
  product_id uuid not null references products(id) on delete cascade,
  tag_id uuid not null references tags(id) on delete cascade,
  primary key (product_id, tag_id)
);

insert into tags (slug, name, kind) values
  ('new', 'Шинэ', 'new'),
  ('hot', 'Эрэлттэй', 'hot'),
  ('sale', 'Хямдрал', 'sale')
on conflict (slug) do nothing;
