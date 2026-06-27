-- Inventory of source-bottle ml (development.md §6).
-- available = on_hand_ml - reserved_ml.

create table if not exists inventory (
  product_id uuid primary key references products(id) on delete cascade,
  on_hand_ml int not null default 0 check (on_hand_ml >= 0),
  reserved_ml int not null default 0 check (reserved_ml >= 0),
  low_stock_ml int not null default 20,
  is_sold_out boolean not null default false,
  updated_at timestamptz not null default now(),
  check (reserved_ml <= on_hand_ml)
);

create trigger inventory_updated_at
  before update on inventory
  for each row execute function set_updated_at();

-- available_ml helper
create or replace function available_ml(inv inventory)
returns int language sql immutable as $$
  select inv.on_hand_ml - inv.reserved_ml;
$$;

-- Restock / adjustment audit log.
create table if not exists restock_log (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  delta_ml int not null,                 -- positive = restock, negative = adjustment
  reason text default '',
  created_by uuid,
  created_at timestamptz not null default now()
);
create index if not exists restock_log_product_idx on restock_log (product_id, created_at desc);
