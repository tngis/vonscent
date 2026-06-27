-- Orders & order items (Phase 3). Money is integer ₮.

create sequence if not exists order_no_seq start 1000;

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  order_no text unique not null default ('VS-' || nextval('order_no_seq')::text),
  user_id uuid references auth.users(id) on delete set null,  -- null = guest
  status order_status_t not null default 'pending',
  payment_method payment_method_t not null default 'qpay',
  payment_status payment_status_t not null default 'unpaid',

  -- contact + address snapshot (kept even if the address row changes)
  contact_name text not null,
  contact_phone text not null,
  contact_email text,
  ship_city text not null default 'Улаанбаатар',
  ship_district text,
  ship_detail text not null,
  ship_zone text,
  note text,

  subtotal int not null default 0 check (subtotal >= 0),
  shipping_fee int not null default 0 check (shipping_fee >= 0),
  discount int not null default 0 check (discount >= 0),
  loyalty_used int not null default 0 check (loyalty_used >= 0),
  total int not null default 0 check (total >= 0),
  coupon_code text,

  reserve_expires_at timestamptz,  -- reserve hold deadline (auto-release)
  qpay_invoice_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists orders_user_idx on orders (user_id, created_at desc);
create index if not exists orders_status_idx on orders (status);
create index if not exists orders_payment_idx on orders (payment_status);

create trigger orders_updated_at
  before update on orders
  for each row execute function set_updated_at();

create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid references products(id) on delete set null,
  variant_id uuid references product_variants(id) on delete set null,
  -- snapshots for history integrity
  product_name text not null,
  brand text not null,
  ml int not null check (ml > 0),
  unit_price int not null check (unit_price >= 0),
  qty int not null check (qty > 0),
  is_sample boolean not null default false,
  line_total int not null check (line_total >= 0)
);
create index if not exists order_items_order_idx on order_items (order_id);
create index if not exists order_items_product_idx on order_items (product_id);

-- Coupons (admin A6).
create table if not exists coupons (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  type coupon_type_t not null,
  value int not null check (value >= 0),     -- percent (0-100) or fixed ₮
  min_subtotal int not null default 0,
  max_uses int,                              -- null = unlimited
  used_count int not null default 0,
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists coupons_active_idx on coupons (is_active);
