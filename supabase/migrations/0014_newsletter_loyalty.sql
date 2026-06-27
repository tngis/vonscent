-- Newsletter subscribers, loyalty ledger, order status history, blocked flag.

-- ── Newsletter ─────────────────────────────────────────────────────────
create table if not exists newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  created_at timestamptz not null default now()
);

alter table newsletter_subscribers enable row level security;
-- anyone may subscribe; only staff may read the list.
create policy "newsletter insert" on newsletter_subscribers for insert with check (true);
create policy "newsletter staff read" on newsletter_subscribers for select using (is_staff());

-- ── Loyalty ledger (earn / redeem audit) ───────────────────────────────
create table if not exists loyalty_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  order_id uuid references orders(id) on delete set null,
  delta int not null,                       -- + earned, - redeemed
  reason text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists loyalty_ledger_user_idx
  on loyalty_ledger (user_id, created_at desc);

alter table loyalty_ledger enable row level security;
create policy "loyalty owner read" on loyalty_ledger for select
  using (user_id = auth.uid() or is_staff());
create policy "loyalty staff write" on loyalty_ledger for all
  using (is_staff()) with check (is_staff());

-- ── Order status history (admin A4 audit) ──────────────────────────────
create table if not exists order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  status order_status_t not null,
  note text default '',
  changed_by uuid,
  created_at timestamptz not null default now()
);
create index if not exists order_status_history_order_idx
  on order_status_history (order_id, created_at desc);

alter table order_status_history enable row level security;
create policy "osh read" on order_status_history for select using (
  exists (select 1 from orders o where o.id = order_id and (o.user_id = auth.uid() or is_staff()))
);
create policy "osh staff write" on order_status_history for all
  using (is_staff()) with check (is_staff());

-- ── Blocked customers (admin A5) ───────────────────────────────────────
alter table profiles add column if not exists is_blocked boolean not null default false;
